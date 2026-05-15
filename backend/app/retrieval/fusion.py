def reciprocal_rank_fusion(
    result_lists: list[list[dict]], k: int = 60
) -> list[dict]:
    scores: dict[str, float] = {}
    doc_map: dict[str, dict] = {}

    for result_list in result_lists:
        for rank, doc in enumerate(result_list):
            doc_id = doc["id"]
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

    fused = []
    for doc_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        entry = doc_map[doc_id].copy()
        entry["rrf_score"] = score
        fused.append(entry)

    return fused
