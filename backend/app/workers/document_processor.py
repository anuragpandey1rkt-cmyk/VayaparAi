"""Document processing pipeline Celery tasks."""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from celery import shared_task
from sqlalchemy import select, update

from app.workers.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


def run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    try:
        return asyncio.run(coro)
    except Exception as e:
        logger.error(f"Async execution failed: {e}")
        raise


@celery_app.task(
    name="app.workers.document_processor.process_document",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def process_document(self, document_id: str, tenant_id: str) -> dict:
    """
    Full 12-step document processing pipeline:
    1. Mark status = processing
    2. Download from S3
    3. OCR extraction
    4. NLP structuring
    5. Save structured data (invoice/contract/bank)
    6. Vendor upsert
    7. Fraud detection
    8. Chunk document text
    9. Generate embeddings
    10. Store chunks in pgvector
    11. Cashflow forecast update
    12. Mark status = completed, notify via WebSocket
    """
    return run_async(_process_document_async(self, document_id, tenant_id))


async def _process_document_async(task, document_id: str, tenant_id: str) -> dict:
    from app.database import AsyncSessionLocal, engine
    from app.models.document import Document
    from app.models.invoice import Invoice
    from app.models.contract import Contract
    from app.models.vendor import Vendor
    from app.models.bank_transaction import BankTransaction
    from app.models.document_chunk import DocumentChunk
    from app.services import s3_service, ocr_service, nlp_service, embedding_service, fraud_service, cashflow_service
    import json

    # Force engine disposal to ensure all connections/futures are tied to the current loop
    await engine.dispose()

    doc_id = uuid.UUID(document_id)
    ten_id = uuid.UUID(tenant_id)

    async with AsyncSessionLocal() as db:
        try:
            # ── Step 1: Mark processing ────────────────────────────────────
            await db.execute(
                update(Document)
                .where(Document.id == doc_id)
                .values(status="processing", updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
            logger.info(f"[{document_id}] Step 1: Marked as processing")

            # ── Step 2: Download from S3 ───────────────────────────────────
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one()
            file_bytes = s3_service.download_file(doc.s3_key)
            logger.info(f"[{document_id}] Step 2: Downloaded {len(file_bytes)} bytes from S3")

            # ── Step 3: OCR Extraction ─────────────────────────────────────
            raw_text, ocr_confidence = ocr_service.extract_text(file_bytes, doc.mime_type or "application/pdf")
            logger.info(f"[{document_id}] Step 3: OCR complete, confidence={ocr_confidence:.2f}, chars={len(raw_text)}")

            # ── Step 4: NLP Structuring ────────────────────────────────────
            extracted_data = {}
            if doc.doc_type == "invoice":
                extracted_data = nlp_service.extract_invoice_data(raw_text)
            elif doc.doc_type == "contract":
                extracted_data = nlp_service.extract_contract_data(raw_text)
            elif doc.doc_type == "bank_statement":
                extracted_data = nlp_service.extract_bank_statement_data(raw_text)
            logger.info(f"[{document_id}] Step 4: NLP extraction complete")

            # Update document with raw text
            await db.execute(
                update(Document).where(Document.id == doc_id).values(
                    raw_text=raw_text,
                    extracted_data=extracted_data,
                    ocr_confidence=ocr_confidence,
                )
            )
            await db.commit()

            # ── Step 5: Save Structured Data ──────────────────────────────
            if doc.doc_type == "invoice" and extracted_data:
                await _save_invoice(db, doc, extracted_data, ten_id)
            elif doc.doc_type == "contract" and extracted_data:
                await _save_contract(db, doc, extracted_data, ten_id)
            elif doc.doc_type == "bank_statement" and extracted_data:
                await _save_bank_transactions(db, doc, extracted_data, ten_id)
            await db.commit()
            logger.info(f"[{document_id}] Step 5: Structured data saved")

            # ── Steps 6-7: Fraud checks (for invoices) ────────────────────
            if doc.doc_type == "invoice":
                result = await db.execute(
                    select(Invoice).where(Invoice.document_id == doc_id).limit(1)
                )
                invoice = result.scalar_one_or_none()
                if invoice:
                    fraud_results = await fraud_service.run_fraud_checks(invoice, db)
                    await db.execute(
                        update(Invoice).where(Invoice.id == invoice.id).values(
                            is_duplicate=fraud_results["is_duplicate"],
                            is_overcharge=fraud_results["is_overcharge"],
                            gst_mismatch=fraud_results["gst_mismatch"],
                            fraud_score=fraud_results["fraud_score"],
                        )
                    )
                    await db.commit()
                    logger.info(f"[{document_id}] Steps 6-7: Fraud checks complete, score={fraud_results['fraud_score']}")

            # ── Steps 8-10: Chunk → Embed → Store in pgvector ─────────────
            chunks = embedding_service.chunk_text(raw_text)
            if chunks:
                embeddings = embedding_service.embed_texts(chunks)
                chunk_records = [
                    DocumentChunk(
                        document_id=doc_id,
                        tenant_id=ten_id,
                        chunk_index=i,
                        content=chunk,
                        embedding=embeddings[i] if i < len(embeddings) else None,
                        token_count=len(chunk.split()),
                    )
                    for i, chunk in enumerate(chunks)
                ]
                db.add_all(chunk_records)
                await db.commit()
                logger.info(f"[{document_id}] Steps 8-10: {len(chunks)} chunks stored with embeddings")

            # ── Step 11: Update cashflow forecast ──────────────────────────
            if doc.doc_type in ("invoice", "bank_statement"):
                await cashflow_service.generate_cashflow_forecast(tenant_id, db, horizon_days=30)
                await db.commit()
                logger.info(f"[{document_id}] Step 11: Cashflow forecast updated")

            # ── Step 12: Mark completed + Notify ───────────────────────────
            await db.execute(
                update(Document).where(Document.id == doc_id).values(
                    status="completed",
                    processed_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()
            logger.info(f"[{document_id}] Step 12: Processing complete!")

            # WebSocket notifications from worker are disabled for now
            # as they require a Redis broadcast bridge to reach the FastAPI app.
            # asyncio.create_task(_notify_ws(tenant_id, document_id, "completed"))

            return {"status": "completed", "document_id": document_id}

        except Exception as e:
            logger.error(f"[{document_id}] Processing failed: {e}", exc_info=True)
            await db.execute(
                update(Document).where(Document.id == doc_id).values(
                    status="failed",
                    processing_error=str(e),
                )
            )
            await db.commit()
            # asyncio.create_task(_notify_ws(tenant_id, document_id, "failed", str(e)))
            raise task.retry(exc=e, countdown=30)


async def _save_invoice(db, doc, data: dict, tenant_id: uuid.UUID):
    """Persist extracted invoice data to DB."""
    from app.models.invoice import Invoice
    from app.models.vendor import Vendor
    from sqlalchemy import select

    # Upsert vendor
    vendor_id = None
    if data.get("vendor_name"):
        result = await db.execute(
            select(Vendor).where(
                Vendor.tenant_id == tenant_id,
                Vendor.name == data["vendor_name"],
            ).limit(1)
        )
        vendor = result.scalar_one_or_none()
        if not vendor:
            vendor = Vendor(
                tenant_id=tenant_id,
                name=data["vendor_name"],
                gstin=data.get("vendor_gstin"),
                invoice_count=1,
                total_spend=float(data.get("total_amount") or 0),
                avg_invoice_amount=float(data.get("total_amount") or 0),
            )
            db.add(vendor)
            await db.flush()
        else:
            # Update vendor stats
            count = vendor.invoice_count + 1
            total = float(vendor.total_spend or 0) + float(data.get("total_amount") or 0)
            vendor.invoice_count = count
            vendor.total_spend = total
            vendor.avg_invoice_amount = total / count
        vendor_id = vendor.id

    from datetime import date
    def parse_date(s):
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    gst_total = (
        float(data.get("cgst_amount") or 0)
        + float(data.get("sgst_amount") or 0)
        + float(data.get("igst_amount") or 0)
    )

    invoice = Invoice(
        tenant_id=tenant_id,
        document_id=doc.id,
        vendor_id=vendor_id,
        invoice_number=data.get("invoice_number"),
        vendor_name=data.get("vendor_name"),
        vendor_gstin=data.get("vendor_gstin"),
        buyer_gstin=data.get("buyer_gstin"),
        invoice_date=parse_date(data.get("invoice_date")),
        due_date=parse_date(data.get("due_date")),
        subtotal=data.get("subtotal"),
        cgst_amount=data.get("cgst_amount"),
        sgst_amount=data.get("sgst_amount"),
        igst_amount=data.get("igst_amount"),
        total_gst=data.get("total_gst") or gst_total,
        total_amount=data.get("total_amount"),
        currency=data.get("currency", "INR"),
        line_items=data.get("line_items"),
        raw_extracted=data,
    )
    db.add(invoice)


async def _save_contract(db, doc, data: dict, tenant_id: uuid.UUID):
    """Persist extracted contract data to DB."""
    from app.models.contract import Contract
    from datetime import date

    def parse_date(s):
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    contract = Contract(
        tenant_id=tenant_id,
        document_id=doc.id,
        contract_title=data.get("contract_title"),
        parties=data.get("parties"),
        start_date=parse_date(data.get("start_date")),
        end_date=parse_date(data.get("end_date")),
        contract_value=data.get("contract_value"),
        risk_score=data.get("risk_score"),
        risk_level=data.get("risk_level"),
        risk_summary=data.get("risk_summary"),
        key_clauses=data.get("key_clauses"),
        missing_clauses=data.get("missing_clauses"),
        recommended_actions=data.get("recommended_actions"),
        contract_type=data.get("contract_type"),
        jurisdiction=data.get("jurisdiction"),
        governing_law=data.get("governing_law"),
    )
    db.add(contract)

    # Alert if high risk
    if data.get("risk_score", 0) >= 70:
        from app.services.fraud_service import _create_alert
        await _create_alert(
            db,
            tenant_id=str(tenant_id),
            alert_type="high_contract_risk",
            severity="critical" if data.get("risk_score", 0) >= 85 else "warning",
            title=f"High Risk Contract: {data.get('contract_title', 'Untitled')}",
            message=data.get("risk_summary", "Contract has high risk score"),
            related_document_id=str(doc.id),
        )


async def _save_bank_transactions(db, doc, data: dict, tenant_id: uuid.UUID):
    """Persist bank transactions to DB."""
    from app.models.bank_transaction import BankTransaction
    from datetime import date

    def parse_date(s):
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    transactions = data.get("transactions", [])
    for txn in transactions:
        debit = float(txn.get("debit") or 0)
        credit = float(txn.get("credit") or 0)
        amount = credit if credit > 0 else debit
        txn_type = "credit" if credit > 0 else "debit"

        bt = BankTransaction(
            tenant_id=tenant_id,
            document_id=doc.id,
            transaction_date=parse_date(txn.get("transaction_date")) or date.today(),
            description=txn.get("description", ""),
            reference_number=txn.get("reference_number"),
            amount=amount,
            transaction_type=txn_type,
            balance=txn.get("balance"),
            bank_name=data.get("bank_name"),
            account_number=data.get("account_number"),
        )
        db.add(bt)


async def _notify_ws(tenant_id: str, document_id: str, status: str, error: str = None):
    """
    Placeholder for WebSocket notification.
    Workers cannot access app.state.ws_manager directly as they run in 
    separate processes. 
    """
    pass


@celery_app.task(name="app.workers.document_processor.scheduled_cashflow_update")
def scheduled_cashflow_update():
    """Periodic task: update cashflow forecasts for all tenants."""
    return run_async(_scheduled_cashflow_async())


async def _scheduled_cashflow_async():
    from app.database import AsyncSessionLocal, engine
    from app.models.tenant import Tenant
    from app.services.cashflow_service import generate_cashflow_forecast
    from sqlalchemy import select

    # Force engine disposal to ensure all connections/futures are tied to the current loop
    await engine.dispose()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant.id))
        tenant_ids = [str(row[0]) for row in result.fetchall()]
        
        for tenant_id in tenant_ids:
            try:
                await generate_cashflow_forecast(tenant_id, db, horizon_days=30)
                await generate_cashflow_forecast(tenant_id, db, horizon_days=60)
                await db.commit()
                logger.info(f"Cashflow forecast updated for tenant {tenant_id}")
            except Exception as e:
                logger.error(f"Failed to update forecast for tenant {tenant_id}: {e}")
                await db.rollback()

    return {"tenants_updated": len(tenant_ids)}
