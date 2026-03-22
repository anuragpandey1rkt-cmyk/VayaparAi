"""Billing API: Stripe checkout, plan management, webhook handler."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.dependencies import get_current_user, get_tenant_id
from app.database import get_db
from app.services.stripe_service import (
    create_checkout_session,
    handle_webhook_event,
    get_usage_analytics,
    get_plan_features,
    check_document_limit,
)
from app.config import settings

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    plan: str  # starter | pro | enterprise
    success_url: str = f"{settings.FRONTEND_URL}/settings?upgrade=success"
    cancel_url: str = f"{settings.FRONTEND_URL}/settings?upgrade=cancelled"


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    tenant_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Create a Stripe Checkout session for plan upgrade."""
    if body.plan not in ("starter", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    checkout_url = await create_checkout_session(
        tenant_id=tenant_id,
        plan=body.plan,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )

    if not checkout_url:
        raise HTTPException(
            status_code=503,
            detail="Payment processing unavailable. Set STRIPE_SECRET_KEY in environment.",
        )

    return {"checkout_url": checkout_url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
):
    """Stripe webhook handler (register this URL in Stripe dashboard)."""
    payload = await request.body()
    result = await handle_webhook_event(payload, stripe_signature or "")
    return result


@router.get("/plan-features")
async def plan_features(current_user=Depends(get_current_user)):
    """Return feature matrix for current user's plan."""
    return {
        "plan": current_user.plan,
        "features": get_plan_features(current_user.plan),
    }


@router.get("/usage")
async def usage_analytics(
    tenant_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Usage analytics for billing dashboard."""
    usage = await get_usage_analytics(tenant_id, db)
    features = get_plan_features(current_user.plan)
    limit = features.get("documents_per_month", 100)
    docs_this_month = usage.get("docs_this_month", 0)
    _, remaining = check_document_limit(current_user.plan, docs_this_month)

    return {
        "plan": current_user.plan,
        "usage": usage,
        "limits": {
            "documents_per_month": limit,
            "docs_used_this_month": docs_this_month,
            "docs_remaining": remaining,
            "max_users": features.get("max_users", 2),
        },
    }
