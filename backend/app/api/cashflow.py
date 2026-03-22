"""Cashflow API."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_tenant_id
from app.models.cashflow_prediction import CashflowPrediction
from app.services.cashflow_service import generate_cashflow_forecast

router = APIRouter()


@router.get("/forecast")
async def get_forecast(
    horizon_days: int = Query(30, ge=7, le=90),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate (or return cached) cashflow forecast."""
    # Generate fresh forecast
    forecast = await generate_cashflow_forecast(tenant_id, db, horizon_days=horizon_days)
    await db.commit()
    return forecast


@router.get("/history")
async def forecast_history(
    limit: int = Query(10, ge=1, le=50),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Return historical cashflow predictions."""
    result = await db.execute(
        select(CashflowPrediction)
        .where(CashflowPrediction.tenant_id == uuid.UUID(tenant_id))
        .order_by(CashflowPrediction.created_at.desc())
        .limit(limit)
    )
    preds = result.scalars().all()
    return {
        "predictions": [
            {
                "id": str(p.id),
                "prediction_date": p.prediction_date.isoformat(),
                "horizon_days": p.horizon_days,
                "predicted_balance": float(p.predicted_balance),
                "expected_receivables": float(p.expected_receivables),
                "expected_payables": float(p.expected_payables),
                "confidence_lower": float(p.confidence_lower) if p.confidence_lower else None,
                "confidence_upper": float(p.confidence_upper) if p.confidence_upper else None,
                "daily_forecast": p.daily_forecast,
                "created_at": p.created_at.isoformat(),
            }
            for p in preds
        ]
    }
