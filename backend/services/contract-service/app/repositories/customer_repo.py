from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import Contract, ContractAppendix, Customer


class CustomerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[Customer]:
        result = await self.session.scalars(select(Customer).order_by(Customer.code))
        return list(result)

    async def get_by_id(self, customer_id: UUID) -> Customer | None:
        return await self.session.get(Customer, customer_id)

    async def get_by_code(self, code: str) -> Customer | None:
        result = await self.session.scalars(select(Customer).where(Customer.code == code))
        return result.first()

    async def add(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        return customer


class ContractRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self, customer_id: UUID | None = None) -> list[Contract]:
        stmt = select(Contract).order_by(Contract.code)
        if customer_id:
            stmt = stmt.where(Contract.customer_id == customer_id)
        result = await self.session.scalars(stmt)
        return list(result)

    async def get_by_id(self, contract_id: UUID) -> Contract | None:
        result = await self.session.scalars(
            select(Contract).options(selectinload(Contract.attachments)).where(Contract.id == contract_id)
        )
        return result.first()

    async def get_by_code(self, code: str) -> Contract | None:
        result = await self.session.scalars(select(Contract).where(Contract.code == code))
        return result.first()

    async def add(self, contract: Contract) -> Contract:
        self.session.add(contract)
        await self.session.flush()
        return contract


class AppendixRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_contract(self, contract_id: UUID) -> list[ContractAppendix]:
        result = await self.session.scalars(
            select(ContractAppendix).where(ContractAppendix.contract_id == contract_id)
        )
        return list(result)

    async def get_by_id(self, appendix_id: UUID) -> ContractAppendix | None:
        return await self.session.get(ContractAppendix, appendix_id)

    async def add(self, appendix: ContractAppendix) -> ContractAppendix:
        self.session.add(appendix)
        await self.session.flush()
        return appendix

    async def list_effective_by_contract_code(self, contract_code: str, as_of: date) -> list[ContractAppendix]:
        result = await self.session.scalars(
            select(ContractAppendix)
            .join(Contract, ContractAppendix.contract_id == Contract.id)
            .where(
                Contract.code == contract_code,
                ContractAppendix.status.in_(["EFFECTIVE", "APPROVED"]),
                ContractAppendix.effective_date <= as_of,
            )
            .order_by(ContractAppendix.effective_date)
        )
        return list(result)
