from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PeriodCreate(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


class PeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    period: str
    status: str


class VolumeCreate(BaseModel):
    contract_code: str
    service_code: str
    quantity: float = Field(gt=0)
    record_date: date
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


class VolumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contract_code: str
    service_code: str
    quantity: float
    record_date: date
    period: str
