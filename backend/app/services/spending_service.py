"""Spending Analytics Service."""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.invoice import Invoice

async def get_spending_summary(
    tenant_id: str,
    db: AsyncSession,
    days: int = 30,
) -> Dict[str, Any]:
    """
    Aggregate spending by category and vendor.
    """
    tid = uuid.UUID(tenant_id)
    start_date = date.today() - timedelta(days=days)

    # 1. Spending by Category
    cat_q = select(
        Invoice.category,
        func.sum(Invoice.total_amount).label("total"),
        func.count(Invoice.id).label("count"),
    ).where(
        Invoice.tenant_id == tid,
        Invoice.invoice_date >= start_date,
    ).group_by(Invoice.category).order_by(desc("total"))
    
    cat_res = await db.execute(cat_q)
    categories = [
        {
            "category": row.category or "Uncategorized",
            "amount": float(row.total or 0),
            "count": row.count,
        }
        for row in cat_res.fetchall()
    ]

    # 2. Top Vendors
    vendor_q = select(
        Invoice.vendor_name,
        func.sum(Invoice.total_amount).label("total"),
        func.count(Invoice.id).label("count"),
    ).where(
        Invoice.tenant_id == tid,
        Invoice.invoice_date >= start_date,
    ).group_by(Invoice.vendor_name).order_by(desc("total")).limit(5)
    
    vendor_res = await db.execute(vendor_q)
    top_vendors = [
        {
            "vendor_name": row.vendor_name or "Unknown",
            "amount": float(row.total or 0),
            "count": row.count,
        }
        for row in vendor_res.fetchall()
    ]

    # 3. Monthly Trend (last 6 months)
    trend_start = date.today().replace(day=1) - timedelta(days=180)
    trend_q = select(
        func.date_trunc('month', Invoice.invoice_date).label("month"),
        func.sum(Invoice.total_amount).label("total"),
    ).where(
        Invoice.tenant_id == tid,
        Invoice.invoice_date >= trend_start,
    ).group_by("month").order_by("month")
    
    trend_res = await db.execute(trend_q)
    monthly_trend = [
        {
            "month": row.month.strftime("%Y-%m"),
            "amount": float(row.total or 0),
        }
        for row in trend_res.fetchall()
    ]

    total_spend = sum(c["amount"] for c in categories)

    return {
        "period_days": days,
        "total_spend": total_spend,
        "categories": categories,
        "top_vendors": top_vendors,
        "monthly_trend": monthly_trend,
    }
