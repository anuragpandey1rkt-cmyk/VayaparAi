"""Service for generating AI-driven business insights."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Dict, List

from groq import Groq
from openai import OpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.config import settings

logger = logging.getLogger(__name__)

async def generate_proactive_insights(tenant_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Fetch tenant data and use LLM to generate actionable business insights.
    """
    tid = uuid.UUID(tenant_id)
    
    # 1. Gather context data
    context_data = await _gather_tenant_context(tid, db)
    
    # 2. Build prompt
    prompt = f"""Analyze the following business data for an MSME and provide 3-4 actionable financial/operational insights.
For each insight, provide:
- id: a unique string
- title: concise title
- description: clear, actionable explanation
- impact: "High", "Medium", or "Low"
- category: "Optimization", "Tax", "Cashflow", or "Risk"

BUSINESS DATA:
{json.dumps(context_data, indent=2)}

Return ONLY a JSON list of objects.
"""

    # 3. Call LLM
    try:
        if settings.GROQ_API_KEY:
            client = Groq(api_key=settings.GROQ_API_KEY)
            model = settings.GROQ_MODEL
        else:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            model = settings.OPENAI_MODEL

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are VyaparAI, a professional financial analyst for Indian MSMEs. You only output valid JSON lists."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"} if not settings.GROQ_API_KEY else None,
        )

        content = response.choices[0].message.content
        # Basic cleanup if not using json_object mode
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        
        insights = json.loads(content)
        # If it returned an object with a key, extract the list
        if isinstance(insights, dict):
            for key in ["insights", "recommendations", "data"]:
                if key in insights and isinstance(insights[key], list):
                    return insights[key]
            return []
        return insights if isinstance(insights, list) else []

    except Exception as e:
        logger.error(f"Failed to generate AI insights: {e}")
        return _get_fallback_insights()

async def _gather_tenant_context(tenant_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """Collate data for LLM analysis."""
    context = {}
    
    # Top Vendors
    v_res = await db.execute(text("SELECT name, total_spend, risk_score FROM vendors WHERE tenant_id = :tid ORDER BY total_spend DESC LIMIT 5"), {"tid": str(tenant_id)})
    context["top_vendors"] = [{"name": r.name, "spend": float(r.total_spend or 0), "risk": float(r.risk_score or 0)} for r in v_res.fetchall()]
    
    # Unpaid Invoices
    i_res = await db.execute(text("SELECT SUM(total_amount) as amt, COUNT(*) as count FROM invoices WHERE tenant_id = :tid AND status = 'unpaid'"), {"tid": str(tenant_id)})
    i_row = i_res.first()
    context["unpaid_invoices"] = {"total_amount": float(i_row.amt or 0), "count": int(i_row.count or 0)}
    
    # Recent Alerts
    a_res = await db.execute(text("SELECT alert_type, severity, title FROM alerts WHERE tenant_id = :tid AND is_resolved = false LIMIT 5"), {"tid": str(tenant_id)})
    context["active_alerts"] = [{"type": r.alert_type, "severity": r.severity, "title": r.title} for r in a_res.fetchall()]
    
    return context

def _get_fallback_insights() -> List[Dict[str, Any]]:
    """Static fallback if LLM fails."""
    return [
        {
            "id": "fall_1",
            "title": "Data Analysis Pending",
            "description": "We are still processing your invoices to generate specific insights. Check back soon!",
            "impact": "Low",
            "category": "Optimization"
        }
    ]
