from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.signing_session_repo import SigningSessionRepository
from app.schemas.signing_session import (
    SigningSessionCompleteRequest,
    SigningSessionOut,
    SigningSessionStartRequest,
)
from app.services.signing_service import SigningService

router = APIRouter(prefix="/signing-sessions", tags=["Signing Sessions"])


def _service(session: AsyncSession) -> SigningService:
    return SigningService(SigningSessionRepository(session))


@router.post("/start", response_model=SuccessResponse[SigningSessionOut])
async def start_signing_session(payload: SigningSessionStartRequest, session: AsyncSession = Depends(get_db)):
    data = await _service(session).start(payload)
    return SuccessResponse(data=data, message="Signing session started")


@router.get("/{session_id}", response_model=SuccessResponse[SigningSessionOut])
async def get_signing_session(session_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).get(session_id)
    return SuccessResponse(data=data)


@router.post("/{session_id}/complete", response_model=SuccessResponse[SigningSessionOut])
async def complete_signing_session(
    session_id: UUID,
    payload: SigningSessionCompleteRequest,
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).complete(session_id, payload)
    status_label = "completed" if payload.success else "failed"
    return SuccessResponse(data=data, message=f"Signing session {status_label}")
