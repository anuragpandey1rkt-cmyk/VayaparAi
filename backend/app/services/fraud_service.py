"""Fraud detection engine."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.invoice import Invoice
from app.models.vendor import Vendor
from app.models.alert import Alert

logger = logging.getLogger(__name__)

OVERCHARGE_THRESHOLD = 0.30  # 30% deviation triggers alert
DUPLICATE_AMOUNT_TOLERANCE = 0.01  # ₹ tolerance for duplicate detection


async def run_fraud_checks(
    invoice: Invoice,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Run all fraud checks on an invoice. Returns fraud analysis results.
    Creates Alert records in DB for any detected issues.
    """
    results = {
        "is_duplicate": False,
        "is_overcharge": False,
        "gst_mismatch": False,
        "fraud_score": 0.0,
        "details": [],
    }

    fraud_score = 0.0

    # ── Check 1: Duplicate Invoice ─────────────────────────────────────────
    is_dup, dup_detail = await _check_duplicate(invoice, db)
    if is_dup:
        results["is_duplicate"] = True
        results["details"].append(dup_detail)
        fraud_score += 40.0
        await _create_alert(
            db,
            tenant_id=str(invoice.tenant_id),
            alert_type="duplicate_invoice",
            severity="critical",
            title=f"Duplicate Invoice Detected: #{invoice.invoice_number}",
            message=dup_detail,
            related_invoice_id=str(invoice.id),
        )

    # ── Check 2: Vendor Overcharge ─────────────────────────────────────────
    if invoice.vendor_id and invoice.total_amount:
        is_over, over_detail = await _check_overcharge(invoice, db)
        if is_over:
            results["is_overcharge"] = True
            results["details"].append(over_detail)
            fraud_score += 30.0
            await _create_alert(
                db,
                tenant_id=str(invoice.tenant_id),
                alert_type="overcharge",
                severity="warning",
                title=f"Potential Overcharge by {invoice.vendor_name}",
                message=over_detail,
                related_invoice_id=str(invoice.id),
                related_vendor_id=str(invoice.vendor_id) if invoice.vendor_id else None,
            )

    # ── Check 3: GST Mismatch ──────────────────────────────────────────────
    gst_ok, gst_detail = _check_gst_mismatch(invoice)
    if not gst_ok:
        results["gst_mismatch"] = True
        results["details"].append(gst_detail)
        fraud_score += 20.0
        await _create_alert(
            db,
            tenant_id=str(invoice.tenant_id),
            alert_type="gst_mismatch",
            severity="warning",
            title=f"GST Mismatch on Invoice #{invoice.invoice_number}",
            message=gst_detail,
            related_invoice_id=str(invoice.id),
        )

    # ── Check 4: Unusual Vendor Activity ───────────────────────────────────
    if invoice.vendor_id:
        is_unusual, unusual_detail = await _check_unusual_vendor(invoice, db)
        if is_unusual:
            fraud_score += 25.0
            results["details"].append(unusual_detail)
            await _create_alert(
                db,
                tenant_id=str(invoice.tenant_id),
                alert_type="unusual_vendor_activity",
                severity="warning",
                title="Unusual Vendor Activity",
                message=unusual_detail,
                related_invoice_id=str(invoice.id),
                related_vendor_id=str(invoice.vendor_id),
            )

    # ── Check 5: Non-Business Day Invoice ──────────────────────────────────
    is_weekend, weekend_detail = _check_business_day(invoice)
    if is_weekend:
        fraud_score += 10.0
        results["details"].append(weekend_detail)
        # We don't necessarily create a standalone alert for weekends unless it's combined with others
        # but we track it in the details.

    results["fraud_score"] = min(fraud_score, 100.0)
    return results


