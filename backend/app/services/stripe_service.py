"""Stripe payment integration and subscription management service."""
from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Stripe plan → price ID mapping (set these in .env)
PLAN_PRICE_IDS = {
    "starter": "price_starter_monthly",   # ₹999/month
    "pro": "price_pro_monthly",           # ₹2,999/month
    "enterprise": "price_enterprise_monthly",  # ₹9,999/month
}

PLAN_MRR = {
    "starter": 999,
    "pro": 2999,
    "enterprise": 9999,
}

PLAN_FEATURES = {
    "starter": {
        "documents_per_month": 100,
        "fraud_detection": True,
        "cashflow_forecasting": False,
        "contract_risk": False,
        "rag_chat": True,
        "api_access": False,
        "max_users": 2,
    },
    "pro": {
        "documents_per_month": 500,
        "fraud_detection": True,
        "cashflow_forecasting": True,
        "contract_risk": True,
        "rag_chat": True,
        "api_access": True,
        "max_users": 10,
    },
    "enterprise": {
        "documents_per_month": -1,  # Unlimited
        "fraud_detection": True,
        "cashflow_forecasting": True,
        "contract_risk": True,
        "rag_chat": True,
        "api_access": True,
        "max_users": -1,  # Unlimited
    },
}


def get_plan_features(plan: str) -> dict:
    """Return the feature set for a given plan."""
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["starter"])


def is_feature_allowed(plan: str, feature: str) -> bool:
    """Check if a feature is allowed on a given plan."""
    features = get_plan_features(plan)
    return bool(features.get(feature, False))


def check_document_limit(plan: str, current_month_count: int) -> tuple[bool, int]:
    """
    Returns (is_allowed, remaining_docs).
    -1 remaining = unlimited.
    """
    features = get_plan_features(plan)
    limit = features.get("documents_per_month", 100)
    if limit == -1:
        return True, -1
    remaining = max(0, limit - current_month_count)
    return remaining > 0, remaining


async def create_checkout_session(
    tenant_id: str,
    plan: str,
    success_url: str,
    cancel_url: str,
) -> Optional[str]:
    """
    Create a Stripe Checkout session for subscription.
    Returns checkout URL or None if Stripe not configured.
    """
    from app.config import settings
    if not settings.STRIPE_SECRET_KEY:
        logger.warning("STRIPE_SECRET_KEY not set – payment disabled")
        return None

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": PLAN_PRICE_IDS.get(plan, PLAN_PRICE_IDS["starter"]),
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "tenant_id": tenant_id,
                "plan": plan,
            },
            subscription_data={
                "metadata": {"tenant_id": tenant_id},
            },
        )
        return session.url
    except Exception as e:
        logger.error(f"Stripe checkout session creation failed: {e}")
        return None


async def handle_webhook_event(payload: bytes, sig_header: str) -> dict:
    """
    Handle Stripe webhook events:
    - checkout.session.completed → upgrade plan
    - customer.subscription.deleted → downgrade to starter
    """
    from app.config import settings
    if not settings.STRIPE_WEBHOOK_SECRET:
        return {"status": "webhook_secret_not_configured"}

    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            tenant_id = session["metadata"].get("tenant_id")
            plan = session["metadata"].get("plan", "starter")
            if tenant_id:
                await _upgrade_tenant_plan(tenant_id, plan)
                logger.info(f"Tenant {tenant_id} upgraded to {plan}")

        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            tenant_id = subscription.get("metadata", {}).get("tenant_id")
            if tenant_id:
                await _upgrade_tenant_plan(tenant_id, "starter")
                logger.info(f"Tenant {tenant_id} downgraded to starter")

        return {"status": "handled", "type": event["type"]}

    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error", "error": str(e)}


async def _upgrade_tenant_plan(tenant_id: str, plan: str):
    """Update tenant plan in database."""
    import uuid
    from app.database import AsyncSessionLocal
    from app.models.tenant import Tenant
    from sqlalchemy import update

    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Tenant).where(Tenant.id == uuid.UUID(tenant_id)).values(
                plan=plan,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()


async def get_usage_analytics(tenant_id: str, db) -> dict:
    """Return usage analytics for a tenant (for billing dashboard)."""
    import uuid
    from sqlalchemy import text
    from datetime import date

    result = await db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM documents WHERE tenant_id = :tid 
                 AND created_at >= date_trunc('month', now())) as docs_this_month,
                (SELECT COUNT(*) FROM documents WHERE tenant_id = :tid) as total_docs,
                (SELECT COUNT(*) FROM invoices WHERE tenant_id = :tid) as total_invoices,
                (SELECT COUNT(*) FROM chat_history WHERE tenant_id = :tid) as total_chats,
                (SELECT COUNT(*) FROM alerts WHERE tenant_id = :tid) as total_alerts
        """),
        {"tid": tenant_id},
    )
    row = result.first()
    return {
        "docs_this_month": int(row.docs_this_month or 0),
        "total_docs": int(row.total_docs or 0),
        "total_invoices": int(row.total_invoices or 0),
        "total_chats": int(row.total_chats or 0),
        "total_alerts": int(row.total_alerts or 0),
    }
