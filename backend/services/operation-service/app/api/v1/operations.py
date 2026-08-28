from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.operation_repo import PeriodRepository, VolumeRepository
from app.schemas.operation import PeriodCreate, PeriodOut, VolumeCreate, VolumeOut
from app.services.operation_service import PeriodService, VolumeService

router = APIRouter(tags=["Operations"])


def _period_service(session: AsyncSession) -> PeriodService:
    return PeriodService(PeriodRepository(session))


def _volume_service(session: AsyncSession) -> VolumeService:
    return VolumeService(VolumeRepository(session), PeriodRepository(session))


@router.get("/periods", response_model=SuccessResponse[list[PeriodOut]])
async def list_periods(session: AsyncSession = Depends(get_db)):
    data = await _period_service(session).list_periods()
    return SuccessResponse(data=data)


@router.post("/periods", response_model=SuccessResponse[PeriodOut])
async def create_period(payload: PeriodCreate, session: AsyncSession = Depends(get_db)):
    data = await _period_service(session).create_period(payload)
    return SuccessResponse(data=data, message="Period created")


@router.post("/periods/{period}/lock", response_model=SuccessResponse[PeriodOut])
async def lock_period(period: str, session: AsyncSession = Depends(get_db)):
    data = await _period_service(session).lock_period(period)
    return SuccessResponse(data=data, message="Period locked")


@router.get("/volumes", response_model=SuccessResponse[list[VolumeOut]])
async def list_volumes(
    contract_code: str | None = Query(None),
    period: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
):
    data = await _volume_service(session).list_volumes(contract_code=contract_code, period=period)
    return SuccessResponse(data=data)


@router.post("/volumes", response_model=SuccessResponse[VolumeOut])
async def create_volume(payload: VolumeCreate, session: AsyncSession = Depends(get_db)):
    data = await _volume_service(session).create_volume(payload)
    return SuccessResponse(data=data, message="Volume record created")