async def _check_duplicate(invoice: Invoice, db: AsyncSession):
    """Check for duplicate invoices (same vendor + number OR same vendor + amount + date)."""
    if not invoice.invoice_number and not invoice.total_amount:
        return False, ""

    # Same invoice number from same vendor
    if invoice.invoice_number and invoice.vendor_name:
        result = await db.execute(
            select(Invoice).where(
                Invoice.tenant_id == invoice.tenant_id,
                Invoice.invoice_number == invoice.invoice_number,
                Invoice.vendor_name == invoice.vendor_name,
                Invoice.id != invoice.id,
            ).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return True, f"Invoice #{invoice.invoice_number} from {invoice.vendor_name} already exists (ID: {existing.id})"

    # Same amount + date from same vendor (within ₹0.01)
    if invoice.total_amount and invoice.invoice_date and invoice.vendor_name:
        result = await db.execute(
            select(Invoice).where(
                Invoice.tenant_id == invoice.tenant_id,
                Invoice.vendor_name == invoice.vendor_name,
                Invoice.invoice_date == invoice.invoice_date,
                Invoice.total_amount.between(
                    float(invoice.total_amount) - DUPLICATE_AMOUNT_TOLERANCE,
                    float(invoice.total_amount) + DUPLICATE_AMOUNT_TOLERANCE,
                ),
                Invoice.id != invoice.id,
            ).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return True, f"Same amount ₹{invoice.total_amount} from {invoice.vendor_name} on {invoice.invoice_date} already exists"

    return False, ""


async def _check_overcharge(invoice: Invoice, db: AsyncSession):
    """Check if invoice amount deviates more than 30% from vendor historical average."""
    result = await db.execute(
        select(
            func.avg(Invoice.total_amount).label("avg_amount"),
            func.stddev(Invoice.total_amount).label("stddev_amount"),
            func.count(Invoice.id).label("count"),
        ).where(
            Invoice.tenant_id == invoice.tenant_id,
            Invoice.vendor_id == invoice.vendor_id,
            Invoice.id != invoice.id,
            Invoice.total_amount.isnot(None),
        )
    )
    stats = result.first()

    if not stats or not stats.avg_amount or stats.count < 3:
        return False, ""  # Not enough history

    avg = float(stats.avg_amount)
    current = float(invoice.total_amount)
    deviation = abs(current - avg) / avg if avg > 0 else 0

    if deviation > OVERCHARGE_THRESHOLD:
        pct = deviation * 100
        return True, (
            f"Invoice amount ₹{current:,.2f} deviates {pct:.1f}% from "
            f"vendor historical average ₹{avg:,.2f} (threshold: {OVERCHARGE_THRESHOLD*100:.0f}%)"
        )
    return False, ""


def _check_gst_mismatch(invoice: Invoice):
    """Verify GST amounts add up correctly."""
    if not invoice.total_amount or not invoice.subtotal:
        return True, ""  # Can't check without values

    subtotal = float(invoice.subtotal)
    cgst = float(invoice.cgst_amount or 0)
    sgst = float(invoice.sgst_amount or 0)
    igst = float(invoice.igst_amount or 0)
    total_gst = float(invoice.total_gst or (cgst + sgst + igst))
    total = float(invoice.total_amount)

    expected_total = subtotal + total_gst
    tolerance = 1.0  # ₹1 tolerance for rounding

    if abs(expected_total - total) > tolerance:
        return False, (
            f"GST mismatch: Subtotal ₹{subtotal:.2f} + GST ₹{total_gst:.2f} = "
            f"₹{expected_total:.2f} but invoice total is ₹{total:.2f}"
        )
    return True, ""


async def _check_unusual_vendor(invoice: Invoice, db: AsyncSession):
    """Check if a vendor has a sudden spike in invoice value or is 'new' with high value."""
    result = await db.execute(
        select(
            func.max(Invoice.total_amount).label("max_amount"),
            func.count(Invoice.id).label("count"),
        ).where(
            Invoice.tenant_id == invoice.tenant_id,
            Invoice.vendor_id == invoice.vendor_id,
            Invoice.id != invoice.id,
        )
    )
    stats = result.first()
    
    current = float(invoice.total_amount or 0)
    
    # 1. New vendor with high initial value (> ₹1,00,000)
    if (not stats or stats.count == 0) and current > 100000:
        return True, f"New vendor '{invoice.vendor_name}' submitted a high-value initial invoice: ₹{current:,.2f}"
    
    # 2. Sudden spike (> 2x previous max)
    if stats and stats.count > 2 and stats.max_amount:
        prev_max = float(stats.max_amount)
        if current > prev_max * 2:
            return True, f"Invoice amount ₹{current:,.2f} is more than 2x the historical maximum (₹{prev_max:,.2f}) for this vendor"
            
    return False, ""


def _check_business_day(invoice: Invoice):
    """Flag invoices dated on Sundays."""
    if not invoice.invoice_date:
        return False, ""
    
    # weekday() returns 0 for Monday, 6 for Sunday
    if invoice.invoice_date.weekday() == 6:
        return True, f"Invoice is dated on a Sunday ({invoice.invoice_date.strftime('%Y-%m-%d')}), which is unusual for this business type."
    
    return False, ""


async def _create_alert(
    db: AsyncSession,
    tenant_id: str,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    related_invoice_id: Optional[str] = None,
    related_vendor_id: Optional[str] = None,
    related_document_id: Optional[str] = None,
):
    """Create and persist an Alert record."""
    import uuid
    alert = Alert(
        tenant_id=uuid.UUID(tenant_id),
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        related_invoice_id=uuid.UUID(related_invoice_id) if related_invoice_id else None,
        related_vendor_id=uuid.UUID(related_vendor_id) if related_vendor_id else None,
        related_document_id=uuid.UUID(related_document_id) if related_document_id else None,
    )
    db.add(alert)
    await db.flush()
    return alert
