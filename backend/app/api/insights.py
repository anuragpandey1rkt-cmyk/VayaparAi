"""AI Insights API: Spending analysis, trends, and risk metrics."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.dependencies import get_tenant_id

router = APIRouter()

@router.get("/spend-analysis")
async def get_spend_analysis(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated spend data for charts and AI-driven insights:
    - Top vendors by total spend
    - Monthly spend trends (last 6 months)
    - AI-driven cost-saving recommendations
    """
    tid = uuid.UUID(tenant_id)

    # 1. Top Vendors
    vendor_query = text("""
        SELECT name, total_spend, risk_score, is_flagged
        FROM vendors WHERE tenant_id = :tenant_id
        ORDER BY total_spend DESC LIMIT 5
    """)
    vendor_res = await db.execute(vendor_query, {"tenant_id": str(tid)})
    vendors = [
        {"name": r.name, "spend": float(r.total_spend or 0), "risk": float(r.risk_score or 0), "flagged": r.is_flagged}
        for r in vendor_res.fetchall()
    ]

    # 2. Monthly Spend Trends (Last 6 Months)
    trend_query = text("""
        SELECT 
            TO_CHAR(invoice_date, 'Mon YYYY') as month,
            SUM(total_amount) as amount,
            MIN(invoice_date) as sort_date
        FROM invoices 
        WHERE tenant_id = :tenant_id AND invoice_date IS NOT NULL
        GROUP BY month
        ORDER BY sort_date DESC
        LIMIT 6
    """)
    trend_res = await db.execute(trend_query, {"tenant_id": str(tid)})
    trends = [
        {"month": r.month, "amount": float(r.amount or 0)}
        for r in reversed(trend_res.fetchall())
    ]

    # 3. AI Insights / Recommendations (Dynamic using LLM)
    from app.services.insight_service import generate_proactive_insights
    recommendations = await generate_proactive_insights(str(tid), db)

    return {
        "top_vendors": vendors,
        "monthly_trends": trends,
        "recommendations": recommendations,
        "total_analyzed_spend": sum(v["spend"] for v in vendors)
    }
