from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import AuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_entity(self, entity_type: str, entity_id: str) -> list[AuditLog]:
        result = await self.session.scalars(
            select(AuditLog)
            .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
            .order_by(AuditLog.created_at.desc())
        )
        return list(result)

    async def list_recent(self, limit: int = 200) -> list[AuditLog]:
        result = await self.session.scalars(
            select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        )
        return list(result)

    async def add(self, audit_log: AuditLog) -> AuditLog:
        self.session.add(audit_log)
        await self.session.flush()
        return audit_log
