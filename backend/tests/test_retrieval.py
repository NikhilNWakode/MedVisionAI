from app.retrieval.fusion import reciprocal_rank_fusion


def test_rrf_basic():
    list_a = [{"id": "1", "score": 0.9}, {"id": "2", "score": 0.7}, {"id": "3", "score": 0.5}]
    list_b = [{"id": "2", "score": 0.95}, {"id": "1", "score": 0.6}, {"id": "4", "score": 0.4}]

    fused = reciprocal_rank_fusion([list_a, list_b])
    ids = [d["id"] for d in fused]

    assert "1" in ids
    assert "2" in ids
    assert fused[0]["id"] in ("1", "2")


def test_rrf_empty():
    fused = reciprocal_rank_fusion([])
    assert fused == []


def test_rrf_single_list():
    docs = [{"id": "a", "score": 1.0}, {"id": "b", "score": 0.5}]
    fused = reciprocal_rank_fusion([docs])
    assert len(fused) == 2
    assert fused[0]["id"] == "a"
