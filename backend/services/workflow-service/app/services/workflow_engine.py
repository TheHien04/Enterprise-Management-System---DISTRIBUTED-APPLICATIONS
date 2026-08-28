import httpx
from udpt_common.audit_helper import log_audit
from udpt_common.config_loader import load_json_config
from udpt_common.deps import RequestUser
from udpt_common.document_callbacks import notify_document_status
from udpt_common.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError

from app.core.config import settings
from app.models.entities import WorkflowActionLog, WorkflowInstance
from app.repositories.workflow_repo import WorkflowRepository
from app.schemas.workflow import WorkflowProgress, WorkflowStartRequest


class WorkflowEngine:
    def __init__(self, repo: WorkflowRepository):
        self.repo = repo
        self.definitions = {item["document_type"]: item for item in load_json_config("workflow_definitions.json")}
        self.service_urls = {
            "CONTRACT": settings.contract_service_url,
            "APPENDIX": settings.contract_service_url,
            "PRICE_LIST": settings.pricing_service_url,
            "BILLING_SHEET": settings.billing_service_url,
        }

    def _get_definition(self, document_type: str) -> dict:
        definition = self.definitions.get(document_type)
        if not definition:
            raise ValidationError(f"No workflow definition for document type: {document_type}")
        return definition

    def _current_step(self, definition: dict, step_num: int) -> dict | None:
        for step in definition["steps"]:
            if step["step_num"] == step_num:
                return step
        return None

    async def start(self, payload: WorkflowStartRequest, idempotency_key: str | None = None) -> WorkflowInstance:
        if idempotency_key:
            existing = await self.repo.get_by_idempotency_key(idempotency_key)
            if existing:
                return existing
        existing = await self.repo.get_by_document(payload.document_type, payload.document_id)
        if existing and existing.status == "IN_PROGRESS":
            raise ConflictError("Workflow already in progress for this document (double submit blocked)")
        definition = self._get_definition(payload.document_type)
        first_step = definition["steps"][0]
        workflow = WorkflowInstance(
            document_type=payload.document_type,
            document_id=payload.document_id,
            definition_name=definition["name"],
            status="IN_PROGRESS",
            current_step_num=first_step["step_num"],
            current_assignee_role=first_step["assignee_role"],
            submitted_by=payload.submitted_by,
            idempotency_key=idempotency_key,
        )
        await self.repo.add(workflow)
        await self.repo.add_log(
            WorkflowActionLog(
                workflow_id=workflow.id,
                step_num=0,
                action="SUBMIT",
                actor_id=payload.submitted_by,
                actor_role="SALES_STAFF",
                comment="Submitted for approval",
            )
        )
        await self._emit_notification(workflow, "WORKFLOW_SUBMITTED")
        return workflow

    async def get_progress(self, workflow_id) -> WorkflowProgress:
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            raise NotFoundError("Workflow not found")
        definition = self._get_definition(workflow.document_type)
        steps = definition["steps"]
        completed = list(range(1, workflow.current_step_num))
        remaining = [step for step in steps if step["step_num"] >= workflow.current_step_num]
        current = self._current_step(definition, workflow.current_step_num)
        if workflow.status != "IN_PROGRESS":
            completed = [step["step_num"] for step in steps]
            remaining = []
            current = None
        return WorkflowProgress(
            workflow=workflow,
            completed_steps=completed,
            remaining_steps=remaining,
            current_step=current,
        )

    async def inbox(self, role: str):
        return await self.repo.list_inbox(role)

    async def approve(self, workflow_id, user: RequestUser, comment: str | None = None, expected_version: int | None = None):
        return await self._advance(workflow_id, user, "APPROVE", comment, expected_version)

    async def reject(self, workflow_id, user: RequestUser, comment: str | None = None, expected_version: int | None = None):
        if not comment or not comment.strip():
            raise ValidationError("Comment is required when rejecting (APR-03)")
        workflow = await self._get_workflow(workflow_id, expected_version)
        self._assert_assignee(workflow, user)
        actor_role = workflow.current_assignee_role or (user.roles[0] if user.roles else "UNKNOWN")
        workflow.status = "REJECTED"
        workflow.current_assignee_role = None
        workflow.version += 1
        await self.repo.add_log(
            WorkflowActionLog(
                workflow_id=workflow.id,
                step_num=workflow.current_step_num,
                action="REJECT",
                actor_id=user.user_id,
                actor_role=actor_role,
                comment=comment,
            )
        )
        await notify_document_status(
            document_type=workflow.document_type,
            document_id=workflow.document_id,
            workflow_status="REJECTED",
            service_urls=self.service_urls,
        )
        await log_audit(
            entity_type="WORKFLOW",
            entity_id=str(workflow.id),
            action="REJECT",
            actor_id=user.user_id,
            after_state={"status": workflow.status, "document_type": workflow.document_type},
            note=comment,
            audit_service_url=settings.audit_service_url,
        )
        await self._emit_notification(workflow, "WORKFLOW_REJECTED")
        return workflow

    async def request_revision(
        self, workflow_id, user: RequestUser, comment: str | None = None, expected_version: int | None = None
    ):
        if not comment or not comment.strip():
            raise ValidationError("Comment is required when requesting revision (APR-03)")
        workflow = await self._get_workflow(workflow_id, expected_version)
        self._assert_assignee(workflow, user)
        actor_role = workflow.current_assignee_role or (user.roles[0] if user.roles else "UNKNOWN")
        workflow.status = "REVISION_REQUESTED"
        workflow.current_assignee_role = "SALES_STAFF"
        workflow.version += 1
        await self.repo.add_log(
            WorkflowActionLog(
                workflow_id=workflow.id,
                step_num=workflow.current_step_num,
                action="REQUEST_REVISION",
                actor_id=user.user_id,
                actor_role=actor_role,
                comment=comment,
            )
        )
        await notify_document_status(
            document_type=workflow.document_type,
            document_id=workflow.document_id,
            workflow_status="REVISION_REQUESTED",
            service_urls=self.service_urls,
        )
        await log_audit(
            entity_type="WORKFLOW",
            entity_id=str(workflow.id),
            action="REQUEST_REVISION",
            actor_id=user.user_id,
            after_state={"status": workflow.status, "document_type": workflow.document_type},
            note=comment,
            audit_service_url=settings.audit_service_url,
        )
        await self._emit_notification(workflow, "WORKFLOW_REVISION_REQUESTED")
        return workflow

    async def _advance(
        self, workflow_id, user: RequestUser, action: str, comment: str | None, expected_version: int | None
    ):
        workflow = await self._get_workflow(workflow_id, expected_version)
        self._assert_assignee(workflow, user)
        definition = self._get_definition(workflow.document_type)
        current = self._current_step(definition, workflow.current_step_num)
        if not current:
            raise ValidationError("Workflow has no active step")
        # APR-02: only advance one step at a time — enforced by step_num + 1
        await self.repo.add_log(
            WorkflowActionLog(
                workflow_id=workflow.id,
                step_num=workflow.current_step_num,
                action=action,
                actor_id=user.user_id,
                actor_role=current["assignee_role"],
                comment=comment,
            )
        )
        next_step_num = workflow.current_step_num + 1
        next_step = self._current_step(definition, next_step_num)
        workflow.version += 1
        if next_step:
            workflow.current_step_num = next_step_num
            workflow.current_assignee_role = next_step["assignee_role"]
            await self._emit_notification(workflow, "WORKFLOW_STEP_ADVANCED")
        else:
            workflow.status = "APPROVED"
            workflow.current_assignee_role = None
            await notify_document_status(
                document_type=workflow.document_type,
                document_id=workflow.document_id,
                workflow_status="APPROVED",
                service_urls=self.service_urls,
            )
            await log_audit(
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                action="APPROVE",
                actor_id=user.user_id,
                after_state={"status": workflow.status, "document_type": workflow.document_type},
                audit_service_url=settings.audit_service_url,
            )
            await self._emit_notification(workflow, "WORKFLOW_APPROVED")
        return workflow

    async def _get_workflow(self, workflow_id, expected_version: int | None = None):
        workflow = await self.repo.get_by_id(workflow_id)
        if not workflow:
            raise NotFoundError("Workflow not found")
        if workflow.status != "IN_PROGRESS":
            raise ConflictError("Workflow is not in progress")
        if expected_version is not None and workflow.version != expected_version:
            raise ConflictError("Workflow was updated by another approver (SC-05)")
        return workflow

    def _assert_assignee(self, workflow: WorkflowInstance, user: RequestUser):
        required_role = workflow.current_assignee_role
        if required_role and not user.has_role(required_role):
            raise ForbiddenError(f"Only role {required_role} can action this workflow step (APR-01)")

    async def get_document_history(self, document_type: str, document_id: str):
        return await self.repo.list_logs_by_document(document_type, document_id)

    async def _emit_notification(self, workflow: WorkflowInstance, event_type: str) -> None:
        payload = {
            "user_id": workflow.submitted_by,
            "title": event_type.replace("_", " ").title(),
            "body": f"{workflow.document_type} {workflow.document_id} — step {workflow.current_step_num}",
            "event_type": event_type,
            "reference_id": str(workflow.id),
            "entity_type": workflow.document_type,
            "entity_id": workflow.document_id,
            "action": event_type,
            "actor_id": workflow.submitted_by,
        }
        try:
            from udpt_common.kafka_events import publish_domain_event

            await publish_domain_event(event_type, payload, settings.kafka_bootstrap_servers)
        except Exception:
            pass
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    "http://notification-service:8006/api/v1/notifications",
                    json={
                        "user_id": payload["user_id"],
                        "title": payload["title"],
                        "body": payload["body"],
                        "event_type": event_type,
                        "reference_id": payload["reference_id"],
                    },
                )
        except httpx.HTTPError:
            return
