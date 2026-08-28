from datetime import date

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.deps import RequestUser, get_request_user
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.customer_repo import AppendixRepository, ContractRepository, CustomerRepository
from app.schemas.customer import AppendixOut, WorkflowStatusCallback
from app.services.customer_service import AppendixService, ContractService

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


@router.get("/appendices", response_model=SuccessResponse[list[AppendixOut]])
async def list_effective_appendices(
    contract_code: str = Query(...),
    as_of: date = Query(...),
    session: AsyncSession = Depends(get_db),
):
    repo = AppendixRepository(session)
    data = await repo.list_effective_by_contract_code(contract_code, as_of)
    return SuccessResponse(data=data)


@router.post("/workflow-status", response_model=SuccessResponse[dict])
async def workflow_status_callback(
    payload: WorkflowStatusCallback,
    session: AsyncSession = Depends(get_db),
    x_internal_service: str | None = Header(default=None),
):
    if x_internal_service != "workflow-service":
        from udpt_common.exceptions import ForbiddenError

        raise ForbiddenError("Internal endpoint only")
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    if payload.document_type == "CONTRACT":
        contract = await service.apply_workflow_status(payload)
        return SuccessResponse(
            data={"id": str(contract.id), "status": contract.status},
            message="Contract status synced from workflow",
        )
    if payload.document_type == "APPENDIX":
        from uuid import UUID

        appendix = await AppendixService(
            AppendixRepository(session), ContractRepository(session)
        ).apply_workflow_status(payload)
        return SuccessResponse(
            data={"id": str(appendix.id), "status": appendix.status},
            message="Appendix status synced from workflow",
        )
    raise ForbiddenError("Unsupported document type")
