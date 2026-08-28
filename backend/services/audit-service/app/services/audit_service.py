from app.models.entities import AuditLog
from app.repositories.audit_repo import AuditRepository
from app.schemas.audit import AuditLogCreate


class AuditService:
    def __init__(self, repo: AuditRepository):
        self.repo = repo

    async def list_by_entity(self, entity_type: str, entity_id: str) -> list[AuditLog]:
        return await self.repo.list_by_entity(entity_type, entity_id)

    async def list_recent(self, limit: int = 200) -> list[AuditLog]:
        return await self.repo.list_recent(limit=limit)

    async def log(self, payload: AuditLogCreate) -> AuditLog:
        audit_log = AuditLog(
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            action=payload.action,
            actor_id=payload.actor_id,
            before_state=payload.before_state,
            after_state=payload.after_state,
            note=payload.note,
        )
        return await self.repo.add(audit_log)
