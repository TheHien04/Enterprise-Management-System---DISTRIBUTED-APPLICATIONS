from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.deps import RequestUser, get_request_user
from udpt_common.responses import SuccessResponse

from app.core.config import settings
from app.core.deps import get_db
from app.repositories.customer_repo import (
    AppendixRepository,
    ContractRepository,
    CustomerRepository,
)
from app.schemas.customer import (
    AppendixCreate,
    AppendixOut,
    AttachmentCreate,
    ContractCreate,
    ContractExtendRequest,
    ContractOut,
    ContractUpdate,
)
from app.services.customer_service import AppendixService, ContractService

router = APIRouter(prefix="/contracts", tags=["Contracts"])


async def _enrich_contracts(session: AsyncSession, contracts) -> list[ContractOut]:
    customers = {c.id: c for c in await CustomerRepository(session).list_all()}
    enriched: list[ContractOut] = []
    for contract in contracts:
        out = ContractOut.model_validate(contract)
        customer = customers.get(contract.customer_id)
        if customer:
            out = out.model_copy(update={"customer_code": customer.code, "customer_name": customer.name})
        enriched.append(out)
    return enriched


@router.get("", response_model=SuccessResponse[list[ContractOut]])
async def list_contracts(
    customer_id: UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    repo = ContractRepository(session)
    data = await _enrich_contracts(session, await repo.list_all(customer_id))
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[ContractOut])
async def create_contract(
    payload: ContractCreate,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.create_contract(payload, user)
    return SuccessResponse(data=data, message="Contract created")


@router.patch("/{contract_id}", response_model=SuccessResponse[ContractOut])
async def update_contract(
    contract_id: UUID,
    payload: ContractUpdate,
    session: AsyncSession = Depends(get_db),
):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.update_contract(contract_id, payload)
    return SuccessResponse(data=data, message="Contract updated")


@router.post("/{contract_id}/submit", response_model=SuccessResponse[ContractOut])
async def submit_contract(
    contract_id: UUID,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
    x_idempotency_key: str | None = Header(default=None),
):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.submit_contract(contract_id, user, idempotency_key=x_idempotency_key)
    return SuccessResponse(data=data, message="Contract submitted for approval")


@router.post("/{contract_id}/cancel", response_model=SuccessResponse[ContractOut])
async def cancel_contract(contract_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.cancel_contract(contract_id)
    return SuccessResponse(data=data, message="Contract cancelled")


@router.post("/{contract_id}/reopen-revision", response_model=SuccessResponse[ContractOut])
async def reopen_rejected_contract(contract_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.reopen_rejected_contract(contract_id)
    return SuccessResponse(data=data, message="Contract reopened for revision (CTR-04)")


@router.post("/{contract_id}/return-to-draft", response_model=SuccessResponse[ContractOut])
async def return_to_draft(contract_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.return_revised_to_draft(contract_id)
    return SuccessResponse(data=data, message="Contract returned to draft")


@router.post("/activate-due", response_model=SuccessResponse[list[ContractOut]])
async def activate_due_contracts(session: AsyncSession = Depends(get_db)):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.activate_due_contracts()
    return SuccessResponse(data=data, message="Due contracts activated/expired (CTR-05)")


@router.get("/{contract_id}/appendices", response_model=SuccessResponse[list[AppendixOut]])
async def list_appendices(contract_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AppendixService(AppendixRepository(session), ContractRepository(session))
    data = await service.list_appendices(contract_id)
    return SuccessResponse(data=data)


@router.post("/{contract_id}/attachments", response_model=SuccessResponse[dict])
async def add_attachment(
    contract_id: UUID,
    payload: AttachmentCreate,
    session: AsyncSession = Depends(get_db),
):
    from udpt_common.storage import upload_demo_file

    from app.models.entities import ContractAttachment

    contract = await ContractRepository(session).get_by_id(contract_id)
    if not contract:
        from udpt_common.exceptions import NotFoundError

        raise NotFoundError("Contract not found")

    try:
        file_url = upload_demo_file(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket,
            prefix=f"contracts/{contract.code}",
            file_name=payload.file_name,
            secure=settings.minio_secure,
        )
    except Exception:
        file_url = payload.file_url

    attachment = ContractAttachment(
        contract_id=contract_id,
        file_name=payload.file_name,
        file_url=file_url,
    )
    session.add(attachment)
    await session.flush()
    return SuccessResponse(
        data={"id": str(attachment.id), "file_name": attachment.file_name, "file_url": attachment.file_url},
        message="Attachment uploaded",
    )


@router.post("/{contract_id}/attachments/upload", response_model=SuccessResponse[dict])
async def upload_attachment_file(
    contract_id: UUID,
    session: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    from udpt_common.storage import upload_demo_file

    from app.models.entities import ContractAttachment

    contract = await ContractRepository(session).get_by_id(contract_id)
    if not contract:
        from udpt_common.exceptions import NotFoundError

        raise NotFoundError("Contract not found")
    content = await file.read()
    file_name = file.filename or "contract.pdf"
    file_url = upload_demo_file(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
        prefix=f"contracts/{contract.code}",
        file_name=file_name,
        data=content,
        secure=settings.minio_secure,
    )
    attachment = ContractAttachment(contract_id=contract_id, file_name=file_name, file_url=file_url)
    session.add(attachment)
    await session.flush()
    return SuccessResponse(
        data={"id": str(attachment.id), "file_name": attachment.file_name, "file_url": attachment.file_url},
        message="Attachment uploaded",
    )


@router.post("/{contract_id}/extend", response_model=SuccessResponse[ContractOut])
async def extend_contract(
    contract_id: UUID,
    payload: ContractExtendRequest,
    session: AsyncSession = Depends(get_db),
):
    service = ContractService(ContractRepository(session), CustomerRepository(session))
    data = await service.extend_contract(contract_id, payload.new_effective_to)
    return SuccessResponse(data=data, message="Contract extended")


@router.post("/appendices/{appendix_id}/submit", response_model=SuccessResponse[AppendixOut])
async def submit_appendix(
    appendix_id: UUID,
    session: AsyncSession = Depends(get_db),
    user: RequestUser = Depends(get_request_user),
):
    service = AppendixService(AppendixRepository(session), ContractRepository(session))
    data = await service.submit_appendix(appendix_id, user)
    return SuccessResponse(data=data, message="Appendix submitted for approval")


@router.post("/appendices", response_model=SuccessResponse[AppendixOut])
async def create_appendix(payload: AppendixCreate, session: AsyncSession = Depends(get_db)):
    service = AppendixService(AppendixRepository(session), ContractRepository(session))
    data = await service.create_appendix(payload)
    return SuccessResponse(data=data, message="Appendix created")
