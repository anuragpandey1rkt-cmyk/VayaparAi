"""AI Chat (RAG) API."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id
from app.models.user import User
from app.models.chat_history import ChatHistory
from app.services.rag_service import chat_with_rag

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None


@router.post("/message")
async def send_message(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI business co-pilot (RAG)."""
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    session_id = body.session_id or str(uuid.uuid4())
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    try:
        result = await chat_with_rag(
            question=body.question,
            tenant_id=tenant_id,
            user_id=user_id,
            session_id=session_id,
            db=db,
        )
        await db.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.get("/history")
async def get_chat_history(
    session_id: str | None = None,
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for current user."""
    query = select(ChatHistory).where(
        ChatHistory.tenant_id == current_user.tenant_id,
        ChatHistory.user_id == current_user.id,
    )
    if session_id:
        query = query.where(ChatHistory.session_id == session_id)

    query = query.order_by(ChatHistory.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": [
            {
                "id": str(h.id),
                "session_id": h.session_id,
                "question": h.question,
                "answer": h.answer,
                "sources": h.sources,
                "model_used": h.model_used,
                "created_at": h.created_at.isoformat(),
            }
            for h in items
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/history/{chat_id}/rate")
async def rate_response(
    chat_id: str,
    rating: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rate an AI response (1-5)."""
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.id == uuid.UUID(chat_id),
            ChatHistory.user_id == current_user.id,
        )
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat message not found")

    chat.rating = rating
    await db.commit()
    return {"status": "rated"}
