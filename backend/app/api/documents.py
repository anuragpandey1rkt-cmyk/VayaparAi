"""Document upload and management API."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id
from app.models.document import Document
from app.models.user import User
from app.services import s3_service
from app.workers.document_processor import process_document

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf", "image/jpeg", "image/png", "image/tiff",
    "image/webp", "image/bmp",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form("other"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document and queue it for AI processing."""
    # Validate
    if file.content_type not in ALLOWED_TYPES and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    tenant_id = str(current_user.tenant_id)

    # Upload to S3
    try:
        s3_key, s3_url = s3_service.upload_file(file_bytes, file.filename, tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # Create DB record
    doc = Document(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        filename=file.filename,
        original_filename=file.filename,
        s3_key=s3_key,
        s3_url=s3_url,
        file_size=len(file_bytes),
        mime_type=file.content_type,
        doc_type=doc_type,
        status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Queue background processing
    process_document.delay(str(doc.id), tenant_id)

    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "doc_type": doc.doc_type,
        "status": doc.status,
        "created_at": doc.created_at.isoformat(),
        "message": "Document uploaded and queued for AI processing",
    }


@router.get("/")
async def list_documents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """List all documents for the current tenant."""
    tid = uuid.UUID(tenant_id)
    query = select(Document).where(Document.tenant_id == tid)

    if doc_type:
        query = query.where(Document.doc_type == doc_type)
    if status:
        query = query.where(Document.status == status)

    # Count
    count_result = await db.execute(
        select(func.count(Document.id)).where(Document.tenant_id == tid)
    )
    total = count_result.scalar()

    # Paginate
    query = query.order_by(Document.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    docs = result.scalars().all()

    return {
        "items": [_doc_dict(d) for d in docs],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document with extracted data."""
    result = await db.execute(
        select(Document).where(
            Document.id == uuid.UUID(doc_id),
            Document.tenant_id == uuid.UUID(tenant_id),
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    data = _doc_dict(doc)
    data["extracted_data"] = doc.extracted_data
    data["raw_text_preview"] = (doc.raw_text or "")[:500] if doc.raw_text else None

    # Get fresh presigned URL
    if doc.s3_key:
        data["download_url"] = s3_service.generate_presigned_url(doc.s3_key, expiry=300)

    return data


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its S3 file."""
    result = await db.execute(
        select(Document).where(
            Document.id == uuid.UUID(doc_id),
            Document.tenant_id == uuid.UUID(tenant_id),
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    s3_service.delete_file(doc.s3_key)
    await db.delete(doc)
    await db.commit()


def _doc_dict(d: Document) -> dict:
    return {
        "id": str(d.id),
        "filename": d.filename,
        "doc_type": d.doc_type,
        "status": d.status,
        "file_size": d.file_size,
        "ocr_confidence": float(d.ocr_confidence) if d.ocr_confidence else None,
        "created_at": d.created_at.isoformat(),
        "processed_at": d.processed_at.isoformat() if d.processed_at else None,
    }
