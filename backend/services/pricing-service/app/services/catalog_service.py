from udpt_common.config_loader import load_json_config
from udpt_common.exceptions import ConflictError

from app.models.entities import ServiceCatalog
from app.repositories.catalog_repo import ServiceCatalogRepository
from app.schemas.catalog import ServiceCatalogCreate


class CatalogService:
    def __init__(self, repo: ServiceCatalogRepository):
        self.repo = repo

    async def list_services(self):
        return await self.repo.list_all()

    async def create_service(self, payload: ServiceCatalogCreate):
        if await self.repo.get_by_code(payload.code):
            raise ConflictError(f"Service code already exists: {payload.code}")
        service = ServiceCatalog(**payload.model_dump())
        return await self.repo.add(service)


async def seed_catalog(session):
    repo = ServiceCatalogRepository(session)
    if await repo.list_all():
        return
    seed = load_json_config("seed_data.json")
    for item in seed.get("services", []):
        await repo.add(ServiceCatalog(code=item["code"], name=item["name"], unit=item["unit"]))
