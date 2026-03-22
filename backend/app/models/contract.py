"""Contract model."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, func, Numeric, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)

    # Contract metadata
    contract_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parties: Mapped[list | None] = mapped_column(JSONB, nullable=True)   # [{name, role}]
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contract_value: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    # AI Risk Analysis
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)   # 0-100
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)  # low/medium/high/critical
    risk_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_clauses: Mapped[list | None] = mapped_column(JSONB, nullable=True)   # [{title, content, risk}]
    missing_clauses: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    recommended_actions: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Contract type
    contract_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    governing_law: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="contracts")

    def __repr__(self) -> str:
        return f"<Contract id={self.id} risk_score={self.risk_score}>"
