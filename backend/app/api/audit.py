"""Audit Log API."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.dependencies import get_tenant_id, get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter()

@router.get("/")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit logs for the current tenant.
    """
    query = select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    
    if action:
        query = query.where(AuditLog.action == action)
        
    query = query.order_by(desc(AuditLog.created_at)).offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "items": [
            {
                "id": str(log.id),
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "description": log.description,
                "created_at": log.created_at.isoformat(),
                "user_name": log.user.full_name if log.user else "System",
            }
            for log in logs
        ],
        "page": page,
        "per_page": per_page,
    }
