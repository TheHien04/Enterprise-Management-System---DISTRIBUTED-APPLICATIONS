from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.price_list_repo import PriceListRepository
from app.schemas.internal import WorkflowStatusCallback
from app.services.price_list_service import PriceListService

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.post("/workflow-status", response_model=SuccessResponse[dict])
async def workflow_status(payload: WorkflowStatusCallback, session: AsyncSession = Depends(get_db)):
    data = await PriceListService(PriceListRepository(session)).apply_workflow_status(payload)
    return SuccessResponse(data={"id": str(data.id), "status": data.status})
