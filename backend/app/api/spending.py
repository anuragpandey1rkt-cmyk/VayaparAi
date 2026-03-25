"""Spending Analytics API."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_id
from app.services.spending_service import get_spending_summary

router = APIRouter()

@router.get("/summary")
async def spending_summary(
    days: int = Query(30, ge=7, le=365),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Return spending summary for the tenant."""
    return await get_spending_summary(tenant_id, db, days=days)
