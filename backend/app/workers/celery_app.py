"""Celery application configuration."""
from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "vyaparai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.document_processor",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.document_processor.*": {"queue": "documents"},
    },
    beat_schedule={
        "generate-daily-cashflow-forecast": {
            "task": "app.workers.document_processor.scheduled_cashflow_update",
            "schedule": 86400,  # every 24 hours
        },
    },
)
