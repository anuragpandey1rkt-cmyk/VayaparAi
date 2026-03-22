"""Vendor model."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func, Numeric, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(15), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Analytics
    invoice_count: Mapped[int] = mapped_column(Integer, default=0)
    total_spend: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    avg_invoice_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    max_invoice_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    min_invoice_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)

    # Risk
    risk_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Payment terms
    payment_terms_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    average_payment_days: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Vendor id={self.id} name={self.name} risk={self.risk_score}>"
