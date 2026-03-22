"""NLP service: OpenAI GPT-4o for structured data extraction from OCR text."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)
_client: Optional[Groq] = None


def get_ai_client() -> Groq:
    global _client
    if _client is None:
        if settings.GROQ_API_KEY:
            _client = Groq(api_key=settings.GROQ_API_KEY)
        elif settings.OPENAI_API_KEY:
            # Fallback if user eventually adds OpenAI
            from openai import OpenAI
            _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def extract_invoice_data(ocr_text: str) -> Dict[str, Any]:
    """
    Use GPT-4o to extract structured invoice data from OCR text.
    Returns a dict with invoice fields.
    """
    client = get_ai_client()
    if not client:
        logger.error("No AI client available (Groq/OpenAI)")
        return {}

    model = settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OPENAI_MODEL

    system_prompt = """You are an expert Indian tax invoice parser. 
    Extract structured data from OCR text of invoices. 
    Return valid JSON only, no markdown, no extra text.
    All amounts should be numbers (not strings).
    Dates should be in YYYY-MM-DD format.
    GSTIN format is 15 alphanumeric characters."""

    user_prompt = f"""Extract all invoice fields from this OCR text and return JSON:

OCR TEXT:
{ocr_text[:4000]}

Return this exact JSON structure:
{{
  "invoice_number": "string or null",
  "vendor_name": "string or null",
  "vendor_gstin": "15-char GSTIN or null",
  "buyer_gstin": "15-char GSTIN or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "cgst_rate": number or null,
  "cgst_amount": number or null,
  "sgst_rate": number or null,
  "sgst_amount": number or null,
  "igst_rate": number or null,
  "igst_amount": number or null,
  "total_gst": number or null,
  "total_amount": number or null,
  "currency": "INR",
  "line_items": [
    {{"description": "string", "quantity": number, "unit_price": number, "amount": number}}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        logger.info(f"Invoice extraction successful: {result.get('invoice_number')}")
        return result
    except Exception as e:
        logger.error(f"Invoice extraction failed: {e}")
        return {}


def extract_contract_data(ocr_text: str) -> Dict[str, Any]:
    """Extract structured contract metadata from OCR text."""
    client = get_ai_client()
    if not client: return {}

    model = settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OPENAI_MODEL

    system_prompt = """You are an expert legal contract analyst specializing in Indian law.
    Extract structured data and perform risk analysis on contracts.
    Return valid JSON only."""

    user_prompt = f"""Analyze this contract text and return JSON:

CONTRACT TEXT:
{ocr_text[:6000]}

Return this JSON structure:
{{
  "contract_title": "string or null",
  "contract_type": "e.g. Service Agreement, NDA, MSA, etc.",
  "parties": [{{"name": "string", "role": "Client/Vendor/etc"}}],
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "contract_value": number or null,
  "currency": "INR",
  "jurisdiction": "string or null",
  "governing_law": "string or null",
  "risk_score": number between 0-100,
  "risk_level": "low|medium|high|critical",
  "risk_summary": "2-3 sentence summary of main risks",
  "key_clauses": [
    {{"title": "clause name", "content": "brief content", "risk": "low|medium|high"}}
  ],
  "missing_clauses": ["list of important missing clauses"],
  "recommended_actions": ["list of recommended actions"]
}}"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        logger.info(f"Contract extraction successful: risk_score={result.get('risk_score')}")
        return result
    except Exception as e:
        logger.error(f"Contract extraction failed: {e}")
        return {}


def extract_bank_statement_data(ocr_text: str) -> Dict[str, Any]:
    """Extract bank transactions from bank statement OCR text."""
    client = get_ai_client()
    if not client: return {}

    model = settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OPENAI_MODEL

    user_prompt = f"""Extract all bank transactions from this statement text and return JSON:

STATEMENT TEXT:
{ocr_text[:5000]}

Return:
{{
  "bank_name": "string or null",
  "account_number": "masked account number or null",
  "statement_period_start": "YYYY-MM-DD or null",
  "statement_period_end": "YYYY-MM-DD or null",
  "opening_balance": number or null,
  "closing_balance": number or null,
  "transactions": [
    {{
      "transaction_date": "YYYY-MM-DD",
      "description": "string",
      "reference_number": "string or null",
      "debit": number or null,
      "credit": number or null,
      "balance": number or null
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Bank statement extraction failed: {e}")
        return {}
