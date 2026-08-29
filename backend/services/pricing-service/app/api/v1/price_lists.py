from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.price_list_repo import PriceListRepository
from app.schemas.price_list import PriceListCreate, PriceListOut, PriceListUpdate
from app.services.price_list_service import PriceListService

router = APIRouter(prefix="/price-lists", tags=["Price Lists"])


def _service(session: AsyncSession) -> PriceListService:
    return PriceListService(PriceListRepository(session))


@router.get("", response_model=SuccessResponse[list[PriceListOut]])
async def list_price_lists(
    contract_code: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).list_price_lists(contract_code=contract_code)
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[PriceListOut])
async def create_price_list(payload: PriceListCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).create_price_list(payload)
    return SuccessResponse(data=data, message="Price list created")


@router.get("/{price_list_id}", response_model=SuccessResponse[PriceListOut])
async def get_price_list(price_list_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).get_price_list(price_list_id)
    return SuccessResponse(data=data)


@router.patch("/{price_list_id}", response_model=SuccessResponse[PriceListOut])
async def update_price_list(
    price_list_id: UUID,
    payload: PriceListUpdate,
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).update_price_list(price_list_id, payload)
    return SuccessResponse(data=data, message="Price list updated")


@router.post("/{price_list_id}/submit", response_model=SuccessResponse[PriceListOut])
async def submit_price_list(price_list_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).submit_price_list(price_list_id)
    return SuccessResponse(data=data, message="Price list submitted")
