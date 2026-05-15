import threading

from app.config import settings


class EmbeddingManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._image_model = None
        self._image_processor = None
        self._image_tokenizer = None
        self._text_model = None

    @classmethod
    def get_instance(cls) -> "EmbeddingManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_image_model(self):
        if self._image_model is None:
            from open_clip import create_model_and_transforms, get_tokenizer

            model, _, processor = create_model_and_transforms(
                "hf-hub:" + settings.BIOMED_CLIP_MODEL
            )
            tokenizer = get_tokenizer("hf-hub:" + settings.BIOMED_CLIP_MODEL)
            model.eval()
            self._image_model = model
            self._image_processor = processor
            self._image_tokenizer = tokenizer
        return self._image_model, self._image_processor, self._image_tokenizer

    def get_text_model(self):
        if self._text_model is None:
            from sentence_transformers import SentenceTransformer

            self._text_model = SentenceTransformer(settings.BGE_MODEL)
        return self._text_model
