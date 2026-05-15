import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MedicalImage, User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.embeddings.image_encoder import encode_image
from app.embeddings.text_encoder import encode_text
from app.retrieval.bm25 import bm25_index
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.reranker import rerank_with_groq
from app.retrieval.schemas import RetrievalRequest, RetrievalResponse, RetrievalResult
from app.retrieval.vector_search import search_image_embeddings, search_text_embeddings

router = APIRouter()


@router.post("", response_model=RetrievalResponse)
async def retrieve(
    body: RetrievalRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.query_text and not body.image_id:
        raise HTTPException(status_code=400, detail="Provide query_text or image_id")

    result_lists = []

    if body.query_text:
        text_vector = encode_text(body.query_text)
        vector_results = search_text_embeddings(text_vector, top_k=body.top_k * 2)
        result_lists.append(vector_results)

        bm25_results = bm25_index.search(body.query_text, top_k=body.top_k * 2)
        bm25_formatted = [
            {"id": doc.get("id", str(i)), "score": score, "payload": doc}
            for i, (doc, score) in enumerate(bm25_results)
        ]
        result_lists.append(bm25_formatted)

    if body.image_id:
        result = await db.execute(
            select(MedicalImage).where(
                MedicalImage.id == uuid.UUID(body.image_id),
                MedicalImage.user_id == user.id,
            )
        )
        image = result.scalar_one_or_none()
        if image and image.upload_path:
            image_vector = encode_image(image.upload_path)
            image_results = search_image_embeddings(image_vector, top_k=body.top_k)
            result_lists.append(image_results)

    if not result_lists:
        return RetrievalResponse(results=[], query=body.query_text)

    fused = reciprocal_rank_fusion(result_lists)

    if body.query_text:
        fused = rerank_with_groq(body.query_text, fused, top_k=body.top_k)

    results = [
        RetrievalResult(
            id=doc["id"],
            content=doc.get("payload", {}).get("chunk_text", ""),
            score=doc.get("rrf_score", doc.get("score", 0.0)),
            source=doc.get("payload", {}).get("source"),
            metadata=doc.get("payload"),
        )
        for doc in fused[: body.top_k]
    ]

    return RetrievalResponse(results=results, query=body.query_text)
