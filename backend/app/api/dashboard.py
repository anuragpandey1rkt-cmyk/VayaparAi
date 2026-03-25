"""Dashboard summary API."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.database import get_db
from app.dependencies import get_tenant_id, get_current_user
from app.services.gst_service import get_gst_summary
from app.services.spending_service import get_spending_summary

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all dashboard metrics in a single call:
    - Business Health Score
    - Risk Score
    - Document stats
    - Invoice stats
    - Active alerts
    - Recent alerts
    - Cashflow snapshot
    """
    tid = uuid.UUID(tenant_id)

    # ── Documents ──────────────────────────────────────────────────────────
    doc_result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status='processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
            FROM documents WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": str(tid)},
    )
    docs = doc_result.first()

    # ── Invoices ───────────────────────────────────────────────────────────
    inv_result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='unpaid' THEN 1 ELSE 0 END) as unpaid_count,
                SUM(CASE WHEN status='unpaid' THEN total_amount ELSE 0 END) as unpaid_amount,
                SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicates,
                SUM(CASE WHEN gst_mismatch THEN 1 ELSE 0 END) as gst_issues,
                AVG(fraud_score) as avg_fraud_score
            FROM invoices WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": str(tid)},
    )
    invs = inv_result.first()

    # ── Alerts ─────────────────────────────────────────────────────────────
    alert_result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as total_active,
                SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN severity='warning' THEN 1 ELSE 0 END) as warning
            FROM alerts WHERE tenant_id = :tenant_id AND is_resolved = false
        """),
        {"tenant_id": str(tid)},
    )
    alert_stats = alert_result.first()

    recent_alerts_result = await db.execute(
        text("""
            SELECT id, alert_type, severity, title, message, created_at
            FROM alerts WHERE tenant_id = :tenant_id
            ORDER BY created_at DESC LIMIT 5
        """),
        {"tenant_id": str(tid)},
    )
    recent_alerts = [
        {
            "id": str(row.id),
            "type": row.alert_type,
            "severity": row.severity,
            "title": row.title,
            "message": row.message,
            "created_at": row.created_at.isoformat(),
        }
        for row in recent_alerts_result.fetchall()
    ]

    # ── Cashflow ───────────────────────────────────────────────────────────
    cf_result = await db.execute(
        text("""
            SELECT predicted_balance, expected_receivables, expected_payables, horizon_days
            FROM cashflow_predictions WHERE tenant_id = :tenant_id
            ORDER BY created_at DESC LIMIT 1
        """),
        {"tenant_id": str(tid)},
    )
    cf = cf_result.first()

    # ── GST ───────────────────────────────────────────────────────────────
    gst = await get_gst_summary(str(tid), db, days=30)

    # ── Spending ──────────────────────────────────────────────────────────
    spending = await get_spending_summary(str(tid), db, days=30)

    # ── Latest Insight ────────────────────────────────────────────────────
    insight_result = await db.execute(
        text("""
            SELECT title, recommendation, impact_score
            FROM insights WHERE tenant_id = :tenant_id
            ORDER BY created_at DESC LIMIT 1
        """),
        {"tenant_id": str(tid)},
    )
    latest_insight = insight_result.first()

    # ── Compute Scores ─────────────────────────────────────────────────────
    avg_fraud = float(invs.avg_fraud_score or 0) if invs else 0
    critical_count = int(alert_stats.critical or 0) if alert_stats else 0
    risk_score = min(100, avg_fraud + critical_count * 10)
    health_score = max(0, 100 - risk_score)

    return {
        "health_score": round(health_score, 1),
        "risk_score": round(risk_score, 1),
        "documents": {
            "total": int(docs.total or 0),
            "completed": int(docs.completed or 0),
            "processing": int(docs.processing or 0),
            "failed": int(docs.failed or 0),
        } if docs else {},
        "invoices": {
            "total": int(invs.total or 0),
            "unpaid_count": int(invs.unpaid_count or 0),
            "unpaid_amount": round(float(invs.unpaid_amount or 0), 2),
            "paid_amount": round(float(invs.paid_amount or 0), 2),
            "duplicates": int(invs.duplicates or 0),
            "gst_issues": int(invs.gst_issues or 0),
        } if invs else {},
        "alerts": {
            "total_active": int(alert_stats.total_active or 0),
            "critical": int(alert_stats.critical or 0),
            "warning": int(alert_stats.warning or 0),
        } if alert_stats else {},
        "recent_alerts": recent_alerts,
        "cashflow": {
            "predicted_balance": round(float(cf.predicted_balance or 0), 2),
            "expected_receivables": round(float(cf.expected_receivables or 0), 2),
            "expected_payables": round(float(cf.expected_payables or 0), 2),
            "horizon_days": cf.horizon_days,
        } if cf else None,
        "gst": {
            "net_payable": gst["net_gst_payable"],
            "status": gst["status"],
        },
        "spending": {
            "total_spend": spending["total_spend"],
            "categories": spending["categories"],
        },
        "latest_insight": {
            "title": latest_insight.title,
            "recommendation": latest_insight.recommendation,
            "impact_score": latest_insight.impact_score,
        } if latest_insight else None,
    }
