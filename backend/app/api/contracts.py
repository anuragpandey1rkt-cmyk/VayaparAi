"""Contracts API."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_tenant_id
from app.models.contract import Contract

router = APIRouter()


@router.get("/")
async def list_contracts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    risk_level: str | None = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(tenant_id)
    query = select(Contract).where(Contract.tenant_id == tid)
    if risk_level:
        query = query.where(Contract.risk_level == risk_level)
    total = (await db.execute(select(func.count(Contract.id)).where(Contract.tenant_id == tid))).scalar()
    result = await db.execute(query.order_by(Contract.created_at.desc()).offset((page-1)*per_page).limit(per_page))
    contracts = result.scalars().all()
    return {"items": [_contract_dict(c) for c in contracts], "total": total, "page": page}


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contract).where(Contract.id == uuid.UUID(contract_id), Contract.tenant_id == uuid.UUID(tenant_id))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    data = _contract_dict(c)
    data["key_clauses"] = c.key_clauses
    data["missing_clauses"] = c.missing_clauses
    data["recommended_actions"] = c.recommended_actions
    return data


def _contract_dict(c: Contract) -> dict:
    return {
        "id": str(c.id),
        "contract_title": c.contract_title,
        "contract_type": c.contract_type,
        "parties": c.parties,
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "end_date": c.end_date.isoformat() if c.end_date else None,
        "contract_value": float(c.contract_value) if c.contract_value else None,
        "risk_score": c.risk_score,
        "risk_level": c.risk_level,
        "risk_summary": c.risk_summary,
        "jurisdiction": c.jurisdiction,
        "document_id": str(c.document_id),
        "created_at": c.created_at.isoformat(),
    }
