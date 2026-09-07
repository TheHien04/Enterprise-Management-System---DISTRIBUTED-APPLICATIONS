from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.billing_repo import BillingSheetRepository
from app.schemas.billing import (
    AdjustmentCreate,
    AdjustmentOut,
    BillingSheetCreate,
    BillingSheetOut,
)
from app.services.billing_service import BillingSheetService

router = APIRouter(prefix="/billing-sheets", tags=["Billing Sheets"])


def _service(session: AsyncSession) -> BillingSheetService:
    return BillingSheetService(BillingSheetRepository(session))


@router.get("", response_model=SuccessResponse[list[BillingSheetOut]])
async def list_billing_sheets(
    contract_code: str | None = Query(None),
    period: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).list_sheets(contract_code=contract_code, period=period)
    return SuccessResponse(data=data)


@router.post("/generate", response_model=SuccessResponse[BillingSheetOut])
async def generate_billing_sheet(
    contract_code: str = Query(...),
    period: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    tax_rate: float = Query(0, ge=0),
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).generate_sheet(contract_code, period, tax_rate=tax_rate)
    return SuccessResponse(data=data, message="Billing sheet generated")


@router.get("/{sheet_id}", response_model=SuccessResponse[BillingSheetOut])
async def get_billing_sheet(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).get_sheet(sheet_id)
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[BillingSheetOut])
async def create_billing_sheet(payload: BillingSheetCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).create_sheet(payload)
    return SuccessResponse(data=data, message="Billing sheet created")


@router.post("/{sheet_id}/reconcile", response_model=SuccessResponse[BillingSheetOut])
async def reconcile_billing_sheet(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).reconcile_sheet(sheet_id)
    return SuccessResponse(data=data, message="Billing sheet reconciled")


@router.post("/{sheet_id}/submit", response_model=SuccessResponse[BillingSheetOut])
async def submit_billing_sheet(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).submit_sheet(sheet_id)
    return SuccessResponse(data=data, message="Billing sheet submitted")


@router.post("/{sheet_id}/send-esign", response_model=SuccessResponse[BillingSheetOut])
async def send_billing_esign(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).send_for_esign(sheet_id)
    return SuccessResponse(data=data, message="Sent for e-sign")


@router.post("/{sheet_id}/complete-esign", response_model=SuccessResponse[BillingSheetOut])
async def complete_billing_esign(
    sheet_id: UUID,
    success: bool = Query(True),
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).complete_esign(sheet_id, success=success)
    return SuccessResponse(data=data, message="E-sign completed")


@router.post("/{sheet_id}/publish", response_model=SuccessResponse[BillingSheetOut])
async def publish_billing_sheet(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).publish_sheet(sheet_id)
    return SuccessResponse(data=data, message="Billing sheet issued")


@router.get("/{sheet_id}/adjustments", response_model=SuccessResponse[list[AdjustmentOut]])
async def list_billing_adjustments(sheet_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).list_adjustments(sheet_id)
    return SuccessResponse(data=data)


@router.post("/{sheet_id}/adjustments", response_model=SuccessResponse[AdjustmentOut])
async def add_billing_adjustment(
    sheet_id: UUID,
    payload: AdjustmentCreate,
    session: AsyncSession = Depends(get_db),
    x_user_id: str | None = Header(default="account01"),
):
    data = await _service(session).add_adjustment(sheet_id, payload, created_by=x_user_id or "account01")
    return SuccessResponse(data=data, message="Adjustment added")


@router.delete("/{sheet_id}/adjustments/{adjustment_id}", response_model=SuccessResponse[BillingSheetOut])
async def delete_billing_adjustment(
    sheet_id: UUID,
    adjustment_id: UUID,
    session: AsyncSession = Depends(get_db),
    x_user_id: str | None = Header(default="account01"),
):
    data = await _service(session).delete_adjustment(
        sheet_id, adjustment_id, actor_id=x_user_id or "account01"
    )
    return SuccessResponse(data=data, message="Adjustment removed")
