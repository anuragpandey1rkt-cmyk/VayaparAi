"""Vendor Service."""
from __future__ import annotations

import uuid
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.vendor import Vendor
from app.models.invoice import Invoice

async def update_vendor_reliability(
    vendor_id: uuid.UUID,
    db: AsyncSession,
) -> float:
    """
    Calculate and update reliability score for a vendor.
    100 is perfect, 0 is worst.
    Factors:
    - Price consistency (Std Dev of invoice amounts)
    - Frequency of invoices
    - Payment term compliance (Stub for now)
    """
    # 1. Fetch vendor and invoices
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        return 0.0

    invoices_q = select(Invoice).where(Invoice.vendor_name == vendor.name, Invoice.tenant_id == vendor.tenant_id)
    res = await db.execute(invoices_q)
    invoices = res.scalars().all()

    if not invoices:
        return 100.0

    # 2. Price Consistency
    amounts = [float(inv.total_amount) for inv in invoices]
    avg_amount = sum(amounts) / len(amounts)
    
    if len(amounts) > 1:
        variance = sum((x - avg_amount) ** 2 for x in amounts) / len(amounts)
        std_dev = variance ** 0.5
        # Coefficient of variation (CV = std_dev / mean)
        # Higher CV means lower reliability (unstable pricing)
        cv = std_dev / avg_amount if avg_amount > 0 else 0
        price_score = max(0, 100 - (cv * 100))
    else:
        price_score = 100.0 # Not enough data to penalize

    # 3. Frequency Score
    # More invoices = more trust in the data
    freq_score = min(100, len(invoices) * 10)

    # 4. Final Score (Weighted)
    final_score = (price_score * 0.7) + (freq_score * 0.3)
    
    vendor.reliability_score = float(final_score)
    vendor.invoice_count = len(invoices)
    vendor.total_spend = sum(amounts)
    vendor.avg_invoice_amount = avg_amount
    
    await db.commit()
    return final_score

async def get_vendor_recommendations(
    tenant_id: str,
    db: AsyncSession,
) -> List[Dict[str, Any]]:
    """
    Identify highly reliable vs risky vendors.
    """
    tid = uuid.UUID(tenant_id)
    q = select(Vendor).where(Vendor.tenant_id == tid).order_by(Vendor.reliability_score.desc())
    res = await db.execute(q)
    vendors = res.scalars().all()
    
    recommendations = []
    for v in vendors:
        if v.reliability_score > 90 and v.invoice_count > 5:
            recommendations.append({
                "vendor_name": v.name,
                "type": "Trusted Partner",
                "reason": "Consistent pricing and high volume.",
                "action": "Consider long-term contract for better rates."
            })
        elif v.reliability_score < 40:
            recommendations.append({
                "vendor_name": v.name,
                "type": "High Volatility",
                "reason": "Irregular pricing patterns detected.",
                "action": "Review latest invoices for potential overcharging."
            })
            
    return recommendations
