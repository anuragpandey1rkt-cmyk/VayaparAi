"""Alerts API."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id
from app.models.alert import Alert
from app.models.user import User

router = APIRouter()


@router.get("/")
async def list_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    severity: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    alert_type: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """List alerts for the current tenant with filtering."""
    tid = uuid.UUID(tenant_id)
    query = select(Alert).where(Alert.tenant_id == tid)

    if severity:
        query = query.where(Alert.severity == severity)
    if is_resolved is not None:
        query = query.where(Alert.is_resolved == is_resolved)
    if alert_type:
        query = query.where(Alert.alert_type == alert_type)

    count_q = select(func.count(Alert.id)).where(Alert.tenant_id == tid)
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Alert.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "items": [_alert_dict(a) for a in alerts],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    note: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve an alert."""
    result = await db.execute(
        select(Alert).where(
            Alert.id == uuid.UUID(alert_id),
            Alert.tenant_id == current_user.tenant_id,
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = current_user.id
    alert.resolution_note = note
    await db.commit()

    return {"status": "resolved", "alert_id": alert_id}


@router.get("/stats")
async def alert_stats(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Return alert statistics."""
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT 
                alert_type,
                severity,
                COUNT(*) as count,
                SUM(CASE WHEN is_resolved THEN 1 ELSE 0 END) as resolved
            FROM alerts WHERE tenant_id = :tenant_id
            GROUP BY alert_type, severity
            ORDER BY count DESC
        """),
        {"tenant_id": tenant_id},
    )
    rows = result.fetchall()
    return {
        "breakdown": [
            {"type": r.alert_type, "severity": r.severity, "count": r.count, "resolved": r.resolved}
            for r in rows
        ]
    }


def _alert_dict(a: Alert) -> dict:
    return {
        "id": str(a.id),
        "type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "message": a.message,
        "is_resolved": a.is_resolved,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        "resolution_note": a.resolution_note,
        "related_document_id": str(a.related_document_id) if a.related_document_id else None,
        "related_invoice_id": str(a.related_invoice_id) if a.related_invoice_id else None,
        "related_vendor_id": str(a.related_vendor_id) if a.related_vendor_id else None,
        "created_at": a.created_at.isoformat(),
    }
