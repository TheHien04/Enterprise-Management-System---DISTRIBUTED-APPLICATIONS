from datetime import date

import httpx
from udpt_common.audit_helper import log_audit
from udpt_common.deps import RequestUser
from udpt_common.exceptions import ConflictError, NotFoundError, ValidationError

from app.core.config import settings
from app.domain.state_registry import get_appendix_state_machine, get_contract_state_machine
from app.models.entities import Contract, ContractAppendix, Customer
from app.repositories.customer_repo import (
    AppendixRepository,
    ContractRepository,
    CustomerRepository,
)
from app.schemas.customer import (
    AppendixCreate,
    ContractCreate,
    ContractUpdate,
    CustomerCreate,
    CustomerUpdate,
    WorkflowStatusCallback,
)


class CustomerService:
    def __init__(self, repo: CustomerRepository):
        self.repo = repo

    async def list_customers(self):
        return await self.repo.list_all()

    async def create_customer(self, payload: CustomerCreate):
        if await self.repo.get_by_code(payload.code):
            raise ConflictError(f"Customer code already exists: {payload.code}")
        customer = Customer(**payload.model_dump())
        return await self.repo.add(customer)

    async def update_customer(self, customer_id, payload: CustomerUpdate):
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(customer, key, value)
        return customer

    async def suspend_customer(self, customer_id):
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        before = customer.status
        customer.status = "SUSPENDED"
        await log_audit(
            entity_type="CUSTOMER",
            entity_id=str(customer.id),
            action="SUSPEND",
            actor_id="system",
            before_state=before,
            after_state=customer.status,
        )
        return customer

    async def get_overview(self, customer_id, billing_url: str, pricing_url: str):
        """Req 4.1 — tra cứu HĐ, bảng giá, bảng thanh toán theo khách hàng."""
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        contract_repo = ContractRepository(self.repo.session)
        contracts = await contract_repo.list_all(customer_id)
        codes = [c.code for c in contracts]
        price_count = 0
        billing_count = 0
        async with httpx.AsyncClient(timeout=10.0) as client:
            for code in codes:
                pl = await client.get(f"{pricing_url}/api/v1/price-lists", params={"contract_code": code})
                if pl.status_code < 400:
                    price_count += len(pl.json().get("data", []))
                bl = await client.get(f"{billing_url}/api/v1/billing-sheets", params={"contract_code": code})
                if bl.status_code < 400:
                    billing_count += len(bl.json().get("data", []))
        return {
            "customer": customer,
            "contracts": contracts,
            "contract_codes": codes,
            "price_list_count": price_count,
            "billing_sheet_count": billing_count,
        }


