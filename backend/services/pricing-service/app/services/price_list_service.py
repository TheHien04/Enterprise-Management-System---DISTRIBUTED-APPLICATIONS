from datetime import date

from udpt_common.audit_helper import log_audit
from udpt_common.config_loader import load_json_config
from udpt_common.exceptions import ConflictError, NotFoundError, ValidationError

from app.core.config import settings
from app.domain.state_registry import get_price_list_state_machine
from app.models.entities import PriceList, PriceListItem
from app.repositories.price_list_repo import PriceListRepository
from app.schemas.price_list import PriceListCreate


def _dates_overlap(a_from: date, a_to: date, b_from: date, b_to: date) -> bool:
    return a_from <= b_to and a_to >= b_from


class PriceListService:
    def __init__(self, repo: PriceListRepository):
        self.repo = repo
        self.state_machine = get_price_list_state_machine()

    async def list_price_lists(self, contract_code: str | None = None):
        return await self.repo.list_all(contract_code=contract_code)

    async def create_price_list(self, payload: PriceListCreate):
        if not payload.contract_code.strip():
            raise ValidationError("Price list must be linked to a contract (PRC-01)")
        if payload.effective_to < payload.effective_from:
            raise ValidationError("effective_to must be on or after effective_from (PRC-02)")
        existing = await self.repo.list_by_contract(payload.contract_code)
        for pl in existing:
            if pl.status not in {"EFFECTIVE", "APPROVED"}:
                continue
            if _dates_overlap(payload.effective_from, payload.effective_to, pl.effective_from, pl.effective_to):
                raise ConflictError(
                    f"Overlapping effective dates for same contract (PRC-03), conflicts with {pl.version}"
                )
        price_list = PriceList(
            contract_code=payload.contract_code,
            version=payload.version,
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
            status="DRAFT",
            items=[
                PriceListItem(service_code=item.service_code, unit_price=item.unit_price)
                for item in payload.items
            ],
        )
        price_list = await self.repo.add(price_list)
        await log_audit(
            entity_type="PRICE_LIST",
            entity_id=str(price_list.id),
            action="CREATE",
            actor_id="system",
            after_state={"contract_code": price_list.contract_code, "version": price_list.version},
            audit_service_url=settings.audit_service_url,
        )
        return price_list

    async def submit_price_list(self, price_list_id, user_id: str = "system"):
        import httpx

        price_list = await self.repo.get_by_id(price_list_id)
        if not price_list:
            raise NotFoundError("Price list not found")
        before = price_list.status
        self.state_machine.assert_transition(price_list.status, "SUBMITTED")
        price_list.status = "SUBMITTED"
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.workflow_service_url}/api/v1/workflows/start",
                json={
                    "document_type": "PRICE_LIST",
                    "document_id": str(price_list.id),
                    "submitted_by": user_id,
                },
                headers={"X-User-Id": user_id},
            )
        if response.status_code >= 400:
            body = response.json()
            raise ValidationError(body.get("error", {}).get("message", "Workflow start failed"))
        await log_audit(
            entity_type="PRICE_LIST",
            entity_id=str(price_list.id),
            action="SUBMIT",
            actor_id=user_id,
            before_state=before,
            after_state=price_list.status,
            audit_service_url=settings.audit_service_url,
        )
        return price_list

    async def apply_workflow_status(self, payload):
        from uuid import UUID

        from app.schemas.internal import WorkflowStatusCallback

        if not isinstance(payload, WorkflowStatusCallback):
            payload = WorkflowStatusCallback(**payload)
        price_list = await self.repo.get_by_id(UUID(payload.document_id))
        if not price_list:
            raise NotFoundError("Price list not found")
        before = price_list.status
        if payload.workflow_status == "APPROVED":
            self.state_machine.assert_transition(price_list.status, "APPROVED")
            price_list.status = "APPROVED"
            self.state_machine.assert_transition(price_list.status, "EFFECTIVE")
            price_list.status = "EFFECTIVE"
        elif payload.workflow_status == "REJECTED":
            self.state_machine.assert_transition(price_list.status, "REJECTED")
            price_list.status = "REJECTED"
        await log_audit(
            entity_type="PRICE_LIST",
            entity_id=str(price_list.id),
            action="WORKFLOW_STATUS",
            actor_id="system",
            before_state=before,
            after_state=price_list.status,
            note=payload.workflow_status,
            audit_service_url=settings.audit_service_url,
        )
        return price_list


async def seed_price_lists(session):
    repo = PriceListRepository(session)
    if await repo.list_all():
        return
    seed = load_json_config("seed_data.json")
    for key, item in seed.get("price_lists", {}).items():
        await repo.add(
            PriceList(
                contract_code=item["contract_code"],
                version=item.get("version", key),
                effective_from=date.fromisoformat(item["effective_from"]),
                effective_to=date.fromisoformat(item["effective_to"]),
                status="EFFECTIVE",
                items=[
                    PriceListItem(service_code=i["service_code"], unit_price=i["unit_price"])
                    for i in item.get("items", [])
                ],
            )
        )
