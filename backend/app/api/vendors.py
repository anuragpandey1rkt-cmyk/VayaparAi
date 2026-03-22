"""Vendors API."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.database import get_db
from app.dependencies import get_tenant_id
from app.models.vendor import Vendor

router = APIRouter()


@router.get("/")
async def list_vendors(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    is_flagged: bool | None = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(tenant_id)
    query = select(Vendor).where(Vendor.tenant_id == tid)
    if is_flagged is not None:
        query = query.where(Vendor.is_flagged == is_flagged)
    total = (await db.execute(select(func.count(Vendor.id)).where(Vendor.tenant_id == tid))).scalar()
    result = await db.execute(query.order_by(Vendor.total_spend.desc()).offset((page-1)*per_page).limit(per_page))
    vendors = result.scalars().all()
    return {"items": [_vendor_dict(v) for v in vendors], "total": total, "page": page}


@router.get("/heatmap")
async def vendor_risk_heatmap(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Return vendor data formatted for risk heatmap visualization."""
    result = await db.execute(
        select(Vendor)
        .where(Vendor.tenant_id == uuid.UUID(tenant_id))
        .order_by(Vendor.risk_score.desc())
        .limit(50)
    )
    vendors = result.scalars().all()
    return {
        "vendors": [
            {
                "name": v.name,
                "total_spend": float(v.total_spend or 0),
                "risk_score": float(v.risk_score or 0),
                "invoice_count": v.invoice_count,
                "is_flagged": v.is_flagged,
            }
            for v in vendors
        ]
    }


@router.get("/analytics")
async def vendor_analytics(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Top vendor spend breakdown and monthly trends."""
    result = await db.execute(
        text("""
            SELECT v.name, v.total_spend, v.invoice_count, v.risk_score,
                   v.avg_invoice_amount, v.is_flagged
            FROM vendors v WHERE v.tenant_id = :tenant_id
            ORDER BY total_spend DESC LIMIT 10
        """),
        {"tenant_id": tenant_id},
    )
    rows = result.fetchall()
    return {
        "top_vendors": [
            {
                "name": r.name,
                "total_spend": float(r.total_spend or 0),
                "invoice_count": r.invoice_count,
                "risk_score": float(r.risk_score or 0),
                "avg_invoice_amount": float(r.avg_invoice_amount or 0),
                "is_flagged": r.is_flagged,
            }
            for r in rows
        ]
    }


def _vendor_dict(v: Vendor) -> dict:
    return {
        "id": str(v.id),
        "name": v.name,
        "gstin": v.gstin,
        "category": v.category,
        "invoice_count": v.invoice_count,
        "total_spend": float(v.total_spend or 0),
        "avg_invoice_amount": float(v.avg_invoice_amount or 0),
        "risk_score": float(v.risk_score or 0),
        "is_flagged": v.is_flagged,
        "flag_reason": v.flag_reason,
        "created_at": v.created_at.isoformat(),
    }
