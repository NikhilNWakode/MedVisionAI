import numpy as np
import torch
from PIL import Image

from app.embeddings.manager import EmbeddingManager


def encode_image(image_path: str) -> list[float]:
    manager = EmbeddingManager.get_instance()
    model, processor, _ = manager.get_image_model()

    image = Image.open(image_path).convert("RGB")
    image_tensor = processor(image).unsqueeze(0)

    with torch.no_grad():
        image_features = model.encode_image(image_tensor)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    return image_features.squeeze().cpu().numpy().tolist()


def encode_image_from_pil(image: Image.Image) -> list[float]:
    manager = EmbeddingManager.get_instance()
    model, processor, _ = manager.get_image_model()

    image = image.convert("RGB")
    image_tensor = processor(image).unsqueeze(0)

    with torch.no_grad():
        image_features = model.encode_image(image_tensor)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    return image_features.squeeze().cpu().numpy().tolist()
