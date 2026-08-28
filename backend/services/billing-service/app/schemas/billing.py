from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BillingSheetItemCreate(BaseModel):
    service_code: str
    quantity: float = Field(ge=0)
    unit_price: float = Field(ge=0)


class BillingSheetItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    service_code: str
    quantity: float
    unit_price: float
    snapshot_unit_price: float
    amount: float


class AdjustmentCreate(BaseModel):
    adjustment_type: str = Field(pattern=r"^(CREDIT|DEBIT|QUANTITY|MANUAL)$")
    service_code: str | None = None
    quantity_delta: float = 0
    amount_delta: float = 0
    reason: str = Field(min_length=1)


class AdjustmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    billing_sheet_id: UUID
    adjustment_type: str
    service_code: str | None
    quantity_delta: float
    amount_delta: float
    reason: str
    created_by: str
    created_at: datetime


class BillingSheetCreate(BaseModel):
    contract_code: str
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
    tax_rate: float = Field(default=0, ge=0)
    items: list[BillingSheetItemCreate] = Field(min_length=1)


class BillingSheetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contract_code: str
    period: str
    tax_rate: float
    subtotal: float
    tax_amount: float
    total: float
    approval_status: str
    signing_status: str
    issuance_status: str
    items: list[BillingSheetItemOut]
    adjustments: list[AdjustmentOut] = []


class WorkflowStatusCallback(BaseModel):
    document_type: str
    document_id: str
    workflow_status: str
