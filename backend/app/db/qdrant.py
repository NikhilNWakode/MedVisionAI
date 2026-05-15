from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.config import settings

qdrant_client = QdrantClient(url=settings.QDRANT_URL)

IMAGE_COLLECTION = "image_embeddings"
TEXT_COLLECTION = "text_embeddings"
IMAGE_VECTOR_DIM = 512
TEXT_VECTOR_DIM = 768


async def init_qdrant_collections():
    collections = [c.name for c in qdrant_client.get_collections().collections]

    if IMAGE_COLLECTION not in collections:
        qdrant_client.create_collection(
            collection_name=IMAGE_COLLECTION,
            vectors_config=VectorParams(size=IMAGE_VECTOR_DIM, distance=Distance.COSINE),
        )

    if TEXT_COLLECTION not in collections:
        qdrant_client.create_collection(
            collection_name=TEXT_COLLECTION,
            vectors_config=VectorParams(size=TEXT_VECTOR_DIM, distance=Distance.COSINE),
        )
