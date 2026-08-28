from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import ServiceCatalog


class ServiceCatalogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[ServiceCatalog]:
        result = await self.session.scalars(select(ServiceCatalog).order_by(ServiceCatalog.code))
        return list(result)

    async def get_by_code(self, code: str) -> ServiceCatalog | None:
        result = await self.session.scalars(select(ServiceCatalog).where(ServiceCatalog.code == code))
        return result.first()

    async def add(self, service: ServiceCatalog) -> ServiceCatalog:
        self.session.add(service)
        await self.session.flush()
        return service
