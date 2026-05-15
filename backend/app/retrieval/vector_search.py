from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.db.qdrant import IMAGE_COLLECTION, TEXT_COLLECTION, qdrant_client


def search_text_embeddings(
    query_vector: list[float], top_k: int = 10, filters: dict | None = None
) -> list[dict]:
    query_filter = None
    if filters:
        conditions = [
            FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()
        ]
        query_filter = Filter(must=conditions)

    results = qdrant_client.query_points(
        collection_name=TEXT_COLLECTION,
        query=query_vector,
        limit=top_k,
        query_filter=query_filter,
    )
    return [
        {
            "id": str(hit.id),
            "score": hit.score,
            "payload": hit.payload,
        }
        for hit in results.points
    ]


def search_image_embeddings(
    query_vector: list[float], top_k: int = 10
) -> list[dict]:
    results = qdrant_client.query_points(
        collection_name=IMAGE_COLLECTION,
        query=query_vector,
        limit=top_k,
    )
    return [
        {
            "id": str(hit.id),
            "score": hit.score,
            "payload": hit.payload,
        }
        for hit in results.points
    ]
