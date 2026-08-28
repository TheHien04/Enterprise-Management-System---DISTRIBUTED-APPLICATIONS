from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import BillingAdjustment, BillingSheet


class BillingSheetRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _sheet_options(self):
        return (
            selectinload(BillingSheet.items),
            selectinload(BillingSheet.adjustments),
        )

    async def list_all(self, contract_code: str | None = None, period: str | None = None) -> list[BillingSheet]:
        stmt = (
            select(BillingSheet)
            .options(*self._sheet_options())
            .order_by(BillingSheet.created_at.desc())
        )
        if contract_code:
            stmt = stmt.where(BillingSheet.contract_code == contract_code)
        if period:
            stmt = stmt.where(BillingSheet.period == period)
        result = await self.session.scalars(stmt)
        return list(result)

    async def get_by_id(self, sheet_id: UUID) -> BillingSheet | None:
        result = await self.session.scalars(
            select(BillingSheet).options(*self._sheet_options()).where(BillingSheet.id == sheet_id)
        )
        return result.first()

    async def get_by_contract_period(self, contract_code: str, period: str) -> BillingSheet | None:
        result = await self.session.scalars(
            select(BillingSheet)
            .options(*self._sheet_options())
            .where(BillingSheet.contract_code == contract_code, BillingSheet.period == period)
        )
        return result.first()

    async def add(self, sheet: BillingSheet) -> BillingSheet:
        self.session.add(sheet)
        await self.session.flush()
        reloaded = await self.get_by_id(sheet.id)
        return reloaded or sheet

    async def list_adjustments(self, sheet_id: UUID) -> list[BillingAdjustment]:
        result = await self.session.scalars(
            select(BillingAdjustment)
            .where(BillingAdjustment.billing_sheet_id == sheet_id)
            .order_by(BillingAdjustment.created_at)
        )
        return list(result)

    async def get_adjustment(self, adjustment_id: UUID) -> BillingAdjustment | None:
        return await self.session.get(BillingAdjustment, adjustment_id)

    async def add_adjustment(self, adjustment: BillingAdjustment) -> BillingAdjustment:
        self.session.add(adjustment)
        await self.session.flush()
        return adjustment

    async def delete_adjustment(self, adjustment: BillingAdjustment) -> None:
        await self.session.delete(adjustment)
        await self.session.flush()
