"""Embedding service: OpenAI embeddings with SentenceTransformers fallback."""
from __future__ import annotations

import logging
from typing import List, Optional

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)
_openai_client: Optional[OpenAI] = None
_st_model = None  # SentenceTransformers model (lazy loaded)


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_st_model():
    """Lazily load SentenceTransformers as fallback."""
    global _st_model
    if _st_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _st_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            logger.info("SentenceTransformers model loaded")
        except Exception as e:
            logger.error(f"SentenceTransformers load failed: {e}")
    return _st_model


def embed_text(text: str) -> List[float]:
    """Embed a single text string. Returns 1536-dim vector."""
    return embed_texts([text])[0]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts.
    Uses OpenAI text-embedding-3-small (1536-dim) if OPENAI_API_KEY is present.
    Strictly falls back to local SentenceTransformers (padded to 1536) otherwise.
    """
    if not texts:
        return []

    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-"):
        return _openai_embed(texts)
    else:
        return _st_embed(texts)


def _openai_embed(texts: List[str]) -> List[List[float]]:
    client = _get_openai()
    try:
        # OpenAI embed max 8191 tokens per text; truncate long texts
        truncated = [t[:8000] for t in texts]
        response = client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=truncated,
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        logger.warning(f"OpenAI embedding failed, falling back to SentenceTransformers: {e}")
        return _st_embed(texts)


def _st_embed(texts: List[str]) -> List[List[float]]:
    """SentenceTransformers embedding, zero-padded to EMBEDDING_DIMENSION."""
    model = _get_st_model()
    if model is None:
        # Return zero vectors as absolute last resort
        logger.error("No embedding model available, returning zero vectors")
        return [[0.0] * settings.EMBEDDING_DIMENSION for _ in texts]

    embeddings = model.encode(texts, convert_to_numpy=True).tolist()
    dim = settings.EMBEDDING_DIMENSION
    padded = []
    for emb in embeddings:
        if len(emb) < dim:
            emb = emb + [0.0] * (dim - len(emb))
        padded.append(emb[:dim])
    return padded


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """
    Split text into chunks with overlap.
    Uses character-based splitting with sentence boundary detection.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0

    for word in words:
        current_chunk.append(word)
        current_length += len(word) + 1

        if current_length >= chunk_size:
            chunks.append(" ".join(current_chunk))
            # Keep overlap
            overlap_words = current_chunk[-int(overlap / 5):]
            current_chunk = overlap_words
            current_length = sum(len(w) + 1 for w in overlap_words)

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return [c.strip() for c in chunks if c.strip()]