class ContractService:
    NON_EDITABLE_STATUSES = {"APPROVED", "ACTIVE", "UNDER_REVIEW", "SUBMITTED"}

    def __init__(self, contract_repo: ContractRepository, customer_repo: CustomerRepository):
        self.contract_repo = contract_repo
        self.customer_repo = customer_repo
        self.state_machine = get_contract_state_machine()

    async def list_contracts(self, customer_id=None):
        return await self.contract_repo.list_all(customer_id)

    async def create_contract(self, payload: ContractCreate, user: RequestUser):
        if await self.contract_repo.get_by_code(payload.code):
            raise ConflictError(f"Contract code already exists: {payload.code}")
        customer = await self.customer_repo.get_by_id(payload.customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        if customer.status != "ACTIVE":
            raise ValidationError("Customer must be ACTIVE to create a contract (CTR-02)")
        if payload.effective_to < payload.effective_from:
            raise ValidationError("effective_to must be on or after effective_from (CTR-02)")
        contract = Contract(**payload.model_dump(), created_by=user.user_id, status="DRAFT")
        return await self.contract_repo.add(contract)

    async def update_contract(self, contract_id, payload: ContractUpdate):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        if contract.status in self.NON_EDITABLE_STATUSES:
            raise ValidationError(
                "Approved/Active contracts cannot be edited directly — create an appendix (CTR-07)"
            )
        self.state_machine.assert_editable(contract.status)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(contract, key, value)
        if contract.effective_to < contract.effective_from:
            raise ValidationError("effective_to must be on or after effective_from (CTR-02)")
        return contract

    async def cancel_contract(self, contract_id):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        before = contract.status
        if contract.status == "ACTIVE":
            self.state_machine.assert_transition(contract.status, "CANCELLED")
        elif contract.status in {"DRAFT", "SUBMITTED"}:
            self.state_machine.assert_transition(contract.status, "CANCELLED")
        else:
            raise ValidationError(f"Cannot cancel contract in status {contract.status} (CTR-06)")
        contract.status = "CANCELLED"
        contract.current_assignee_role = None
        await log_audit(
            entity_type="CONTRACT",
            entity_id=str(contract.id),
            action="CANCEL",
            actor_id="system",
            before_state=before,
            after_state=contract.status,
        )
        return contract

    async def extend_contract(self, contract_id, new_effective_to: date):
        """Req 4.2 — gia hạn hợp đồng."""
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        if contract.status not in {"ACTIVE", "APPROVED"}:
            raise ValidationError("Only ACTIVE/APPROVED contracts can be extended")
        if new_effective_to <= contract.effective_to:
            raise ValidationError("new_effective_to must be after current effective_to")
        before = str(contract.effective_to)
        contract.effective_to = new_effective_to
        await log_audit(
            entity_type="CONTRACT",
            entity_id=str(contract.id),
            action="EXTEND",
            actor_id="system",
            before_state=before,
            after_state=str(contract.effective_to),
            note="Contract extended",
        )
        return contract

    async def reopen_rejected_contract(self, contract_id):
        """CTR-04: rejected contracts require explicit revision reopening."""
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        self.state_machine.assert_transition(contract.status, "REVISION_REQUESTED")
        contract.status = "REVISION_REQUESTED"
        contract.current_assignee_role = "SALES_STAFF"
        return contract

    async def return_revised_to_draft(self, contract_id):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        self.state_machine.assert_transition(contract.status, "DRAFT")
        contract.status = "DRAFT"
        contract.current_assignee_role = None
        contract.workflow_id = None
        return contract

    async def submit_contract(self, contract_id, user: RequestUser, idempotency_key: str | None = None):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        customer = await self.customer_repo.get_by_id(contract.customer_id)
        if not customer or customer.status != "ACTIVE":
            raise ValidationError("Valid active customer required (CTR-02)")
        if contract.effective_to < contract.effective_from:
            raise ValidationError("Invalid effective dates (CTR-02)")
        if not contract.attachments:
            raise ValidationError("Contract must have at least one attachment before submit (CTR-02)")
        # CTR-03: must go DRAFT -> SUBMITTED -> UNDER_REVIEW (no skip to APPROVED)
        self.state_machine.assert_transition(contract.status, "SUBMITTED")
        contract.status = "SUBMITTED"
        self.state_machine.assert_transition(contract.status, "UNDER_REVIEW")
        headers = {"X-User-Id": user.user_id}
        if idempotency_key:
            headers["X-Idempotency-Key"] = idempotency_key
        workflow = await self._start_workflow("CONTRACT", str(contract.id), user.user_id, headers)
        contract.status = "UNDER_REVIEW"
        contract.workflow_id = workflow["id"]
        contract.current_assignee_role = workflow.get("current_assignee_role")
        await log_audit(
            entity_type="CONTRACT",
            entity_id=str(contract.id),
            action="SUBMIT",
            actor_id=user.user_id,
            before_state="DRAFT",
            after_state=contract.status,
        )
        return contract

    async def apply_workflow_status(self, payload: WorkflowStatusCallback):
        from uuid import UUID

        contract = await self.contract_repo.get_by_id(UUID(payload.document_id))
        if not contract:
            raise NotFoundError("Contract not found")
        if payload.workflow_status == "APPROVED":
            self.state_machine.assert_transition(contract.status, "APPROVED")
            contract.status = "APPROVED"
            contract.current_assignee_role = None
            contract = self._activate_if_due(contract)
        elif payload.workflow_status == "REJECTED":
            self.state_machine.assert_transition(contract.status, "REJECTED")
            contract.status = "REJECTED"
            contract.current_assignee_role = None
        elif payload.workflow_status == "REVISION_REQUESTED":
            self.state_machine.assert_transition(contract.status, "REVISION_REQUESTED")
            contract.status = "REVISION_REQUESTED"
            contract.current_assignee_role = "SALES_STAFF"
        return contract

    async def activate_due_contracts(self):
        """CTR-05: APPROVED -> ACTIVE when effective_from reached."""
        updated = []
        today = date.today()
        for contract in await self.contract_repo.list_all():
            if contract.status == "APPROVED" and contract.effective_from <= today:
                self.state_machine.assert_transition(contract.status, "ACTIVE")
                contract.status = "ACTIVE"
                updated.append(contract)
            elif contract.status == "ACTIVE" and contract.effective_to < today:
                self.state_machine.assert_transition(contract.status, "EXPIRED")
                contract.status = "EXPIRED"
                updated.append(contract)
        return updated

    def _activate_if_due(self, contract: Contract) -> Contract:
        if contract.status == "APPROVED" and contract.effective_from <= date.today():
            self.state_machine.assert_transition(contract.status, "ACTIVE")
            contract.status = "ACTIVE"
        return contract

    async def _start_workflow(
        self, document_type: str, document_id: str, user_id: str, headers: dict | None = None
    ) -> dict:
        request_headers = headers or {"X-User-Id": user_id}
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.workflow_service_url}/api/v1/workflows/start",
                json={
                    "document_type": document_type,
                    "document_id": document_id,
                    "submitted_by": user_id,
                },
                headers=request_headers,
            )
        if response.status_code >= 400:
            body = response.json()
            raise ValidationError(body.get("error", {}).get("message", "Workflow start failed"))
        return response.json()["data"]


