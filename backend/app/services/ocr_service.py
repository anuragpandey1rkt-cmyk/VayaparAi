"""OCR service: Tesseract with PDF support."""
from __future__ import annotations

import logging
import tempfile
import os
from pathlib import Path
from typing import Tuple

import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text from a PDF file using OCR.
    Returns (extracted_text, confidence_score).
    """
    try:
        # Convert PDF pages to images
        images = convert_from_bytes(file_bytes, dpi=300, fmt="PNG")
        texts = []
        confidences = []

        for i, img in enumerate(images):
            page_text, confidence = _ocr_image(img)
            texts.append(f"--- Page {i + 1} ---\n{page_text}")
            confidences.append(confidence)
            logger.debug(f"Page {i + 1} OCR confidence: {confidence:.2f}")

        full_text = "\n\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        logger.info(f"PDF OCR complete: {len(images)} pages, avg confidence {avg_confidence:.2f}")
        return full_text, avg_confidence

    except Exception as e:
        logger.error(f"PDF OCR failed: {e}")
        raise


def extract_text_from_image(file_bytes: bytes) -> Tuple[str, float]:
    """Extract text from an image file."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        img = Image.open(tmp_path)
        text, confidence = _ocr_image(img)
        os.unlink(tmp_path)
        return text, confidence
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        raise


def _ocr_image(img: Image.Image) -> Tuple[str, float]:
    """Run Tesseract on a PIL image, return (text, confidence)."""
    try:
        # Convert to RGB if necessary
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Run Tesseract with Hindi + English support
        custom_config = r"--oem 3 --psm 6 -l eng+hin"
        data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)

        # Filter confident words
        words = []
        confs = []
        for i, word in enumerate(data["text"]):
            conf = int(data["conf"][i])
            if conf > 0 and word.strip():
                words.append(word)
                confs.append(conf)

        text = pytesseract.image_to_string(img, config=custom_config)
        avg_confidence = sum(confs) / len(confs) if confs else 0.0
        return text.strip(), avg_confidence / 100.0  # normalize to 0-1

    except Exception as e:
        logger.warning(f"Tesseract error, retrying basic: {e}")
        text = pytesseract.image_to_string(img)
        return text.strip(), 0.5


def extract_text(file_bytes: bytes, mime_type: str) -> Tuple[str, float]:
    """Route extraction based on MIME type."""
    if mime_type == "application/pdf" or mime_type == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif mime_type.startswith("image/"):
        return extract_text_from_image(file_bytes)
    else:
        # Try PDF first, fallback to image
        try:
            return extract_text_from_pdf(file_bytes)
        except Exception:
            return extract_text_from_image(file_bytes)
