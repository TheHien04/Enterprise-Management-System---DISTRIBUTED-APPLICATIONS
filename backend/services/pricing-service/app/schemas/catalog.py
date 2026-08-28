from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ServiceCatalogCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name: str
    unit: str


class ServiceCatalogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    unit: str
