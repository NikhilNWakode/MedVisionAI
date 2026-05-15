from datetime import datetime

from pydantic import BaseModel


class CaseCreateRequest(BaseModel):
    patient_id: str
    patient_name: str | None = None
    age: int | None = None
    sex: str | None = None
    clinical_history: str | None = None
    priority: str = "routine"


class CaseUpdateRequest(BaseModel):
    patient_name: str | None = None
    age: int | None = None
    sex: str | None = None
    clinical_history: str | None = None
    priority: str | None = None
    status: str | None = None


class CaseResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str | None = None
    age: int | None = None
    sex: str | None = None
    clinical_history: str | None = None
    priority: str
    status: str
    image_count: int = 0
    report_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int
