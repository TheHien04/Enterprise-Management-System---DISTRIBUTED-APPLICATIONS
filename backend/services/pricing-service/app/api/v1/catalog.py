from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.catalog_repo import ServiceCatalogRepository
from app.schemas.catalog import ServiceCatalogCreate, ServiceCatalogOut
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/catalog/services", tags=["Service Catalog"])


def _service(session: AsyncSession) -> CatalogService:
    return CatalogService(ServiceCatalogRepository(session))


@router.get("", response_model=SuccessResponse[list[ServiceCatalogOut]])
async def list_services(session: AsyncSession = Depends(get_db)):
    data = await _service(session).list_services()
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[ServiceCatalogOut])
async def create_service(payload: ServiceCatalogCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).create_service(payload)
    return SuccessResponse(data=data, message="Service created")
