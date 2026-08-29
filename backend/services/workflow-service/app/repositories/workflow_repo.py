from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import WorkflowActionLog, WorkflowInstance


class WorkflowRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id_for_update(self, workflow_id: UUID) -> WorkflowInstance | None:
        result = await self.session.scalars(
            select(WorkflowInstance)
            .where(WorkflowInstance.id == workflow_id)
            .with_for_update()
        )
        return result.first()

    async def get_by_id(self, workflow_id: UUID) -> WorkflowInstance | None:
        return await self.session.get(WorkflowInstance, workflow_id)

    async def get_by_idempotency_key(self, key: str) -> WorkflowInstance | None:
        result = await self.session.scalars(
            select(WorkflowInstance).where(WorkflowInstance.idempotency_key == key)
        )
        return result.first()

    async def get_by_document(self, document_type: str, document_id: str) -> WorkflowInstance | None:
        result = await self.session.scalars(
            select(WorkflowInstance)
            .where(
                WorkflowInstance.document_type == document_type,
                WorkflowInstance.document_id == document_id,
            )
            .order_by(WorkflowInstance.created_at.desc())
        )
        return result.first()

    async def list_inbox(self, role: str, user_id: str | None = None) -> list[WorkflowInstance]:
        query = select(WorkflowInstance).where(
            WorkflowInstance.status == "IN_PROGRESS",
            WorkflowInstance.current_assignee_role == role,
        )
        if user_id:
            from sqlalchemy import or_

            query = query.where(
                or_(
                    WorkflowInstance.current_assignee_user_id.is_(None),
                    WorkflowInstance.current_assignee_user_id == user_id,
                )
            )
        result = await self.session.scalars(query.order_by(WorkflowInstance.updated_at.desc()))
        return list(result)

    async def add(self, workflow: WorkflowInstance) -> WorkflowInstance:
        self.session.add(workflow)
        await self.session.flush()
        return workflow

    async def add_log(self, log: WorkflowActionLog) -> WorkflowActionLog:
        self.session.add(log)
        await self.session.flush()
        return log

    async def list_logs_by_document(self, document_type: str, document_id: str) -> list[WorkflowActionLog]:
        workflow = await self.get_by_document(document_type, document_id)
        if not workflow:
            return []
        result = await self.session.scalars(
            select(WorkflowActionLog)
            .where(WorkflowActionLog.workflow_id == workflow.id)
            .order_by(WorkflowActionLog.created_at.asc())
        )
        return list(result)
