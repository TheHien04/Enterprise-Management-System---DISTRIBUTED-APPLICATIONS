from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.exceptions import ForbiddenError
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.billing_repo import BillingSheetRepository
from app.schemas.billing import WorkflowStatusCallback
from app.services.billing_service import BillingSheetService

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


@router.post("/workflow-status", response_model=SuccessResponse[dict])
async def workflow_status_callback(
    payload: WorkflowStatusCallback,
    session: AsyncSession = Depends(get_db),
    x_internal_service: str | None = Header(default=None),
):
    if x_internal_service != "workflow-service":
        raise ForbiddenError("Internal endpoint only")
    sheet = await BillingSheetService(BillingSheetRepository(session)).apply_workflow_status(payload)
    return SuccessResponse(
        data={"id": str(sheet.id), "approval_status": sheet.approval_status},
        message="Billing sheet status synced from workflow",
    )
