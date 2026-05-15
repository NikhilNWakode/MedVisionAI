import re

from rank_bm25 import BM25Okapi


class BM25Index:
    def __init__(self):
        self._index: BM25Okapi | None = None
        self._documents: list[dict] = []

    def build(self, documents: list[dict]):
        self._documents = documents
        if not documents:
            self._index = None
            return
        tokenized = [self._tokenize(doc["text"]) for doc in documents]
        self._index = BM25Okapi(tokenized)

    def search(self, query: str, top_k: int = 10) -> list[tuple[dict, float]]:
        if not self._index or not self._documents:
            return []

        tokenized_query = self._tokenize(query)
        scores = self._index.get_scores(tokenized_query)

        scored_docs = [(self._documents[i], float(scores[i])) for i in range(len(scores))]
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        return scored_docs[:top_k]

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"\w+", text.lower())


bm25_index = BM25Index()


async def rebuild_bm25_index():
    """Load all literature chunks from PostgreSQL and build the BM25 index."""
    from app.db.models import Literature
    from app.db.session import async_session
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(Literature))
        rows = result.scalars().all()

    if not rows:
        return

    documents = [
        {
            "id": str(row.id),
            "text": row.chunk_text,
            "source": row.source,
            "title": row.title,
            "chunk_text": row.chunk_text,
        }
        for row in rows
    ]
    bm25_index.build(documents)
    print(f"BM25 index built with {len(documents)} documents")
