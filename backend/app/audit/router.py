from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog, User
from app.db.session import get_db
from app.dependencies import get_current_user

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: str
    action: str
    resource_type: str
    resource_id: str | None
    details: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=dict)
async def list_audit_logs(
    resource_type: str | None = None,
    limit: int = Query(default=50, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).where(AuditLog.user_id == user.id)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    items = [
        AuditLogResponse(
            id=str(l.id),
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            details=l.details,
            created_at=l.created_at,
        ).model_dump()
        for l in logs
    ]
    return {"logs": items, "total": len(items)}
