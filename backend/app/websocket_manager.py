"""WebSocket Connection Manager for real-time updates."""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections per tenant.
    Allows broadcasting messages to all connected clients of a tenant.
    """

    def __init__(self):
        # tenant_id -> list of WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._redis_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, tenant_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[tenant_id].append(websocket)
        logger.info(f"WebSocket connected for tenant {tenant_id}. Total: {len(self._connections[tenant_id])}")

    async def disconnect(self, websocket: WebSocket, tenant_id: str) -> None:
        async with self._lock:
            connections = self._connections.get(tenant_id, [])
            if websocket in connections:
                connections.remove(websocket)
        logger.info(f"WebSocket disconnected for tenant {tenant_id}.")

    async def start_redis_listener(self) -> None:
        """Start a background task to listen for Redis notifications."""
        if self._redis_task:
            return

        self._redis_task = asyncio.create_task(self._redis_listener_loop())
        logger.info("📡 Redis WebSocket listener started")

    async def stop_redis_listener(self) -> None:
        """Stop the Redis listener task."""
        if self._redis_task:
            self._redis_task.cancel()
            try:
                await self._redis_task
            except asyncio.CancelledError:
                pass
            self._redis_task = None
            logger.info("📡 Redis WebSocket listener stopped")

    async def _redis_listener_loop(self) -> None:
        """Background loop to subscribe to Redis and broadcast messages."""
        import redis.asyncio as redis
        import json
        import traceback
        from app.config import settings

        logger.info(f"📡 Connecting to Redis for WS at {settings.REDIS_URL}")
        try:
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe("vyaparai:notifications")
            logger.info("📡 Subscribed to 'vyaparai:notifications' channel")

            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        tenant_id = data.get("tenant_id")
                        logger.info(f"📩 Received Redis notification for tenant {tenant_id}: {data.get('type')}")
                        if tenant_id:
                            await self.send_to_tenant(tenant_id, data)
                        else:
                            await self.broadcast(data)
                    except Exception as e:
                        logger.error(f"❌ Error processing Redis message: {e}")
                        logger.error(traceback.format_exc())
        except asyncio.CancelledError:
            logger.info("📡 Redis listener loop cancelled")
            raise
        except Exception as e:
            logger.error(f"❌ Redis listener loop error: {e}")
            logger.error(traceback.format_exc())
            # Retry after delay
            await asyncio.sleep(5)
            self._redis_task = None
            await self.start_redis_listener()

    async def send_to_tenant(self, tenant_id: str, message: dict) -> None:
        """Broadcast a JSON message to all connections for a tenant."""
        connections = list(self._connections.get(tenant_id, []))
        dead_connections = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                # logger.warning(f"Failed to send to WebSocket: {e}")
                dead_connections.append(ws)
        # Cleanup dead connections
        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    try:
                        self._connections[tenant_id].remove(ws)
                    except ValueError:
                        pass

    async def broadcast(self, message: dict) -> None:
        """Broadcast to ALL connected clients across all tenants."""
        for tenant_id in list(self._connections.keys()):
            await self.send_to_tenant(tenant_id, message)
