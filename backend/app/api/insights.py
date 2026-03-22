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

    # 3. AI Insights / Recommendations (Mock logic for now, could be LLM-driven)
    # In a real app, we'd pass the aggregated data to an LLM here.
    recommendations = [
        {
            "id": "rec_1",
            "title": "Vendor Consolidation",
            "description": "You are using 3 different logistics vendors. Consolidating to one could save ~12% on annual spend.",
            "impact": "High",
            "category": "Optimization"
        },
        {
            "id": "rec_2",
            "title": "Unclaimed Input Tax Credit",
            "description": "Several invoices from 'Reliance Retail' have GST mismatches. Resolve them to claim ₹12,450 in ITC.",
            "impact": "Medium",
            "category": "Tax"
        },
        {
            "id": "rec_3",
            "title": "Early Payment Discounts",
            "description": "Vendor 'TATA Motors' offers a 2% discount for payments within 10 days. Total potential saving: ₹4,500/mo.",
            "impact": "Low",
            "category": "Cashflow"
        }
    ]

    return {
        "top_vendors": vendors,
        "monthly_trends": trends,
        "recommendations": recommendations,
        "total_analyzed_spend": sum(v["spend"] for v in vendors)
    }
