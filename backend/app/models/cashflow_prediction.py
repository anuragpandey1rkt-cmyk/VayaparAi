"""CashflowPrediction model."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, func, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CashflowPrediction(Base):
    __tablename__ = "cashflow_predictions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    prediction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    horizon_days: Mapped[int] = mapped_column(nullable=False)  # 30 or 60

    # Prediction values
    opening_balance: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    expected_receivables: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    expected_payables: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    predicted_balance: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    confidence_lower: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    confidence_upper: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    # Daily breakdown: [{date, balance, receivables, payables}]
    daily_forecast: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<CashflowPrediction id={self.id} date={self.prediction_date} balance={self.predicted_balance}>"
