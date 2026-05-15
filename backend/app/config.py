from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://medvision:medvision@localhost:5432/medvision"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str = ""
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24
    NEXTAUTH_SECRET: str = ""
    UPLOAD_DIR: str = "./data/uploads"
    NIH_DATA_PATH: str = "./data/nih_sample"
    BIOMED_CLIP_MODEL: str = "microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224"
    BGE_MODEL: str = "BAAI/bge-base-en-v1.5"
    MAX_UPLOAD_SIZE_MB: int = 100

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
