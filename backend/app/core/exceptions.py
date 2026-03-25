"""VyaparAI custom exceptions."""
from __future__ import annotations

from typing import Any, Dict, Optional


class VyaparAIException(Exception):
    """Base exception for all VyaparAI business logic errors."""
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        detail: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class DocumentProcessingError(VyaparAIException):
    """Raised when document processing fails."""
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, detail=detail)


class InsufficientCreditsError(VyaparAIException):
    """Raised when tenant has insufficient credits/plan limits."""
    def __init__(self, message: str = "Plan limit reached. Please upgrade."):
        super().__init__(message, status_code=403)


class TenantNotFoundError(VyaparAIException):
    """Raised when tenant context is missing or invalid."""
    def __init__(self, message: str = "Tenant not found or unauthorized."):
        super().__init__(message, status_code=404)
