from datetime import datetime

from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    image_id: str
    clinical_notes: str | None = None


class ReportResponse(BaseModel):
    id: str
    image_id: str
    findings: str | None = None
    impression: str | None = None
    recommendations: str | None = None
    confidence: float | None = None
    citations: list | dict | None = None
    model_used: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
