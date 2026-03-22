"""Feature gating middleware: enforce plan limits on API requests."""
from __future__ import annotations

import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.stripe_service import is_feature_allowed, check_document_limit

logger = logging.getLogger(__name__)

# Feature routes that require specific plan capabilities
FEATURE_ROUTE_MAP = {
    "/api/v1/cashflow": "cashflow_forecasting",
    "/api/v1/contracts": "contract_risk",
    "/api/v1/billing/checkout": "api_access",
}


class FeatureGatingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that blocks access to premium features based on the user's plan.
    Falls through (no-op) if user is not authenticated (auth middleware handles that).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Check if this route has plan restrictions
        required_feature = None
        for route_prefix, feature in FEATURE_ROUTE_MAP.items():
            if path.startswith(route_prefix):
                required_feature = feature
                break

        if required_feature:
            # Get user from request state (set by auth dependency)
            user = getattr(request.state, "user", None)
            if user and not is_feature_allowed(user.plan, required_feature):
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "feature_not_available",
                        "message": f"'{required_feature}' requires Pro or Enterprise plan.",
                        "upgrade_url": "/settings?tab=billing",
                        "current_plan": user.plan,
                    },
                )

        return await call_next(request)
