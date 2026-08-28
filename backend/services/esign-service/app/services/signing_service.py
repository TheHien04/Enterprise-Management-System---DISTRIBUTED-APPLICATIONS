from uuid import UUID

import httpx
from udpt_common.audit_helper import log_audit
from udpt_common.exceptions import NotFoundError, ValidationError

from app.core.config import settings

from app.domain.enums import SigningStatus
from app.models.entities import SigningSession
from app.repositories.signing_session_repo import SigningSessionRepository
from app.schemas.signing_session import SigningSessionCompleteRequest, SigningSessionStartRequest


class SigningService:
    def __init__(self, repo: SigningSessionRepository):
        self.repo = repo

    async def start(self, payload: SigningSessionStartRequest) -> SigningSession:
        signing_session = SigningSession(
            document_type=payload.document_type,
            document_id=payload.document_id,
            status=SigningStatus.SIGNING,
            provider_ref=f"mock-{payload.document_type}-{payload.document_id}",
        )
        signing_session = await self.repo.add(signing_session)
        await log_audit(
            entity_type="SIGNING_SESSION",
            entity_id=str(signing_session.id),
            action="START",
            actor_id="system",
            after_state={
                "document_type": signing_session.document_type,
                "document_id": signing_session.document_id,
            },
            audit_service_url=settings.audit_service_url,
        )
        return signing_session

    async def get(self, session_id: UUID) -> SigningSession:
        signing_session = await self.repo.get_by_id(session_id)
        if not signing_session:
            raise NotFoundError("Signing session not found")
        return signing_session

    async def complete(self, session_id: UUID, payload: SigningSessionCompleteRequest) -> SigningSession:
        signing_session = await self.repo.get_by_id(session_id)
        if not signing_session:
            raise NotFoundError("Signing session not found")
        if signing_session.status not in {SigningStatus.PENDING_SEND, SigningStatus.SIGNING}:
            raise ValidationError(f"Cannot complete session in status: {signing_session.status}")
        signing_session.status = SigningStatus.SIGNED if payload.success else SigningStatus.FAILED
        if signing_session.document_type == "BILLING_SHEET":
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    await client.post(
                        f"{settings.billing_service_url}/api/v1/billing-sheets/{signing_session.document_id}/complete-esign",
                        params={"success": str(payload.success).lower()},
                    )
            except httpx.HTTPError:
                pass
        await log_audit(
            entity_type="SIGNING_SESSION",
            entity_id=str(signing_session.id),
            action="COMPLETE",
            actor_id="system",
            after_state={"status": signing_session.status.value, "success": payload.success},
            audit_service_url=settings.audit_service_url,
        )
        return signing_session
