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

    async def send_to_tenant(self, tenant_id: str, message: dict) -> None:
        """Broadcast a JSON message to all connections for a tenant."""
        connections = list(self._connections.get(tenant_id, []))
        dead_connections = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
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
