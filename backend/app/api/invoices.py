"""Invoices API."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.database import get_db
from app.dependencies import get_tenant_id
from app.models.invoice import Invoice

router = APIRouter()


@router.get("/")
async def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    vendor_name: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(tenant_id)
    query = select(Invoice).where(Invoice.tenant_id == tid)
    if status:
        query = query.where(Invoice.status == status)
    if vendor_name:
        query = query.where(Invoice.vendor_name.ilike(f"%{vendor_name}%"))
    if is_duplicate is not None:
        query = query.where(Invoice.is_duplicate == is_duplicate)

    total = (await db.execute(select(func.count(Invoice.id)).where(Invoice.tenant_id == tid))).scalar()
    result = await db.execute(query.order_by(Invoice.created_at.desc()).offset((page-1)*per_page).limit(per_page))
    invoices = result.scalars().all()

    return {
        "items": [_inv_dict(i) for i in invoices],
        "total": total, "page": page, "per_page": per_page,
    }


@router.get("/stats")
async def invoice_stats(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated invoice stats."""
    result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as total,
                SUM(total_amount) as total_amount,
                SUM(CASE WHEN status='unpaid' THEN total_amount ELSE 0 END) as unpaid_amount,
                SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicates,
                SUM(CASE WHEN gst_mismatch THEN 1 ELSE 0 END) as gst_mismatches,
                AVG(fraud_score) as avg_fraud_score,
                COUNT(DISTINCT vendor_name) as unique_vendors
            FROM invoices WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id},
    )
    row = result.first()
    return {
        "total": int(row.total or 0),
        "total_amount": round(float(row.total_amount or 0), 2),
        "unpaid_amount": round(float(row.unpaid_amount or 0), 2),
        "paid_amount": round(float(row.paid_amount or 0), 2),
        "duplicates": int(row.duplicates or 0),
        "gst_mismatches": int(row.gst_mismatches or 0),
        "avg_fraud_score": round(float(row.avg_fraud_score or 0), 2),
        "unique_vendors": int(row.unique_vendors or 0),
    }


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == uuid.UUID(invoice_id), Invoice.tenant_id == uuid.UUID(tenant_id))
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = _inv_dict(inv)
    data["line_items"] = inv.line_items
    data["raw_extracted"] = inv.raw_extracted
    return data


def _inv_dict(i: Invoice) -> dict:
    return {
        "id": str(i.id),
        "invoice_number": i.invoice_number,
        "vendor_name": i.vendor_name,
        "vendor_gstin": i.vendor_gstin,
        "invoice_date": i.invoice_date.isoformat() if i.invoice_date else None,
        "due_date": i.due_date.isoformat() if i.due_date else None,
        "total_amount": float(i.total_amount) if i.total_amount else None,
        "total_gst": float(i.total_gst) if i.total_gst else None,
        "status": i.status,
        "is_duplicate": i.is_duplicate,
        "is_overcharge": i.is_overcharge,
        "gst_mismatch": i.gst_mismatch,
        "fraud_score": float(i.fraud_score) if i.fraud_score else 0,
        "document_id": str(i.document_id),
        "created_at": i.created_at.isoformat(),
    }
