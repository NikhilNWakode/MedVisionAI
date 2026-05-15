import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cases.schemas import (
    CaseCreateRequest,
    CaseListResponse,
    CaseResponse,
    CaseUpdateRequest,
)
from app.db.models import (
    AuditLog,
    CasePriority,
    CaseStatus,
    MedicalImage,
    PatientCase,
    Report,
    User,
)
from app.db.session import get_db
from app.dependencies import get_current_user

router = APIRouter()


def _case_to_response(case: PatientCase, image_count: int = 0, report_count: int = 0) -> CaseResponse:
    return CaseResponse(
        id=str(case.id),
        patient_id=case.patient_id,
        patient_name=case.patient_name,
        age=case.age,
        sex=case.sex,
        clinical_history=case.clinical_history,
        priority=case.priority.value,
        status=case.status.value,
        image_count=image_count,
        report_count=report_count,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


async def _log_audit(db: AsyncSession, user_id: uuid.UUID, action: str, resource_type: str, resource_id: str, details: dict | None = None):
    log = AuditLog(user_id=user_id, action=action, resource_type=resource_type, resource_id=resource_id, details=details)
    db.add(log)
    await db.flush()


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = PatientCase(
        user_id=user.id,
        patient_id=body.patient_id,
        patient_name=body.patient_name,
        age=body.age,
        sex=body.sex,
        clinical_history=body.clinical_history,
        priority=CasePriority(body.priority),
    )
    db.add(case)
    await _log_audit(db, user.id, "CREATE", "case", str(case.id), {"patient_id": body.patient_id})
    await db.commit()
    await db.refresh(case)
    return _case_to_response(case)


@router.get("", response_model=CaseListResponse)
async def list_cases(
    status_filter: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PatientCase).where(PatientCase.user_id == user.id)
    if status_filter:
        query = query.where(PatientCase.status == CaseStatus(status_filter))
    query = query.order_by(PatientCase.updated_at.desc())

    result = await db.execute(query)
    cases = result.scalars().all()

    items = []
    for case in cases:
        img_count = await db.scalar(
            select(func.count()).select_from(MedicalImage).where(MedicalImage.case_id == case.id)
        )
        rep_count = await db.scalar(
            select(func.count())
            .select_from(Report)
            .join(MedicalImage, Report.image_id == MedicalImage.id)
            .where(MedicalImage.case_id == case.id)
        )
        items.append(_case_to_response(case, img_count or 0, rep_count or 0))

    return CaseListResponse(cases=items, total=len(items))


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatientCase).where(PatientCase.id == case_id, PatientCase.user_id == user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    img_count = await db.scalar(
        select(func.count()).select_from(MedicalImage).where(MedicalImage.case_id == case.id)
    )
    rep_count = await db.scalar(
        select(func.count())
        .select_from(Report)
        .join(MedicalImage, Report.image_id == MedicalImage.id)
        .where(MedicalImage.case_id == case.id)
    )
    return _case_to_response(case, img_count or 0, rep_count or 0)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: uuid.UUID,
    body: CaseUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatientCase).where(PatientCase.id == case_id, PatientCase.user_id == user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    updates = body.model_dump(exclude_none=True)

    # Keep a JSON-safe copy for the audit log before converting to enums
    audit_details = {k: v for k, v in updates.items()}

    if "priority" in updates:
        updates["priority"] = CasePriority(updates["priority"])
    if "status" in updates:
        updates["status"] = CaseStatus(updates["status"])

    for key, val in updates.items():
        setattr(case, key, val)

    await _log_audit(db, user.id, "UPDATE", "case", str(case.id), audit_details)
    await db.commit()
    await db.refresh(case)
    return _case_to_response(case)


@router.post("/{case_id}/images/{image_id}", response_model=dict)
async def attach_image_to_case(
    case_id: uuid.UUID,
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case_result = await db.execute(
        select(PatientCase).where(PatientCase.id == case_id, PatientCase.user_id == user.id)
    )
    if not case_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Case not found")

    img_result = await db.execute(
        select(MedicalImage).where(MedicalImage.id == image_id, MedicalImage.user_id == user.id)
    )
    image = img_result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    image.case_id = case_id
    await _log_audit(db, user.id, "ATTACH_IMAGE", "case", str(case_id), {"image_id": str(image_id)})
    await db.commit()
    return {"status": "ok", "message": "Image attached to case"}
