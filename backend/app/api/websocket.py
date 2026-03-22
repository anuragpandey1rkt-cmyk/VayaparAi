"""WebSocket endpoint."""
from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time document processing updates.
    Client connects with: ws://host/ws/?token=<jwt>
    """
    ws_manager = websocket.app.state.ws_manager

    # Validate JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        tenant_id = payload.get("tenant_id")
        user_id = payload.get("sub")
        if not tenant_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(websocket, tenant_id)
    logger.info(f"WS connected: tenant={tenant_id} user={user_id}")

    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "tenant_id": tenant_id,
            "message": "VyaparAI real-time connection established",
        })

        # Keep alive loop
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: tenant={tenant_id}")
    except Exception as e:
        logger.error(f"WS error: {e}")
    finally:
        await ws_manager.disconnect(websocket, tenant_id)
