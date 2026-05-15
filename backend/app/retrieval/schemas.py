from pydantic import BaseModel


class RetrievalRequest(BaseModel):
    query_text: str | None = None
    image_id: str | None = None
    top_k: int = 10


class RetrievalResult(BaseModel):
    id: str
    content: str
    score: float
    source: str | None = None
    metadata: dict | None = None


class RetrievalResponse(BaseModel):
    results: list[RetrievalResult]
    query: str | None = None
