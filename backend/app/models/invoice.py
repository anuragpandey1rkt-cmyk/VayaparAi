"""Invoice model."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, func, Numeric, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    # Invoice fields
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    vendor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vendor_gstin: Mapped[str | None] = mapped_column(String(15), nullable=True)
    buyer_gstin: Mapped[str | None] = mapped_column(String(15), nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Amounts (in INR paise to avoid float errors)
    subtotal: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    cgst_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    sgst_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    igst_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    total_gst: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    total_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    # Status
    status: Mapped[str] = mapped_column(String(50), default="unpaid", index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Fraud flags
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    is_overcharge: Mapped[bool] = mapped_column(Boolean, default=False)
    gst_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)
    fraud_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)

    # Line items and raw data
    line_items: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    raw_extracted: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="invoices")

    def __repr__(self) -> str:
        return f"<Invoice id={self.id} number={self.invoice_number} total={self.total_amount}>"
