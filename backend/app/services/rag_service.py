"""RAG service: Retrieval-Augmented Generation for business chat."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Dict, List

from groq import Groq
from openai import OpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.config import settings
from app.models.document_chunk import DocumentChunk
from app.models.chat_history import ChatHistory
from app.services.embedding_service import embed_text

logger = logging.getLogger(__name__)
TOP_K = 5  # Number of chunks to retrieve


async def chat_with_rag(
    question: str,
    tenant_id: str,
    user_id: str,
    session_id: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Embed the question
    2. Search pgvector for relevant chunks
    3. Inject DB insights (cashflow, alerts summary)
    4. Call GPT-4o with full context
    5. Store in chat_history
    Returns the answer and sources.
    """
    tid = uuid.UUID(tenant_id)
    uid = uuid.UUID(user_id)

    # ── Step 1: Embed the query ────────────────────────────────────────────
    query_embedding = embed_text(question)

    # ── Step 2: pgvector similarity search ────────────────────────────────
    chunks = await _retrieve_chunks(query_embedding, tid, db, top_k=TOP_K)

    # ── Step 3: Get structured DB context (metrics) ────────────────────────
    db_context = await _get_db_insights(tid, db)

    # ── Step 4: Build context for LLM ────────────────────────────────────
    document_context = "\n\n".join([
        f"[Source: Document Chunk {i+1}]\n{chunk['content']}"
        for i, chunk in enumerate(chunks)
    ])

    system_prompt = f"""You are VyaparAI, an expert Indian business finance advisor and co-pilot.
You help MSMEs (Micro, Small & Medium Enterprises) understand their business data, 
financial position, contracts, invoices, and provide actionable insights grounded in their data.

CORE INSTRUCTIONS:
1. Base your answers ONLY on the provided context (Business data and Relevant Documents).
2. If data is insufficient, say so clearly and suggest what information is missing.
3. Use Indian financial terms (GST, MSME, crore, lakh etc.).
4. Format your response using clean Markdown:
   - Use ## for main sections.
   - Use bold text for key figures/amounts.
   - Use tables for structured comparisons or lists of items.
   - Use bullet points for recommendations.
5. Provide a summary first, then dive into details if necessary.
6. Always end with 1-2 specific "Actionable Steps" for the business owner.

BUSINESS CONTEXT (Real data from database):
{db_context}

RELEVANT DOCUMENTS:
{document_context if document_context else "No relevant documents found for this query."}
"""

    # ── Step 5: Call LLM ───────────────────────────────────────────────────
    if settings.GROQ_API_KEY:
        client = Groq(api_key=settings.GROQ_API_KEY)
        model = settings.GROQ_MODEL
    else:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        model = settings.OPENAI_MODEL

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.3,
        max_tokens=1500,
    )

    answer = response.choices[0].message.content
    usage = response.usage

    # ── Step 6: Store chat history ─────────────────────────────────────────
    history = ChatHistory(
        tenant_id=tid,
        user_id=uid,
        session_id=session_id,
        question=question,
        answer=answer,
        sources=[{"chunk_id": str(c["id"]), "content_snippet": c["content"][:200]} for c in chunks],
        retrieved_chunks=len(chunks),
        prompt_tokens=usage.prompt_tokens if usage else None,
        completion_tokens=usage.completion_tokens if usage else None,
        model_used=model,
    )
    db.add(history)
    await db.flush()

    return {
        "answer": answer,
        "session_id": session_id,
        "sources": [
            {
                "chunk_id": str(c["id"]),
                "document_id": str(c["document_id"]),
                "content_snippet": c["content"][:300],
                "similarity_score": c.get("similarity", 0),
            }
            for c in chunks
        ],
        "tokens_used": (usage.total_tokens if usage else 0),
    }


async def _retrieve_chunks(
    embedding: List[float],
    tenant_id: uuid.UUID,
    db: AsyncSession,
    top_k: int = 5,
) -> List[Dict]:
    """Retrieve top-K similar chunks from pgvector."""
    try:
        query = text("""
            SELECT 
                dc.id,
                dc.document_id,
                dc.content,
                dc.chunk_index,
                1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_chunks dc
            WHERE dc.tenant_id = :tenant_id
              AND dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
        """)
        result = await db.execute(query, {
            "embedding": str(embedding),
            "tenant_id": str(tenant_id),
            "limit": top_k,
        })
        rows = result.fetchall()
        return [
            {
                "id": row.id,
                "document_id": row.document_id,
                "content": row.content,
                "chunk_index": row.chunk_index,
                "similarity": float(row.similarity),
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"pgvector search failed: {e}")
        return []


async def _get_db_insights(tenant_id: uuid.UUID, db: AsyncSession) -> str:
    """Build a structured text summary of the tenant's business state."""
    insights = []

    try:
        # Invoice stats
        inv_result = await db.execute(
            text("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status='unpaid' THEN 1 ELSE 0 END) as unpaid_count,
                    SUM(CASE WHEN status='unpaid' THEN total_amount ELSE 0 END) as unpaid_amount,
                    SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicate_count
                FROM invoices WHERE tenant_id = :tenant_id
            """),
            {"tenant_id": str(tenant_id)},
        )
        inv = inv_result.first()
        if inv and inv.total:
            insights.append(
                f"INVOICES: {inv.total} total, {inv.unpaid_count} unpaid (₹{(inv.unpaid_amount or 0):,.2f}), "
                f"{inv.duplicate_count} flagged as duplicate"
            )

        # Alerts stats
        alert_result = await db.execute(
            text("""
                SELECT severity, COUNT(*) as count 
                FROM alerts WHERE tenant_id = :tenant_id AND is_resolved = false
                GROUP BY severity
            """),
            {"tenant_id": str(tenant_id)},
        )
        alert_rows = alert_result.fetchall()
        if alert_rows:
            alert_str = ", ".join(f"{r.count} {r.severity}" for r in alert_rows)
            insights.append(f"ACTIVE ALERTS: {alert_str}")

        # Latest cashflow prediction
        cf_result = await db.execute(
            text("""
                SELECT predicted_balance, horizon_days, prediction_date
                FROM cashflow_predictions WHERE tenant_id = :tenant_id
                ORDER BY created_at DESC LIMIT 1
            """),
            {"tenant_id": str(tenant_id)},
        )
        cf = cf_result.first()
        if cf:
            insights.append(
                f"CASHFLOW FORECAST: Predicted balance of ₹{float(cf.predicted_balance):,.2f} "
                f"in {cf.horizon_days} days (as of {cf.prediction_date})"
            )

        # Top vendors by spend
        vendor_result = await db.execute(
            text("""
                SELECT name, total_spend, risk_score 
                FROM vendors WHERE tenant_id = :tenant_id
                ORDER BY total_spend DESC LIMIT 5
            """),
            {"tenant_id": str(tenant_id)},
        )
        vendor_rows = vendor_result.fetchall()
        if vendor_rows:
            vendor_str = ", ".join(f"{r.name} (₹{float(r.total_spend or 0):,.0f})" for r in vendor_rows)
            insights.append(f"TOP VENDORS: {vendor_str}")

    except Exception as e:
        logger.warning(f"Could not fetch DB insights: {e}")

    return "\n".join(insights) if insights else "No business data available yet."
