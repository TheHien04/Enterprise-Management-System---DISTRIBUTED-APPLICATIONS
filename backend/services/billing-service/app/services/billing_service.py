from calendar import monthrange
from collections import defaultdict
from datetime import date
from decimal import Decimal
from uuid import UUID

import httpx
from udpt_common.audit_helper import log_audit
from udpt_common.config_loader import load_json_config
from udpt_common.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError

from app.core.config import settings
from app.domain.state_registry import (
    get_billing_approval_state_machine,
    get_billing_issuance_state_machine,
    get_billing_signing_state_machine,
)
from app.models.entities import BillingAdjustment, BillingSheet, BillingSheetItem
from app.repositories.billing_repo import BillingSheetRepository
from app.schemas.billing import AdjustmentCreate, BillingSheetCreate, WorkflowStatusCallback

APPENDIX_FIELD_TO_SERVICE = {"warehouse_unit_price": "DV003"}


def _period_bounds(period: str) -> tuple[date, date]:
    year, month = map(int, period.split("-"))
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _pick_price_list(price_lists: list[dict], period_start: date, period_end: date) -> dict | None:
    candidates = []
    for pl in price_lists:
        if pl.get("status") not in {"EFFECTIVE", "APPROVED"}:
            continue
        pl_from = date.fromisoformat(str(pl["effective_from"]))
        pl_to = date.fromisoformat(str(pl["effective_to"]))
        if pl_from <= period_end and pl_to >= period_start:
            candidates.append((pl_from, pl))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


