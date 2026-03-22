"""Admin API – MRR, metrics, user management."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import get_current_admin

router = APIRouter()


@router.get("/metrics")
async def platform_metrics(
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return platform-wide SaaS metrics."""
    result = await db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM tenants) as total_tenants,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
                (SELECT COUNT(*) FROM documents) as total_documents,
                (SELECT COUNT(*) FROM documents WHERE status='completed') as processed_documents,
                (SELECT COUNT(*) FROM invoices) as total_invoices,
                (SELECT SUM(total_amount) FROM invoices) as total_invoice_value,
                (SELECT COUNT(*) FROM alerts WHERE is_resolved = false) as active_alerts,
                (SELECT COUNT(*) FROM chat_history) as total_chat_messages
        """)
    )
    metrics = result.first()

    # MRR by plan
    plan_result = await db.execute(
        text("""
            SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan
        """)
    )
    plans = plan_result.fetchall()

    # Approximate MRR (starter=₹999, pro=₹2999, enterprise=₹9999)
    plan_pricing = {"starter": 999, "pro": 2999, "enterprise": 9999}
    mrr = sum(plan_pricing.get(p.plan, 0) * p.count for p in plans)

    return {
        "platform": {
            "total_tenants": int(metrics.total_tenants or 0),
            "active_users": int(metrics.active_users or 0),
            "total_documents": int(metrics.total_documents or 0),
            "processed_documents": int(metrics.processed_documents or 0),
            "total_invoices": int(metrics.total_invoices or 0),
            "total_invoice_value": round(float(metrics.total_invoice_value or 0), 2),
            "active_alerts": int(metrics.active_alerts or 0),
            "total_chat_messages": int(metrics.total_chat_messages or 0),
        },
        "subscriptions": {
            "by_plan": {p.plan: p.count for p in plans},
        },
        "mrr_inr": mrr,
        "arr_inr": mrr * 12,
    }


@router.get("/tenants")
async def list_tenants(
    page: int = 1,
    per_page: int = 20,
    current_admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT t.id, t.name, t.slug, t.plan, t.created_at,
                   COUNT(DISTINCT u.id) as user_count,
                   COUNT(DISTINCT d.id) as document_count
            FROM tenants t
            LEFT JOIN users u ON u.tenant_id = t.id
            LEFT JOIN documents d ON d.tenant_id = t.id
            GROUP BY t.id, t.name, t.slug, t.plan, t.created_at
            ORDER BY t.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"limit": per_page, "offset": (page - 1) * per_page},
    )
    rows = result.fetchall()
    return {
        "tenants": [
            {
                "id": str(r.id),
                "name": r.name,
                "slug": r.slug,
                "plan": r.plan,
                "user_count": r.user_count,
                "document_count": r.document_count,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }
