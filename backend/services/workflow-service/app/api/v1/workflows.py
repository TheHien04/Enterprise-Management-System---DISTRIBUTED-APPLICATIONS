from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.deps import RequestUser, get_request_user
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.workflow_repo import WorkflowRepository
from app.schemas.workflow import WorkflowActionRequest, WorkflowOut, WorkflowProgress, WorkflowStartRequest
from app.services.workflow_engine import WorkflowEngine

router = APIRouter(prefix="/workflows", tags=["Workflows"])


def _engine(session: AsyncSession) -> WorkflowEngine:
    return WorkflowEngine(WorkflowRepository(session))


@router.post("/start", response_model=SuccessResponse[WorkflowOut])
async def start_workflow(
    payload: WorkflowStartRequest,
    session: AsyncSession = Depends(get_db),
    x_idempotency_key: str | None = Header(default=None),
):
    data = await _engine(session).start(payload, idempotency_key=x_idempotency_key)
    return SuccessResponse(data=data, message="Workflow started")


@router.get("/outbox/stats", response_model=SuccessResponse[dict])
async def outbox_stats(session: AsyncSession = Depends(get_db)):
    from sqlalchemy import func as sqlfunc, select

    from app.db.base import OutboxEvent

    pending = await session.scalar(
        select(sqlfunc.count()).select_from(OutboxEvent).where(OutboxEvent.status == "PENDING")
    )
    published = await session.scalar(
        select(sqlfunc.count()).select_from(OutboxEvent).where(OutboxEvent.status == "PUBLISHED")
    )
    return SuccessResponse(data={"pending": int(pending or 0), "published": int(published or 0)})


@router.get("/inbox", response_model=SuccessResponse[list[WorkflowOut]])
async def workflow_inbox(
    role: str = Query(...),
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
):
    data = await _engine(session).inbox(role, user_id=user.user_id)
    return SuccessResponse(data=data)


@router.get("/document/{document_type}/{document_id}/history", response_model=SuccessResponse[list[dict]])
async def document_workflow_history(
    document_type: str,
    document_id: str,
    session: AsyncSession = Depends(get_db),
):
    logs = await _engine(session).get_document_history(document_type, document_id)
    data = [
        {
            "step_num": log.step_num,
            "action": log.action,
            "actor_id": log.actor_id,
            "actor_role": log.actor_role,
            "comment": log.comment,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
    return SuccessResponse(data=data)


@router.get("/{workflow_id}", response_model=SuccessResponse[WorkflowProgress])
async def get_workflow(workflow_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _engine(session).get_progress(workflow_id)
    return SuccessResponse(data=data)


@router.post("/{workflow_id}/approve", response_model=SuccessResponse[WorkflowOut])
async def approve_workflow(
    workflow_id: UUID,
    payload: WorkflowActionRequest,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
    version: int | None = Query(default=None),
):
    data = await _engine(session).approve(workflow_id, user, payload.comment, version)
    return SuccessResponse(data=data, message="Step approved")


@router.post("/{workflow_id}/reject", response_model=SuccessResponse[WorkflowOut])
async def reject_workflow(
    workflow_id: UUID,
    payload: WorkflowActionRequest,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
    version: int | None = Query(default=None),
):
    data = await _engine(session).reject(workflow_id, user, payload.comment, version)
    return SuccessResponse(data=data, message="Workflow rejected")


@router.post("/{workflow_id}/request-revision", response_model=SuccessResponse[WorkflowOut])
async def request_revision(
    workflow_id: UUID,
    payload: WorkflowActionRequest,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
    version: int | None = Query(default=None),
):
    data = await _engine(session).request_revision(workflow_id, user, payload.comment, version)
    return SuccessResponse(data=data, message="Revision requested")