class AppendixService:
    def __init__(self, appendix_repo: AppendixRepository, contract_repo: ContractRepository):
        self.appendix_repo = appendix_repo
        self.contract_repo = contract_repo
        self.state_machine = get_appendix_state_machine()

    async def list_appendices(self, contract_id):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        return await self.appendix_repo.list_by_contract(contract_id)

    async def create_appendix(self, payload: AppendixCreate):
        contract = await self.contract_repo.get_by_id(payload.contract_id)
        if not contract:
            raise NotFoundError("Contract not found")
        if contract.status not in {"APPROVED", "ACTIVE"}:
            raise ValidationError("Appendix can only be created for APPROVED/ACTIVE contracts (CTR-07)")
        appendix = ContractAppendix(**payload.model_dump(), status="DRAFT")
        return await self.appendix_repo.add(appendix)

    async def submit_appendix(self, appendix_id, user: RequestUser):
        """Req 4.3 — phụ lục trình duyệt qua workflow APPENDIX."""
        appendix = await self.appendix_repo.get_by_id(appendix_id)
        if not appendix:
            raise NotFoundError("Appendix not found")
        self.state_machine.assert_transition(appendix.status, "SUBMITTED")
        appendix.status = "SUBMITTED"
        self.state_machine.assert_transition(appendix.status, "UNDER_REVIEW")
        workflow = await ContractService(self.contract_repo, CustomerRepository(self.appendix_repo.session))._start_workflow(
            "APPENDIX", str(appendix.id), user.user_id
        )
        appendix.status = "UNDER_REVIEW"
        appendix.workflow_id = workflow["id"]
        await log_audit(
            entity_type="APPENDIX",
            entity_id=str(appendix.id),
            action="SUBMIT",
            actor_id=user.user_id,
            before_state="DRAFT",
            after_state=appendix.status,
        )
        return appendix

    async def apply_workflow_status(self, payload: WorkflowStatusCallback):
        from uuid import UUID

        appendix = await self.appendix_repo.get_by_id(UUID(payload.document_id))
        if not appendix:
            raise NotFoundError("Appendix not found")
        if payload.workflow_status == "APPROVED":
            self.state_machine.assert_transition(appendix.status, "APPROVED")
            appendix.status = "APPROVED"
            self.state_machine.assert_transition(appendix.status, "EFFECTIVE")
            if appendix.effective_date <= date.today():
                appendix.status = "EFFECTIVE"
        elif payload.workflow_status == "REJECTED":
            self.state_machine.assert_transition(appendix.status, "REJECTED")
            appendix.status = "REJECTED"
        elif payload.workflow_status == "REVISION_REQUESTED":
            self.state_machine.assert_transition(appendix.status, "REVISION_REQUESTED")
            appendix.status = "REVISION_REQUESTED"
        return appendix
