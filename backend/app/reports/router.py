import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MedicalImage, PatientCase, Report, User
from app.db.session import get_db
from app.dependencies import get_current_user
from app.reports.fhir_export import to_fhir_diagnostic_report
from app.reports.pdf_export import generate_pdf
from app.reports.schemas import ReportGenerateRequest, ReportResponse
from app.reports.service import generate_report

router = APIRouter()


@router.post("/generate", response_model=ReportResponse, status_code=201)
async def create_report(
    body: ReportGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        report = await generate_report(
            image_id=uuid.UUID(body.image_id),
            user_id=user.id,
            db=db,
            clinical_notes=body.clinical_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    return ReportResponse(
        id=str(report.id),
        image_id=str(report.image_id),
        findings=report.findings,
        impression=report.impression,
        recommendations=report.recommendations,
        confidence=report.confidence,
        citations=report.citations,
        model_used=report.model_used,
        created_at=report.created_at,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=str(report.id),
        image_id=str(report.image_id),
        findings=report.findings,
        impression=report.impression,
        recommendations=report.recommendations,
        confidence=report.confidence,
        citations=report.citations,
        model_used=report.model_used,
        created_at=report.created_at,
    )


@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = generate_pdf({
        "findings": report.findings,
        "impression": report.impression,
        "recommendations": report.recommendations,
        "confidence": report.confidence,
        "citations": report.citations,
        "model_used": report.model_used,
    })

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"},
    )


@router.get("/{report_id}/fhir")
async def get_report_fhir(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report_data = {
        "id": str(report.id),
        "findings": report.findings,
        "impression": report.impression,
        "recommendations": report.recommendations,
        "confidence": report.confidence,
        "citations": report.citations,
        "model_used": report.model_used,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }

    image_data = None
    img_result = await db.execute(select(MedicalImage).where(MedicalImage.id == report.image_id))
    image = img_result.scalar_one_or_none()
    if image:
        image_data = {
            "id": str(image.id),
            "filename": image.filename,
            "modality": image.modality,
        }

    patient_data = None
    if image and image.case_id:
        case_result = await db.execute(select(PatientCase).where(PatientCase.id == image.case_id))
        case = case_result.scalar_one_or_none()
        if case:
            patient_data = {"patient_id": case.patient_id, "patient_name": case.patient_name}

    fhir = to_fhir_diagnostic_report(report_data, image_data, patient_data)
    return JSONResponse(content=fhir, media_type="application/fhir+json")


@router.get("", response_model=dict)
async def list_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    items = [
        ReportResponse(
            id=str(r.id),
            image_id=str(r.image_id),
            findings=r.findings,
            impression=r.impression,
            recommendations=r.recommendations,
            confidence=r.confidence,
            citations=r.citations,
            model_used=r.model_used,
            created_at=r.created_at,
        ).model_dump()
        for r in reports
    ]
    return {"reports": items, "total": len(items)}
