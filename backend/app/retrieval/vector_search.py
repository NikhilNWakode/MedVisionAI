from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.db.qdrant import IMAGE_COLLECTION, TEXT_COLLECTION, qdrant_client


def search_text_embeddings(
    query_vector: list[float], top_k: int = 10, filters: dict | None = None
) -> list[dict]:
    search_params = {
        "collection_name": TEXT_COLLECTION,
        "query_vector": query_vector,
        "limit": top_k,
    }

    if filters:
        conditions = [
            FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()
        ]
        search_params["query_filter"] = Filter(must=conditions)

    results = qdrant_client.search(**search_params)
    return [
        {
            "id": str(hit.id),
            "score": hit.score,
            "payload": hit.payload,
        }
        for hit in results
    ]


def search_image_embeddings(
    query_vector: list[float], top_k: int = 10
) -> list[dict]:
    results = qdrant_client.search(
        collection_name=IMAGE_COLLECTION,
        query_vector=query_vector,
        limit=top_k,
    )
    return [
        {
            "id": str(hit.id),
            "score": hit.score,
            "payload": hit.payload,
        }
        for hit in results
    ]
