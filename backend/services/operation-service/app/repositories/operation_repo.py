from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import BillingPeriod, VolumeRecord


class PeriodRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[BillingPeriod]:
        result = await self.session.scalars(select(BillingPeriod).order_by(BillingPeriod.period.desc()))
        return list(result)

    async def get_by_period(self, period: str) -> BillingPeriod | None:
        result = await self.session.scalars(select(BillingPeriod).where(BillingPeriod.period == period))
        return result.first()

    async def add(self, billing_period: BillingPeriod) -> BillingPeriod:
        self.session.add(billing_period)
        await self.session.flush()
        return billing_period


class VolumeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(
        self, contract_code: str | None = None, period: str | None = None
    ) -> list[VolumeRecord]:
        stmt = select(VolumeRecord).order_by(VolumeRecord.record_date)
        if contract_code:
            stmt = stmt.where(VolumeRecord.contract_code == contract_code)
        if period:
            stmt = stmt.where(VolumeRecord.period == period)
        result = await self.session.scalars(stmt)
        return list(result)

    async def add(self, record: VolumeRecord) -> VolumeRecord:
        self.session.add(record)
        await self.session.flush()
        return record