class BillingSheetService:
    LOCKED_EDIT_STATUSES = {"APPROVED", "REJECTED"}
    LOCKED_SIGNING = {"SIGNED"}

    def __init__(self, repo: BillingSheetRepository):
        self.repo = repo
        self.approval_sm = get_billing_approval_state_machine()
        self.signing_sm = get_billing_signing_state_machine()
        self.issuance_sm = get_billing_issuance_state_machine()

    async def list_sheets(self, contract_code: str | None = None, period: str | None = None):
        return await self.repo.list_all(contract_code=contract_code, period=period)

    async def get_sheet(self, sheet_id):
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        return sheet

    async def create_sheet(self, payload: BillingSheetCreate):
        if await self.repo.get_by_contract_period(payload.contract_code, payload.period):
            raise ConflictError(
                f"Billing sheet already exists for {payload.contract_code} / {payload.period}"
            )
        items = []
        subtotal = Decimal("0")
        for item in payload.items:
            amount = Decimal(str(item.quantity)) * Decimal(str(item.unit_price))
            subtotal += amount
            items.append(
                BillingSheetItem(
                    service_code=item.service_code,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    snapshot_unit_price=item.unit_price,
                    amount=float(amount),
                )
            )
        tax_rate = Decimal(str(payload.tax_rate))
        tax_amount = subtotal * tax_rate
        total = subtotal + tax_amount
        sheet = BillingSheet(
            contract_code=payload.contract_code,
            period=payload.period,
            tax_rate=payload.tax_rate,
            subtotal=float(subtotal),
            tax_amount=float(tax_amount),
            total=float(total),
            approval_status="DRAFT",
            signing_status="NONE",
            issuance_status="DRAFT",
            items=items,
        )
        return await self.repo.add(sheet)

    async def generate_sheet(self, contract_code: str, period: str, tax_rate: float = 0):
        """PAY-01/02/03: contract valid, period reconciled, snapshot prices."""
        if await self.repo.get_by_contract_period(contract_code, period):
            raise ConflictError(f"Billing sheet already exists for {contract_code} / {period}")
        await self._assert_contract_valid(contract_code, period)
        await self._assert_period_reconciled(period)
        period_start, period_end = _period_bounds(period)
        volumes = await self._fetch_volumes(contract_code, period)
        if not volumes:
            raise ValidationError(f"No volume records for {contract_code} in period {period} (PAY-02)")
        price_lists = await self._fetch_price_lists(contract_code)
        price_list = _pick_price_list(price_lists, period_start, period_end)
        if not price_list:
            raise ValidationError(f"No applicable price list for {contract_code} in period {period} (PAY-01)")
        price_map = {item["service_code"]: float(item["unit_price"]) for item in price_list.get("items", [])}
        price_map.update(self._contract_service_prices(contract_code))
        appendices = await self._fetch_effective_appendices(contract_code, period_end)
        for appendix in appendices:
            service_code = APPENDIX_FIELD_TO_SERVICE.get(appendix.get("field_name"))
            if service_code and appendix.get("after_value") is not None:
                price_map[service_code] = float(appendix["after_value"])
        quantities: dict[str, float] = defaultdict(float)
        for vol in volumes:
            quantities[vol["service_code"]] += float(vol["quantity"])
        if not quantities:
            raise ValidationError("Mandatory service lines missing (PAY-04)")
        items = []
        subtotal = Decimal("0")
        for service_code, quantity in sorted(quantities.items()):
            unit_price = price_map.get(service_code)
            if unit_price is None:
                raise ValidationError(f"No unit price for service {service_code}")
            amount = Decimal(str(quantity)) * Decimal(str(unit_price))
            subtotal += amount
            items.append(
                BillingSheetItem(
                    service_code=service_code,
                    quantity=quantity,
                    unit_price=unit_price,
                    snapshot_unit_price=unit_price,  # PAY-03 frozen at calculation time
                    amount=float(amount),
                )
            )
        if subtotal < 0:
            raise ValidationError("Total amount cannot be negative (PAY-04)")
        tax_rate_dec = Decimal(str(tax_rate))
        tax_amount = subtotal * tax_rate_dec
        total = subtotal + tax_amount
        sheet = BillingSheet(
            contract_code=contract_code,
            period=period,
            tax_rate=tax_rate,
            subtotal=float(subtotal),
            tax_amount=float(tax_amount),
            total=float(total),
            approval_status="CALCULATED",
            signing_status="NONE",
            issuance_status="DRAFT",
            items=items,
        )
        sheet = await self.repo.add(sheet)
        await log_audit(
            entity_type="BILLING_SHEET",
            entity_id=str(sheet.id),
            action="GENERATE",
            actor_id="system",
            after_state={"contract_code": contract_code, "period": period, "total": sheet.total},
            audit_service_url=settings.audit_service_url,
        )
        return sheet

    async def reconcile_sheet(self, sheet_id):
        sheet = await self._get_editable_sheet(sheet_id)
        before = sheet.approval_status
        self.approval_sm.assert_transition(sheet.approval_status, "RECONCILED")
        sheet.approval_status = "RECONCILED"
        await log_audit(
            entity_type="BILLING_SHEET",
            entity_id=str(sheet.id),
            action="RECONCILE",
            actor_id="system",
            before_state=before,
            after_state=sheet.approval_status,
            audit_service_url=settings.audit_service_url,
        )
        return sheet

    async def submit_sheet(self, sheet_id, user_id: str = "account01"):
        sheet = await self._get_editable_sheet(sheet_id)
        if sheet.total < 0:
            raise ValidationError("Cannot submit billing sheet with negative total (PAY-04)")
        if not sheet.items:
            raise ValidationError("Mandatory service lines missing (PAY-04)")
        before = sheet.approval_status
        if sheet.approval_status == "CALCULATED":
            self.approval_sm.assert_transition(sheet.approval_status, "RECONCILED")
            sheet.approval_status = "RECONCILED"
        self.approval_sm.assert_transition(sheet.approval_status, "SUBMITTED")
        sheet.approval_status = "SUBMITTED"
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.workflow_service_url}/api/v1/workflows/start",
                json={
                    "document_type": "BILLING_SHEET",
                    "document_id": str(sheet.id),
                    "submitted_by": user_id,
                },
                headers={"X-User-Id": user_id},
            )
        if response.status_code >= 400:
            body = response.json()
            raise ValidationError(body.get("error", {}).get("message", "Workflow start failed"))
        await log_audit(
            entity_type="BILLING_SHEET",
            entity_id=str(sheet.id),
            action="SUBMIT",
            actor_id=user_id,
            before_state=before,
            after_state=sheet.approval_status,
            audit_service_url=settings.audit_service_url,
        )
        return sheet

    async def list_adjustments(self, sheet_id: UUID):
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        return await self.repo.list_adjustments(sheet_id)

    async def add_adjustment(self, sheet_id: UUID, payload: AdjustmentCreate, created_by: str = "account01"):
        sheet = await self._get_editable_sheet(sheet_id)
        if payload.adjustment_type == "QUANTITY":
            if not payload.service_code:
                raise ValidationError("service_code is required for QUANTITY adjustments")
            if payload.quantity_delta == 0:
                raise ValidationError("quantity_delta must be non-zero for QUANTITY adjustments")
        elif payload.amount_delta == 0:
            raise ValidationError("amount_delta must be non-zero for amount-based adjustments")
        adjustment = BillingAdjustment(
            billing_sheet_id=sheet.id,
            adjustment_type=payload.adjustment_type,
            service_code=payload.service_code,
            quantity_delta=payload.quantity_delta,
            amount_delta=payload.amount_delta,
            reason=payload.reason,
            created_by=created_by,
        )
        await self.repo.add_adjustment(adjustment)
        sheet.adjustments.append(adjustment)
        self._recalculate_totals(sheet)
        await log_audit(
            entity_type="BILLING_SHEET",
            entity_id=str(sheet.id),
            action="ADJUSTMENT_ADD",
            actor_id=created_by,
            after_state={
                "adjustment_id": str(adjustment.id),
                "type": adjustment.adjustment_type,
                "total": sheet.total,
            },
            note=payload.reason,
            audit_service_url=settings.audit_service_url,
        )
        return adjustment

    async def delete_adjustment(self, sheet_id: UUID, adjustment_id: UUID, actor_id: str = "account01"):
        sheet = await self._get_editable_sheet(sheet_id)
        adjustment = await self.repo.get_adjustment(adjustment_id)
        if not adjustment or adjustment.billing_sheet_id != sheet.id:
            raise NotFoundError("Adjustment not found")
        await self.repo.delete_adjustment(adjustment)
        sheet.adjustments = [a for a in sheet.adjustments if a.id != adjustment_id]
        self._recalculate_totals(sheet)
        await log_audit(
            entity_type="BILLING_SHEET",
            entity_id=str(sheet.id),
            action="ADJUSTMENT_DELETE",
            actor_id=actor_id,
            before_state={"adjustment_id": str(adjustment_id)},
            after_state={"total": sheet.total},
            audit_service_url=settings.audit_service_url,
        )
        return sheet

    async def apply_workflow_status(self, payload: WorkflowStatusCallback):
        from uuid import UUID

        sheet = await self.repo.get_by_id(UUID(payload.document_id))
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        if payload.workflow_status == "APPROVED":
            self.approval_sm.assert_transition(sheet.approval_status, "APPROVED")
            sheet.approval_status = "APPROVED"
        elif payload.workflow_status == "REJECTED":
            self.approval_sm.assert_transition(sheet.approval_status, "REJECTED")
            sheet.approval_status = "REJECTED"
        elif payload.workflow_status == "REVISION_REQUESTED":
            self.approval_sm.assert_transition(sheet.approval_status, "REVISION_REQUESTED")
            sheet.approval_status = "REVISION_REQUESTED"
        return sheet

    async def send_for_esign(self, sheet_id):
        """PAY-06: only after internal approval."""
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        if sheet.approval_status != "APPROVED":
            raise ValidationError("Billing sheet must be APPROVED before e-sign (PAY-06)")
        self.signing_sm.assert_transition(sheet.signing_status, "PENDING_SEND")
        sheet.signing_status = "PENDING_SEND"
        self.signing_sm.assert_transition(sheet.signing_status, "SIGNING")
        sheet.signing_status = "SIGNING"
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"{settings.esign_service_url}/api/v1/signing-sessions/start",
                json={"document_type": "BILLING_SHEET", "document_id": str(sheet.id)},
            )
        return sheet

    async def complete_esign(self, sheet_id, success: bool):
        """PAY-07: reflect signing result and allow retry on failure."""
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        if success:
            self.signing_sm.assert_transition(sheet.signing_status, "SIGNED")
            sheet.signing_status = "SIGNED"
        else:
            if sheet.signing_status == "SIGNING":
                self.signing_sm.assert_transition(sheet.signing_status, "FAILED")
                sheet.signing_status = "FAILED"
            if sheet.approval_status == "APPROVED":
                self.approval_sm.assert_transition(sheet.approval_status, "REVISION_REQUESTED")
                sheet.approval_status = "REVISION_REQUESTED"
        return sheet

    async def publish_sheet(self, sheet_id):
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        if sheet.signing_status != "SIGNED":
            raise ValidationError("Billing sheet must be signed before publish")
        self.issuance_sm.assert_transition(sheet.issuance_status, "ISSUED")
        sheet.issuance_status = "ISSUED"
        return sheet

    async def _get_editable_sheet(self, sheet_id):
        sheet = await self.repo.get_by_id(sheet_id)
        if not sheet:
            raise NotFoundError("Billing sheet not found")
        if sheet.approval_status in self.LOCKED_EDIT_STATUSES or sheet.signing_status in self.LOCKED_SIGNING:
            raise ValidationError("Approved/signed billing sheets cannot be edited directly (PAY-05)")
        return sheet

    async def _assert_contract_valid(self, contract_code: str, period: str):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{settings.contract_service_url}/api/v1/contracts")
        if response.status_code >= 400:
            raise ValidationError("Unable to validate contract (PAY-01)")
        contracts = response.json().get("data", [])
        period_end = _period_bounds(period)[1]
        match = next((c for c in contracts if c["code"] == contract_code), None)
        if not match:
            raise ValidationError(f"Contract not found: {contract_code} (PAY-01)")
        if match["status"] not in {"ACTIVE", "APPROVED"}:
            raise ValidationError(f"Contract {contract_code} is not valid for billing (PAY-01)")
        effective_to = date.fromisoformat(str(match["effective_to"]))
        if effective_to < period_end:
            raise ValidationError(f"Contract expired before billing period (PAY-01)")

    async def _assert_period_reconciled(self, period: str):
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{settings.operation_service_url}/api/v1/periods",
            )
        if response.status_code >= 400:
            raise ValidationError("Unable to validate billing period (PAY-02)")
        periods = response.json().get("data", [])
        match = next((p for p in periods if p["period"] == period), None)
        if not match:
            raise ValidationError(f"Billing period {period} not found (PAY-02)")
        if match["status"] not in {"RECONCILED", "LOCKED"}:
            raise ValidationError(f"Volume period {period} must be reconciled/locked before billing (PAY-02)")

    def _contract_service_prices(self, contract_code: str) -> dict[str, float]:
        seed = load_json_config("seed_data.json")
        prices = {}
        for item in seed.get("contract_service_prices", []):
            if item["contract_code"] == contract_code:
                prices[item["service_code"]] = float(item["unit_price"])
        return prices

    async def _fetch_volumes(self, contract_code: str, period: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{settings.operation_service_url}/api/v1/volumes",
                params={"contract_code": contract_code, "period": period},
            )
        if response.status_code >= 400:
            raise ValidationError("Failed to fetch volumes from operation-service")
        return response.json().get("data", [])

    async def _fetch_price_lists(self, contract_code: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{settings.pricing_service_url}/api/v1/price-lists",
                params={"contract_code": contract_code},
            )
        if response.status_code >= 400:
            raise ValidationError("Failed to fetch price lists from pricing-service")
        return response.json().get("data", [])

    async def _fetch_effective_appendices(self, contract_code: str, period_end: date) -> list[dict]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{settings.contract_service_url}/api/v1/internal/appendices",
                params={"contract_code": contract_code, "as_of": period_end.isoformat()},
            )
        if response.status_code >= 400:
            return []
        return response.json().get("data", [])

    def _recalculate_totals(self, sheet: BillingSheet) -> None:
        item_by_code = {item.service_code: item for item in sheet.items}
        base_quantities = {item.service_code: float(item.quantity) for item in sheet.items}
        for adj in sheet.adjustments:
            if adj.adjustment_type == "QUANTITY" and adj.service_code:
                base_quantities[adj.service_code] = base_quantities.get(adj.service_code, 0) + float(
                    adj.quantity_delta
                )
        for service_code, quantity in base_quantities.items():
            item = item_by_code.get(service_code)
            if item:
                item.quantity = quantity
                item.amount = float(Decimal(str(quantity)) * Decimal(str(item.unit_price)))
        subtotal = Decimal("0")
        for item in sheet.items:
            subtotal += Decimal(str(item.amount))
        for adj in sheet.adjustments:
            if adj.adjustment_type in {"CREDIT", "DEBIT", "MANUAL"}:
                delta = Decimal(str(adj.amount_delta))
                if adj.adjustment_type == "CREDIT":
                    subtotal -= abs(delta)
                else:
                    subtotal += delta
        if subtotal < 0:
            raise ValidationError("Total amount cannot be negative after adjustments (PAY-04)")
        tax_rate = Decimal(str(sheet.tax_rate))
        tax_amount = subtotal * tax_rate
        sheet.subtotal = float(subtotal)
        sheet.tax_amount = float(tax_amount)
        sheet.total = float(subtotal + tax_amount)
