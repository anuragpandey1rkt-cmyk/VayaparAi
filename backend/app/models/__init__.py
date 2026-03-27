"""Models package – import all models so Alembic can detect them."""
from app.models.user import User
from app.models.tenant import Tenant
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.invoice import Invoice
from app.models.contract import Contract
from app.models.vendor import Vendor
from app.models.alert import Alert
from app.models.bank_transaction import BankTransaction
from app.models.chat_history import ChatHistory
from app.models.audit_log import AuditLog
from app.models.cashflow_prediction import CashflowPrediction
from app.models.subscription import Subscription
from app.models.insight import Insight

__all__ = [
    "User",
    "Tenant",
    "Document",
    "DocumentChunk",
    "Invoice",
    "Contract",
    "Vendor",
    "Alert",
    "BankTransaction",
    "ChatHistory",
    "AuditLog",
    "CashflowPrediction",
    "Subscription",
    "Insight",
]
