"""VyaparAI – FastAPI Application Entry Point."""
from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import jwt, JWTError

from app.config import settings
from app.database import engine, Base
from app.core import exceptions
from app.api import auth, documents, invoices, contracts, vendors, cashflow, alerts, chat, dashboard, admin, websocket, billing, insights, audit, gst
from app.websocket_manager import WebSocketManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Sentry ──────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

# ─── WebSocket Manager (singleton) ────────────────────────────────────────────
ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("🚀 VyaparAI Backend starting up...")
    
    # Start Redis WebSocket listener
    await ws_manager.start_redis_listener()
    
    # Tables are created via Alembic; this is a safety net for development
    async with engine.begin() as conn:
        # Enable pgvector extension
        try:
            await conn.execute(__import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            logger.warning(f"Failed to create pgvector extension: {e}. Ensure you have superuser privileges if required.")
    logger.info("✅ Database connection established")
    yield
    logger.info("🛑 VyaparAI Backend shutting down...")
    await ws_manager.stop_redis_listener()
    await engine.dispose()


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VyaparAI API",
    description="India's First AI Business Co-Pilot for MSMEs",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Store managers on app state
app.state.ws_manager = ws_manager
app.state.limiter = limiter

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(exceptions.VyaparAIException)
async def vyapar_ai_exception_handler(request: Request, exc: exceptions.VyaparAIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "error_code": exc.__class__.__name__,
            "data": exc.detail
        },
    )


@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    process_time = time.time() - start
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.middleware("http")
async def add_tenant_context(request: Request, call_next):
    """Extract and validate tenant from JWT for every request."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            # sub is user_id, but the token should also carry tenant_id
            # If not, we might need to fetch it once and cache it
            request.state.tenant_id = payload.get("tenant_id")
            request.state.user_id = payload.get("sub")
        except JWTError:
            pass
            
    response = await call_next(request)
    return response


# ─── Routers ──────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router,       prefix=f"{PREFIX}/auth",       tags=["Authentication"])
app.include_router(documents.router,  prefix=f"{PREFIX}/documents",  tags=["Documents"])
app.include_router(invoices.router,   prefix=f"{PREFIX}/invoices",   tags=["Invoices"])
app.include_router(contracts.router,  prefix=f"{PREFIX}/contracts",  tags=["Contracts"])
app.include_router(vendors.router,    prefix=f"{PREFIX}/vendors",    tags=["Vendors"])
app.include_router(cashflow.router,   prefix=f"{PREFIX}/cashflow",   tags=["Cashflow"])
app.include_router(gst.router,        prefix=f"{PREFIX}/gst",        tags=["GST"])
app.include_router(alerts.router,     prefix=f"{PREFIX}/alerts",     tags=["Alerts"])
app.include_router(chat.router,       prefix=f"{PREFIX}/chat",       tags=["AI Chat"])
app.include_router(dashboard.router,  prefix=f"{PREFIX}/dashboard",  tags=["Dashboard"])
app.include_router(admin.router,      prefix=f"{PREFIX}/admin",      tags=["Admin"])
app.include_router(billing.router,    prefix=f"{PREFIX}/billing",    tags=["Billing"])
app.include_router(insights.router,   prefix=f"{PREFIX}/insights",   tags=["AI Insights"])
app.include_router(audit.router,      prefix=f"{PREFIX}/audit",      tags=["Audit Logs"])
app.include_router(websocket.router,  prefix="/ws",                  tags=["WebSocket"])


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get(f"{PREFIX}/health", tags=["Health"])
@app.get("/health", tags=["Health"], include_in_schema=False)
async def health_check():
    return {
        "status": "healthy",
        "service": "VyaparAI Backend",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "VyaparAI API – India's First AI Business Co-Pilot",
        "docs": "/api/docs",
        "health": "/health",
    }
