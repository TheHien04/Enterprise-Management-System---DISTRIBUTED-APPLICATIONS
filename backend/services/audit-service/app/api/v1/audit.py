from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.audit_repo import AuditRepository
from app.schemas.audit import AuditLogCreate, AuditLogOut
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit"])


def _service(session: AsyncSession) -> AuditService:
    return AuditService(AuditRepository(session))


@router.get("", response_model=SuccessResponse[list[AuditLogOut]])
async def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
):
    service = _service(session)
    if entity_type and entity_id:
        data = await service.list_by_entity(entity_type, entity_id)
    else:
        data = await service.list_recent(limit=limit)
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[AuditLogOut])
async def create_audit_log(payload: AuditLogCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).log(payload)
    return SuccessResponse(data=data, message="Audit log created")
