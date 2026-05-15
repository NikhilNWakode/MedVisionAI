import asyncio
import json
import uuid

from groq import Groq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AuditLog, MedicalImage, Report
from app.embeddings.text_encoder import encode_text
from app.reports.prompts import SYSTEM_PROMPT, build_report_prompt
from app.retrieval.bm25 import bm25_index
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.reranker import rerank_with_groq
from app.retrieval.vector_search import search_text_embeddings


async def generate_report(
    image_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    clinical_notes: str | None = None,
) -> Report:
    result = await db.execute(
        select(MedicalImage).where(MedicalImage.id == image_id, MedicalImage.user_id == user_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise ValueError("Image not found")

    image_metadata = {
        "filename": image.filename,
        "modality": image.modality or "Unknown",
        "body_part": image.body_part or "Unknown",
    }
    if image.dicom_metadata:
        image_metadata.update(image.dicom_metadata)

    # Run blocking retrieval + embedding in a thread to avoid blocking the event loop
    retrieved_context = await asyncio.to_thread(_retrieve_context, image_metadata, clinical_notes)

    prompt = build_report_prompt(image_metadata, retrieved_context, clinical_notes)

    # Run blocking Groq API call in a thread
    def _call_groq():
        client = Groq(api_key=settings.GROQ_API_KEY)
        return client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

    response = await asyncio.to_thread(_call_groq)

    content = response.choices[0].message.content
    parsed = json.loads(content)

    citations = [
        {"source": ctx.get("source"), "content": ctx.get("content", "")[:200]}
        for ctx in retrieved_context[:5]
    ]

    report = Report(
        image_id=image_id,
        user_id=user_id,
        findings=parsed.get("findings"),
        impression=parsed.get("impression"),
        recommendations=parsed.get("recommendations"),
        confidence=parsed.get("confidence"),
        citations=citations,
        model_used="llama-3.3-70b-versatile",
    )
    db.add(report)
    audit = AuditLog(
        user_id=user_id,
        action="GENERATE_REPORT",
        resource_type="report",
        resource_id=str(report.id),
        details={"image_id": str(image_id), "model": "llama-3.3-70b-versatile"},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(report)
    return report


def _retrieve_context(image_metadata: dict, clinical_notes: str | None) -> list[dict]:
    query_parts = []
    modality = image_metadata.get("modality")
    body_part = image_metadata.get("body_part")

    # Only include modality/body_part if they have real values (not "Unknown")
    if modality and modality != "Unknown":
        query_parts.append(modality)
    if body_part and body_part != "Unknown":
        query_parts.append(body_part)
    if image_metadata.get("StudyDescription"):
        query_parts.append(image_metadata["StudyDescription"])
    if clinical_notes:
        query_parts.append(clinical_notes)

    if not query_parts:
        return []

    query = " ".join(query_parts)

    try:
        text_vector = encode_text(query)
        vector_results = search_text_embeddings(text_vector, top_k=10)
        bm25_results = bm25_index.search(query, top_k=10)
        bm25_formatted = [
            {"id": doc.get("id", str(i)), "score": score, "payload": doc}
            for i, (doc, score) in enumerate(bm25_results)
        ]

        fused = reciprocal_rank_fusion([vector_results, bm25_formatted])
        reranked = rerank_with_groq(query, fused, top_k=5)

        return [
            {
                "source": r.get("payload", {}).get("source", "Unknown"),
                "content": r.get("payload", {}).get("chunk_text", ""),
            }
            for r in reranked
        ]
    except Exception:
        return []
