import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import MedicalImage, User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.images.schemas import ImageListResponse, ImageResponse
from app.images.service import process_upload

router = APIRouter()


@router.post("/upload", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="File too large")

    record = await process_upload(content, file.filename, user.id, db)
    return ImageResponse(
        id=str(record.id),
        filename=record.filename,
        modality=record.modality,
        body_part=record.body_part,
        dicom_metadata=record.dicom_metadata,
        embedding_status=record.embedding_status.value,
        thumbnail_path=record.thumbnail_path,
        created_at=record.created_at,
    )


@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalImage).where(MedicalImage.id == image_id, MedicalImage.user_id == user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")

    return ImageResponse(
        id=str(record.id),
        filename=record.filename,
        modality=record.modality,
        body_part=record.body_part,
        dicom_metadata=record.dicom_metadata,
        embedding_status=record.embedding_status.value,
        thumbnail_path=record.thumbnail_path,
        created_at=record.created_at,
    )


@router.get("", response_model=ImageListResponse)
async def list_images(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalImage)
        .where(MedicalImage.user_id == user.id)
        .order_by(MedicalImage.created_at.desc())
    )
    records = result.scalars().all()
    items = [
        ImageResponse(
            id=str(r.id),
            filename=r.filename,
            modality=r.modality,
            body_part=r.body_part,
            dicom_metadata=r.dicom_metadata,
            embedding_status=r.embedding_status.value,
            thumbnail_path=r.thumbnail_path,
            created_at=r.created_at,
        )
        for r in records
    ]
    return ImageListResponse(images=items, total=len(items))
