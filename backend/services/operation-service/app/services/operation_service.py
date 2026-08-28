from datetime import UTC, datetime

from udpt_common.audit_helper import log_audit
from udpt_common.config_loader import load_json_config
from udpt_common.exceptions import ConflictError, NotFoundError, ValidationError

from app.core.config import settings
from app.domain.state_registry import get_volume_period_state_machine
from app.models.entities import BillingPeriod, VolumeRecord
from app.repositories.operation_repo import PeriodRepository, VolumeRepository
from app.schemas.operation import PeriodCreate, VolumeCreate


class PeriodService:
    def __init__(self, repo: PeriodRepository):
        self.repo = repo
        self.state_machine = get_volume_period_state_machine()

    async def list_periods(self):
        return await self.repo.list_all()

    async def create_period(self, payload: PeriodCreate):
        if await self.repo.get_by_period(payload.period):
            raise ConflictError(f"Period already exists: {payload.period}")
        period = BillingPeriod(period=payload.period, status="OPEN")
        return await self.repo.add(period)

    async def lock_period(self, period: str):
        billing_period = await self.repo.get_by_period(period)
        if not billing_period:
            raise NotFoundError("Period not found")
        if billing_period.status == "LOCKED":
            raise ConflictError("Period is already locked")
        if billing_period.status == "OPEN":
            self.state_machine.assert_transition(billing_period.status, "RECONCILED")
            billing_period.status = "RECONCILED"
        self.state_machine.assert_transition(billing_period.status, "LOCKED")
        billing_period.status = "LOCKED"
        billing_period.locked_at = datetime.now(UTC)
        await log_audit(
            entity_type="BILLING_PERIOD",
            entity_id=period,
            action="LOCK",
            actor_id="system",
            after_state=billing_period.status,
            audit_service_url=settings.audit_service_url,
        )
        return billing_period


class VolumeService:
    def __init__(self, volume_repo: VolumeRepository, period_repo: PeriodRepository):
        self.volume_repo = volume_repo
        self.period_repo = period_repo

    async def list_volumes(self, contract_code: str | None = None, period: str | None = None):
        return await self.volume_repo.list_all(contract_code=contract_code, period=period)

    async def create_volume(self, payload: VolumeCreate):
        billing_period = await self.period_repo.get_by_period(payload.period)
        if not billing_period:
            raise ValidationError(f"Billing period not found: {payload.period}")
        if billing_period.status == "LOCKED":
            raise ValidationError("Cannot add volumes to a locked period")
        record = VolumeRecord(**payload.model_dump())
        record = await self.volume_repo.add(record)
        await log_audit(
            entity_type="VOLUME",
            entity_id=str(record.id),
            action="CREATE",
            actor_id="system",
            after_state={
                "contract_code": record.contract_code,
                "period": record.period,
                "service_code": record.service_code,
                "quantity": float(record.quantity),
            },
            audit_service_url=settings.audit_service_url,
        )
        return record


async def _seed_volume_block(session, period_repo, volume_repo, volumes_seed: dict) -> None:
    period_str = volumes_seed["period"]
    if not await period_repo.get_by_period(period_str):
        await period_repo.add(BillingPeriod(period=period_str, status="RECONCILED"))
    existing = await volume_repo.list_all(contract_code=volumes_seed["contract_code"], period=period_str)
    if existing:
        return
    for item in volumes_seed.get("records", []):
        await volume_repo.add(
            VolumeRecord(
                contract_code=volumes_seed["contract_code"],
                service_code=item["service_code"],
                quantity=item["quantity"],
                record_date=datetime.strptime(item["date"], "%Y-%m-%d").date(),
                period=period_str,
            )
        )


async def seed_operation_data(session):
    period_repo = PeriodRepository(session)
    volume_repo = VolumeRepository(session)
    seed = load_json_config("seed_data.json")
    for key in ("volumes_aug_2026", "volumes_sep_2026"):
        volumes_seed = seed.get(key)
        if volumes_seed:
            await _seed_volume_block(session, period_repo, volume_repo, volumes_seed)
