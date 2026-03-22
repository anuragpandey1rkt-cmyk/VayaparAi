# VyaparAI Local Testing Guide

Follow these steps to verify the full multi-agent pipeline and premium UI locally.

## Prerequisite:
1.  **AI Provider Key**: Get a **Groq API Key** from [console.groq.com](https://console.groq.com/).
    *   (Optional) OpenAI API Key is also supported but Groq is the default for this version.
2.  **Environment Variables**: Create a `.env` file in the root (copy from `.env.example`).
    *   Add your `GROQ_API_KEY=gsk_...`
3.  **Docker Desktop**: Ensure Docker is running.

---

## 🚀 Step 1: Start the Services
Run this command in the project root:
```bash
docker-compose up -d
```
This starts PostgreSQL (with pgvector), Redis, MinIO (S3), Celery workers, the FastAPI backend, and the Next.js frontend.

## 🗄️ Step 2: Run Database Migrations
Initialize the database schema:
```bash
docker-compose exec backend alembic upgrade head
```

---

## 🖥️ Step 3: Access the Application
| Service | URL | Note |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Main User Interface |
| **API Docs** | [http://localhost:8000/api/docs](http://localhost:8000/api/docs) | Backend Swagger UI |
| **MinIO** | [http://localhost:9001](http://localhost:9001) | S3 Console (admin/minioadmin) |

---

## 🧪 Step 4: End-to-End Test (The "Winning" Flow)

### 1. Registration
1.  Go to `http://localhost:3000/auth/register`.
2.  Create a new account. This automatically creates your unique **Tenant ID**.

### 2. Test the Spend Intelligence Agent (Fraud Detection)
1.  Go to the **Upload** page.
2.  Upload a sample invoice PDF or Image.
3.  Wait ~10 seconds for the Celery worker to finish OCR and LLM extraction.
4.  **Trigger Fraud**: Upload the *exact same* document again.
5.  Go to the **Alerts** page: You will see a "Duplicate Invoice Detected" critical alert.

### 3. Test the Cashflow Agent
1.  Upload a bank statement (CSV or PDF).
2.  Go to the **Dashboard** or **Cashflow** page.
3.  Observe the 30-day forecast chart. If your simulated payables exceed receivables, a **Cashflow Warning** alert will appear.

### 4. Test the RAG Business Copilot (Chat)
1.  Open the **Chat** page (AI Co-Pilot).
2.  Ask: *"What is my current financial health?"*
3.  Ask: *"Are there any suspicious invoices from last week?"*
4.  The agent will retrieve your actual invoice data and alerts from the vector database to answer accurately.

---

## 🔧 Troubleshooting
*   **Logs**: Check worker logs with `docker-compose logs -f worker`.
*   **Database**: If you see "relation does not exist", ensure Step 2 (migrations) was successful.
*   **AI Errors**: If chat fails, verify your `OPENAI_API_KEY` in `.env`.
