from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PriceListItemCreate(BaseModel):
    service_code: str
    unit_price: float = Field(ge=0)


class PriceListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    service_code: str
    unit_price: float


class PriceListCreate(BaseModel):
    contract_code: str
    version: str
    effective_from: date
    effective_to: date
    items: list[PriceListItemCreate] = Field(min_length=1)


class PriceListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contract_code: str
    version: str
    effective_from: date
    effective_to: date
    status: str
    items: list[PriceListItemOut]
