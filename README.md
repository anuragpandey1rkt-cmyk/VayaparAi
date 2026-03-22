# VyaparAI – India's AI Business Co-Pilot

> **Production-ready, multi-tenant SaaS for Indian MSMEs** · FastAPI + Next.js 14 + pgvector + Celery + OCR + RAG

---

## Architecture

```
Browser → Nginx → Next.js (frontend)
                → FastAPI (backend)  →  PostgreSQL + pgvector
                                     →  Redis + Celery workers
                                     →  MinIO (S3-compatible)
                → WebSocket (/ws)
```

### AI Processing Pipeline (12 Steps)
1. Upload to MinIO (S3-compatible)
2. Celery worker picks up job
3. Tesseract OCR (PDF + image, Hindi + English)  
4. GPT-4o NLP structuring
5. Structured data saved (invoice/contract/bank)
6. Vendor upsert + stats update
7. Fraud detection (duplicate, overcharge, GST mismatch)
8. Document chunking (512-token chunks)
9. OpenAI `text-embedding-3-small` embeddings
10. pgvector HNSW index storage
11. Cashflow forecast update
12. Status → `completed`, WebSocket notify

---

## Quick Start (Local Dev)

### 1. Prerequisites
- Docker & Docker Compose
- OpenAI API Key (required for LLM + embeddings)

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env and set:
# OPENAI_API_KEY=sk-...
# SECRET_KEY=<random 32+ char string>
```

### 3. Start Everything
```bash
docker-compose up -d
```

### 4. Run Database Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### 5. Access
| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **MinIO** | http://localhost:9001 (admin/password) |
| **Celery** | http://localhost:5555 |

---

## Environment Variables

See [`.env.example`](.env.example) for full reference.

### Required
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | For GPT-4o LLM and embeddings |
| `SECRET_KEY` | JWT signing key (min 32 chars) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

### Optional
| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Error tracking |
| `STRIPE_SECRET_KEY` | Payment processing |
| `GOOGLE_VISION_API_KEY` | Better OCR for low-quality scans |

---

## Tech Stack

### Backend
| Layer | Tech |
|-------|------|
| API | FastAPI (async) |
| Database | PostgreSQL 16 + pgvector |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Cache/Queue | Redis |
| Workers | Celery + Celery Beat |
| Auth | JWT (HS256) + bcrypt |
| OCR | Tesseract (Hindi + English) |
| AI | OpenAI GPT-4o + text-embedding-3-small |
| Storage | MinIO (S3-compatible) |

### Frontend
| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS + Glassmorphism |
| Animations | Framer Motion |
| State | Zustand (persisted) |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| Real-time | WebSocket (auto-reconnect) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account + tenant |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/documents/upload` | Upload document |
| GET | `/api/v1/documents/` | List documents |
| GET | `/api/v1/dashboard/summary` | All dashboard metrics |
| GET | `/api/v1/invoices/` | List invoices |
| GET | `/api/v1/invoices/stats` | Invoice statistics |
| GET | `/api/v1/vendors/heatmap` | Risk heatmap |
| GET | `/api/v1/cashflow/forecast` | 30/60-day forecast |
| POST | `/api/v1/chat/message` | RAG business chat |
| GET | `/api/v1/alerts/` | List alerts |
| PATCH | `/api/v1/alerts/{id}/resolve` | Resolve alert |
| WS | `/ws/?token=<jwt>` | Real-time updates |

---

## Intelligence Modules

### Fraud Detection
- **Duplicate Invoice**: Same vendor + amount + date check
- **Overcharge**: Amount >30% above vendor's historical average
- **GST Mismatch**: Claimed GST ≠ calculated (subtotal × rate)
- Creates `alerts` entries automatically

### Cashflow Forecasting
- **Receivables**: Unpaid invoices due within horizon
- **Payables**: Average monthly spend × projection factor
- **Daily breakdown**: Day-by-day balance prediction
- **Confidence bands**: ±15% interval

### RAG Business Chat
1. Embed user query (OpenAI)
2. pgvector similarity search (top 5 chunks)
3. Inject structured context (invoices, alerts, cashflow)
4. GPT-4o completion with citations
5. Store in `chat_history`

### Contract Risk Analysis
- GPT-4o analyzes full contract text
- Returns: risk score (0–100), key clauses, missing clauses
- Auto-creates alert if score ≥ 70

---

## Production Deployment

### AWS ECS / Docker Swarm
1. Push images to ECR
2. Set environment variables in Secrets Manager / Parameter Store
3. Replace MinIO with AWS S3 (`AWS_S3_BUCKET_NAME`)
4. Run migrations: `alembic upgrade head`
5. Deploy via `docker-compose -f docker-compose.prod.yml up -d`

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Environment Checklist
- [ ] `APP_ENV=production`
- [ ] Strong `SECRET_KEY`
- [ ] RDS PostgreSQL with pgvector
- [ ] ElastiCache Redis
- [ ] Real AWS S3 bucket
- [ ] OpenAI API key
- [ ] Sentry DSN

---

## Pricing Tiers
| Plan | Price | Docs/month |
|------|-------|-----------|
| Starter | ₹999/mo | 100 |
| Pro | ₹2,999/mo | 500 |
| Enterprise | ₹9,999/mo | Unlimited |

---

## Security
- **Authentication**: JWT HS256 with 60-min expiry + refresh tokens
- **Passwords**: bcrypt with cost factor 12
- **Multi-tenancy**: Row-level `tenant_id` scoping on all queries
- **File uploads**: Validated MIME type + size (50MB max)
- **Rate limiting**: 60 req/min per IP (Nginx)
- **Audit logging**: All auth events logged

---

*Built with ❤️ for Indian MSMEs · VyaparAI 2026*
