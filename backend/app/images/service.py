import os
import shutil
import uuid
from pathlib import Path

from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import AuditLog, EmbeddingStatus, MedicalImage
from app.images.dicom import dicom_to_thumbnail, extract_dicom_metadata, is_dicom_file


async def process_upload(
    file_content: bytes,
    filename: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> MedicalImage:
    image_id = uuid.uuid4()
    ext = Path(filename).suffix
    save_name = f"{image_id}{ext}"
    upload_path = os.path.join(settings.UPLOAD_DIR, save_name)
    thumbnail_path = os.path.join(settings.UPLOAD_DIR, f"{image_id}_thumb.png")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(upload_path, "wb") as f:
        f.write(file_content)

    dicom_metadata = None
    modality = None
    body_part = None

    if is_dicom_file(filename):
        try:
            dicom_metadata = extract_dicom_metadata(upload_path)
            modality = dicom_metadata.get("Modality")
            body_part = dicom_metadata.get("BodyPartExamined")
            dicom_to_thumbnail(upload_path, thumbnail_path)
        except Exception:
            thumbnail_path = None
    else:
        try:
            img = Image.open(upload_path)
            img.thumbnail((256, 256))
            img.convert("RGB").save(thumbnail_path, "PNG")
        except Exception:
            thumbnail_path = None

    record = MedicalImage(
        id=image_id,
        user_id=user_id,
        filename=filename,
        modality=modality,
        body_part=body_part,
        dicom_metadata=dicom_metadata,
        upload_path=upload_path,
        thumbnail_path=thumbnail_path,
        embedding_status=EmbeddingStatus.PENDING,
    )
    db.add(record)
    audit = AuditLog(
        user_id=user_id,
        action="UPLOAD_IMAGE",
        resource_type="image",
        resource_id=str(image_id),
        details={"filename": filename, "modality": modality},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(record)
    return record
