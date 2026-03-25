"""Cashflow forecasting service."""
from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.bank_transaction import BankTransaction
from app.models.invoice import Invoice
from app.models.cashflow_prediction import CashflowPrediction
from app.services.insight_service import generate_proactive_insights
import json

logger = logging.getLogger(__name__)


async def generate_cashflow_forecast(
    tenant_id: str,
    db: AsyncSession,
    horizon_days: int = 30,
) -> Dict[str, Any]:
    """
    Generate cashflow forecast for the next `horizon_days` days.
    Stores prediction in DB and returns it.
    """
    tid = uuid.UUID(tenant_id)
    today = date.today()

    # ── 1. Get current balance from latest bank transaction ────────────────
    result = await db.execute(
        select(BankTransaction.balance)
        .where(BankTransaction.tenant_id == tid, BankTransaction.balance.isnot(None))
        .order_by(BankTransaction.transaction_date.desc())
        .limit(1)
    )
    row = result.first()
    current_balance = float(row[0]) if row else 0.0

    # ── 2. Compute expected receivables (unpaid SALES invoices) ───────────
    # Heuristic: Invoice without vendor_id is likely a sales invoice
    receivables_result = await db.execute(
        select(func.sum(Invoice.total_amount)).where(
            Invoice.tenant_id == tid,
            Invoice.status == "unpaid",
            Invoice.vendor_id.is_(None),
            Invoice.due_date.isnot(None),
            Invoice.due_date <= today + timedelta(days=horizon_days),
            Invoice.due_date >= today,
        )
    )
    expected_receivables = float(receivables_result.scalar() or 0)

    # ── 3. Compute expected payables (unpaid PURCHASE invoices) ───────────
    # Heuristic: Invoice with vendor_id is a purchase invoice
    purchase_result = await db.execute(
        select(func.sum(Invoice.total_amount)).where(
            Invoice.tenant_id == tid,
            Invoice.status == "unpaid",
            Invoice.vendor_id.isnot(None),
            Invoice.due_date.isnot(None),
            Invoice.due_date <= today + timedelta(days=horizon_days),
            Invoice.due_date >= today,
        )
    )
    unpaid_purchase_total = float(purchase_result.scalar() or 0)

    # Historical bank-based payables (for recurring expenses like rent/salaries not in invoices)
    # We reduce this by 50% to avoid double counting if some expenses are in invoices
    bank_payables_result = await db.execute(
        select(func.sum(BankTransaction.amount)).where(
            BankTransaction.tenant_id == tid,
            BankTransaction.transaction_type == "debit",
            BankTransaction.transaction_date >= today - timedelta(days=90),
        )
    )
    total_payables_90d = float(bank_payables_result.scalar() or 0)
    monthly_avg_payables = total_payables_90d / 3 if total_payables_90d > 0 else 0
    expected_recurring_payables = (monthly_avg_payables * (horizon_days / 30)) * 0.5
    
    expected_payables = unpaid_purchase_total + expected_recurring_payables

    # ── 4. Predicted closing balance ───────────────────────────────────────
    predicted_balance = current_balance + expected_receivables - expected_payables

    # ── 5. Build daily breakdown ───────────────────────────────────────────
    daily_receivables_avg = expected_receivables / horizon_days
    daily_payables_avg = expected_payables / horizon_days
    daily_forecast = []
    running_balance = current_balance

    for day in range(horizon_days):
        forecast_date = today + timedelta(days=day + 1)
        running_balance += daily_receivables_avg - daily_payables_avg
        daily_forecast.append({
            "date": forecast_date.isoformat(),
            "receivables": round(daily_receivables_avg, 2),
            "payables": round(daily_payables_avg, 2),
            "balance": round(running_balance, 2),
        })

    # ── 6. Confidence interval (±15%) ─────────────────────────────────────
    confidence_lower = predicted_balance * 0.85
    confidence_upper = predicted_balance * 1.15

    # ── 7. Persist prediction ──────────────────────────────────────────────
    prediction = CashflowPrediction(
        tenant_id=tid,
        prediction_date=today,
        horizon_days=horizon_days,
        opening_balance=current_balance,
        expected_receivables=expected_receivables,
        expected_payables=expected_payables,
        predicted_balance=predicted_balance,
        confidence_lower=confidence_lower,
        confidence_upper=confidence_upper,
        confidence_score=0.75,
        daily_forecast=daily_forecast,
        model_version="v1.0",
    )
    db.add(prediction)
    await db.flush()

    # ── 8. Alert if cashflow critical ──────────────────────────────────────
    if predicted_balance < 0:
        from app.services.fraud_service import _create_alert
        await _create_alert(
            db,
            tenant_id=tenant_id,
            alert_type="cashflow_warning",
            severity="critical",
            title=f"Negative Cash Flow Predicted in {horizon_days} Days",
            message=f"Forecast shows negative balance of ₹{abs(predicted_balance):,.2f} in {horizon_days} days. "
                    f"Expected receivables: ₹{expected_receivables:,.2f}, Expected outflows: ₹{expected_payables:,.2f}",
        )

    # ── 9. AI Co-pilot Analysis (Narrative) ────────────────────────────────
    co_pilot_analysis = await _generate_ai_cashflow_analysis(
        current_balance, expected_receivables, expected_payables, horizon_days, daily_forecast
    )

    return {
        "prediction_date": today.isoformat(),
        "horizon_days": horizon_days,
        "current_balance": round(current_balance, 2),
        "expected_receivables": round(expected_receivables, 2),
        "expected_payables": round(expected_payables, 2),
        "predicted_balance": round(predicted_balance, 2),
        "confidence_lower": round(confidence_lower, 2),
        "confidence_upper": round(confidence_upper, 2),
        "confidence_score": 0.75,
        "daily_forecast": daily_forecast,
        "co_pilot_analysis": co_pilot_analysis,
    }


async def _generate_ai_cashflow_analysis(balance, receivables, payables, horizon, forecast):
    """Generate narrative analysis using LLM."""
    from app.config import settings
    from groq import Groq
    
    if not settings.GROQ_API_KEY:
        return "Connect your bank and upload invoices to get detailed AI cashflow analysis."

    client = Groq(api_key=settings.GROQ_API_KEY)
    
    prompt = f"""
    Analyze this 30-day cashflow forecast for an MSME owner:
    - Current Balance: ₹{balance:,.2f}
    - Expected Receivables (Next {horizon} days): ₹{receivables:,.2f}
    - Expected Payables (Next {horizon} days): ₹{payables:,.2f}
    - Predicted End Balance: ₹{balance+receivables-payables:,.2f}
    
    Data points: {json.dumps(forecast[:5])} ... (trimmed)

    Provide a concise, 2-3 sentence strategic analysis. 
    Point out key risks (e.g. cash crunch) or opportunities. 
    Format: Be direct and helpful like a CFO.
    """

    try:
        response = client.chat.completions.create(
            messages=[{{"role": "user", "content": prompt}}],
            model="llama-3.1-70b-versatile",
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AI Cashflow analysis failed: {e}")
        return "Focus on clearing ₹{payables:,.2f} in payables while ensuring ₹{receivables:,.2f} is collected on time."
