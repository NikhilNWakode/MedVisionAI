from app.embeddings.manager import EmbeddingManager


def encode_text(text: str) -> list[float]:
    model = EmbeddingManager.get_instance().get_text_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def encode_texts(texts: list[str]) -> list[list[float]]:
    model = EmbeddingManager.get_instance().get_text_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return embeddings.tolist()
