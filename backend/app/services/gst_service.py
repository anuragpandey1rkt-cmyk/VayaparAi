"""GST Analytics service."""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.invoice import Invoice

async def get_gst_summary(
    tenant_id: str,
    db: AsyncSession,
    days: int = 30,
) -> Dict[str, Any]:
    """
    Calculate GST Input Tax Credit (ITC) vs GST Liability.
    - Liability: GST on Sales (Invoices with NO vendor_id)
    - ITC: GST on Purchases (Invoices WITH vendor_id)
    """
    tid = uuid.UUID(tenant_id)
    start_date = date.today() - timedelta(days=days)

    # 1. GST Liability (Sales)
    sales_q = select(
        func.sum(Invoice.cgst_amount).label("cgst"),
        func.sum(Invoice.sgst_amount).label("sgst"),
        func.sum(Invoice.igst_amount).label("igst"),
        func.sum(Invoice.total_gst).label("total"),
    ).where(
        Invoice.tenant_id == tid,
        Invoice.vendor_id.is_(None),
        Invoice.invoice_date >= start_date,
    )
    sales_res = await db.execute(sales_q)
    sales_gst = sales_res.first()

    # 2. GST Input Tax Credit (Purchases)
    purchase_q = select(
        func.sum(Invoice.cgst_amount).label("cgst"),
        func.sum(Invoice.sgst_amount).label("sgst"),
        func.sum(Invoice.igst_amount).label("igst"),
        func.sum(Invoice.total_gst).label("total"),
    ).where(
        Invoice.tenant_id == tid,
        Invoice.vendor_id.isnot(None),
        Invoice.invoice_date >= start_date,
    )
    purchase_res = await db.execute(purchase_q)
    purchase_gst = purchase_res.first()

    liability_total = float(sales_gst.total or 0) if sales_gst else 0.0
    itc_total = float(purchase_gst.total or 0) if purchase_gst else 0.0
    net_payable = liability_total - itc_total

    return {
        "period_days": days,
        "liability": {
            "cgst": float(sales_gst.cgst or 0) if sales_gst else 0,
            "sgst": float(sales_gst.sgst or 0) if sales_gst else 0,
            "igst": float(sales_gst.igst or 0) if sales_gst else 0,
            "total": liability_total,
        },
        "itc": {
            "cgst": float(purchase_gst.cgst or 0) if purchase_gst else 0,
            "sgst": float(purchase_gst.sgst or 0) if purchase_gst else 0,
            "igst": float(purchase_gst.igst or 0) if purchase_gst else 0,
            "total": itc_total,
        },
        "net_gst_payable": net_payable,
        "status": "surplus" if net_payable < 0 else "payable",
    }
