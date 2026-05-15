from datetime import datetime

from pydantic import BaseModel


class ImageResponse(BaseModel):
    id: str
    filename: str
    modality: str | None = None
    body_part: str | None = None
    dicom_metadata: dict | None = None
    embedding_status: str
    thumbnail_path: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageListResponse(BaseModel):
    images: list[ImageResponse]
    total: int
