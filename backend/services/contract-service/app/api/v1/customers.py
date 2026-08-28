from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.deps import RequestUser, get_request_user
from udpt_common.responses import SuccessResponse

from app.core.config import settings
from app.core.deps import get_db
from app.repositories.customer_repo import CustomerRepository
from app.core.config import settings
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerOverview, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


def _service(session: AsyncSession) -> CustomerService:
    return CustomerService(CustomerRepository(session))


@router.get("", response_model=SuccessResponse[list[CustomerOut]])
async def list_customers(session: AsyncSession = Depends(get_db)):
    data = await _service(session).list_customers()
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[CustomerOut])
async def create_customer(payload: CustomerCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).create_customer(payload)
    return SuccessResponse(data=data, message="Customer created")


@router.patch("/{customer_id}", response_model=SuccessResponse[CustomerOut])
async def update_customer(
    customer_id: UUID, payload: CustomerUpdate, session: AsyncSession = Depends(get_db)
):
    data = await _service(session).update_customer(customer_id, payload)
    return SuccessResponse(data=data, message="Customer updated")


@router.post("/{customer_id}/suspend", response_model=SuccessResponse[CustomerOut])
async def suspend_customer(customer_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).suspend_customer(customer_id)
    return SuccessResponse(data=data, message="Customer suspended")


@router.get("/{customer_id}/overview", response_model=SuccessResponse[CustomerOverview])
async def customer_overview(customer_id: UUID, session: AsyncSession = Depends(get_db)):
    raw = await _service(session).get_overview(
        customer_id,
        billing_url=settings.billing_service_url,
        pricing_url=settings.pricing_service_url,
    )
    return SuccessResponse(data=CustomerOverview.model_validate(raw))
