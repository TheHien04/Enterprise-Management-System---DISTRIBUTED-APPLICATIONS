from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import PriceList


class PriceListRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self, contract_code: str | None = None) -> list[PriceList]:
        stmt = select(PriceList).options(selectinload(PriceList.items)).order_by(PriceList.effective_from.desc())
        if contract_code:
            stmt = stmt.where(PriceList.contract_code == contract_code)
        result = await self.session.scalars(stmt)
        return list(result)

    async def get_by_id(self, price_list_id: UUID) -> PriceList | None:
        result = await self.session.scalars(
            select(PriceList).options(selectinload(PriceList.items)).where(PriceList.id == price_list_id)
        )
        return result.first()

    async def list_by_contract(self, contract_code: str) -> list[PriceList]:
        return await self.list_all(contract_code=contract_code)

    async def add(self, price_list: PriceList) -> PriceList:
        self.session.add(price_list)
        await self.session.flush()
        return price_list
