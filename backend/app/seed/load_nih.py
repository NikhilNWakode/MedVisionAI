"""
Seed script to load sample literature into PostgreSQL and Qdrant.
Also provides a stub for NIH ChestX-ray8 sample loading.

Usage: python -m app.seed.load_nih
"""

import asyncio
import json
import uuid
from pathlib import Path

from qdrant_client.models import PointStruct

from app.db.models import Literature
from app.db.qdrant import TEXT_COLLECTION, qdrant_client
from app.db.session import async_session
from app.embeddings.text_encoder import encode_texts


async def seed_literature():
    data_path = Path(__file__).parent / "sample_literature.json"
    with open(data_path) as f:
        articles = json.load(f)

    # Check if literature is already seeded to prevent duplicates
    async with async_session() as db:
        from sqlalchemy import func, select as sa_select
        count = await db.scalar(sa_select(func.count()).select_from(Literature))
        if count and count > 0:
            print(f"Literature table already has {count} rows — skipping seed (delete rows first to re-seed)")
            return

    all_chunks = []
    all_records = []

    for article in articles:
        for chunk_text in article["chunks"]:
            record_id = uuid.uuid4()
            all_records.append(
                Literature(
                    id=record_id,
                    title=article["title"],
                    abstract=article.get("abstract"),
                    source=article.get("source"),
                    doi=article.get("doi"),
                    chunk_text=chunk_text,
                    extra_metadata={"article_title": article["title"]},
                )
            )
            all_chunks.append({"id": str(record_id), "text": chunk_text, "source": article.get("source"), "title": article["title"]})

    async with async_session() as db:
        db.add_all(all_records)
        await db.commit()
        print(f"Inserted {len(all_records)} literature chunks into PostgreSQL")

    texts = [c["text"] for c in all_chunks]
    embeddings = encode_texts(texts)

    points = [
        PointStruct(
            id=chunk["id"],
            vector=emb,
            payload={
                "literature_id": chunk["id"],
                "chunk_text": chunk["text"],
                "source": chunk["source"],
                "title": chunk["title"],
            },
        )
        for chunk, emb in zip(all_chunks, embeddings)
    ]

    qdrant_client.upsert(collection_name=TEXT_COLLECTION, points=points)
    print(f"Upserted {len(points)} text embeddings into Qdrant")


if __name__ == "__main__":
    asyncio.run(seed_literature())
