#!/bin/bash
set -e

# 1. Start Celery worker in the background
echo "🚀 Starting Celery Worker..."
celery -A app.workers.celery_app worker --loglevel=info &

# 2. Start Celery beat (optional, for scheduled tasks)
echo "⏰ Starting Celery Beat..."
celery -A app.workers.celery_app beat --loglevel=info &

# 3. Start FastAPI application
echo "🌐 Starting FastAPI API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
