# VyaparAI Architecture (ET AI Hackathon 2026 Submission)

## High-Level Objective
VyaparAI serves as an autonomous **Cost Intelligence & Action Agent** for Indian MSMEs (Problem Statement #3 & #5). It ingests raw financial documents (Invoices, Contracts, Bank Statements) and converts them into structured intelligence to execute fraud detection, SLA enforcement, and cashflow prediction.

## System Components

1. **Frontend Experience layer (Next.js 14)**
   - **Role:** Web Interface providing a dashboard, document upload drag-and-drop, and real-time RAG Copilot chat.
   - **Tech:** Next.js (App Router), TailwindCSS, Framer Motion, Zustand (State), Recharts.

2. **API & Orchestration Layer (FastAPI)**
   - **Role:** Central gateway. Manages authentication, routes user interactions, and orchestrates Celery workers.
   - **Tech:** FastAPI, JWT, WebSocket for live streaming updates.

3. **Background Processing & Multi-Agent Pipelines (Celery + Redis)**
   - **Role:** High-throughput asynchronous task execution.
   - **Agents Implemented:**
     - *OCR & Extraction Agent:* Uses Tesseract / pdf2image to convert documents into raw text.
     - *Structuring Agent:* Uses GPT-4o to parse text into structured `Invoice` or `Contract` JSONs.
     - *Spend Intelligence Agent:* Checks 30% average deviation rules, duplicate invoice patterns, and GST mismatches.
     - *SLA/Cashflow Agent:* Forecasts 30-day cash flow based on unpaid invoices and 90-day bank averages.

4. **Intelligence Storage (PostgreSQL + pgvector)**
   - **Role:** Retaining semantic embeddings and relational business data.
   - Every document is embedded with OpenAI `text-embedding-3-small` and saved in a HNSW index for instantaneous RAG.

5. **BLOB Storage (MinIO / S3)**
   - **Role:** Safe retention of original MSME documents.

## Workflow Execution Flow
1. **User uploads 50 invoices.**
2. **FastAPI** signs them into MinIO and queues 50 tasks in **Redis**.
3. **Celery Workers** pull tasks. OCR converts to text. LLM structures to JSON.
4. **Spend Intelligence Agent** analyzes the JSONs. If "Vendor A" overcharged by 40% compared to last quarter, an Alert is generated.
5. In parallel, text is chunked and embedded into **pgvector**.
6. The user opens the **RAG Chat** on the frontend, asking: "Analyze my recent invoices. Are there any discrepancies?"
7. The system retrieves the exact chunks & the newly generated Alert, summarizing the exact action the user needs to take.
