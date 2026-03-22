"""S3 / MinIO object storage service."""
from __future__ import annotations

import io
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import Optional, Tuple

import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    kwargs = dict(
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


def upload_file(
    file_bytes: bytes,
    original_filename: str,
    tenant_id: str,
    folder: str = "documents",
) -> Tuple[str, str]:
    """
    Upload file to S3/MinIO.
    Returns (s3_key, presigned_url).
    """
    client = _get_s3_client()
    ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    s3_key = f"{tenant_id}/{folder}/{unique_name}"
    
    content_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

    try:
        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
        )
        logger.info(f"Uploaded {s3_key} to S3 ({len(file_bytes)} bytes)")
        url = generate_presigned_url(s3_key)
        return s3_key, url
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise


def download_file(s3_key: str) -> bytes:
    """Download file from S3 and return bytes."""
    client = _get_s3_client()
    try:
        response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return response["Body"].read()
    except ClientError as e:
        logger.error(f"S3 download failed for {s3_key}: {e}")
        raise


def generate_presigned_url(s3_key: str, expiry: int = 3600) -> str:
    """Generate a presigned URL valid for `expiry` seconds."""
    client = _get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiry,
        )
        return url
    except ClientError as e:
        logger.error(f"Presigned URL generation failed: {e}")
        return ""


def delete_file(s3_key: str) -> bool:
    """Delete a file from S3."""
    client = _get_s3_client()
    try:
        client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError as e:
        logger.error(f"S3 delete failed: {e}")
        return False


def ensure_bucket_exists() -> None:
    """Create the bucket if it doesn't exist (for local MinIO setup)."""
    client = _get_s3_client()
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
    except ClientError:
        client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        logger.info(f"Created bucket: {settings.S3_BUCKET_NAME}")
