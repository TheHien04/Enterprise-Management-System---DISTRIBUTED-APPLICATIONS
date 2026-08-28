from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name: str
    tax_code: str | None = None
    address: str | None = None
    representative: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    customer_type: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    tax_code: str | None = None
    address: str | None = None
    representative: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    customer_type: str | None = None
    status: str | None = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    tax_code: str | None
    address: str | None
    representative: str | None
    contact_email: str | None
    contact_phone: str | None
    customer_type: str | None
    status: str


class ContractCreate(BaseModel):
    code: str
    customer_id: UUID
    title: str = ""
    effective_from: date
    effective_to: date
    total_value: float = 0
    payment_terms: str | None = None
    service_terms: str | None = None


class ContractUpdate(BaseModel):
    title: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    total_value: float | None = None
    payment_terms: str | None = None
    service_terms: str | None = None


class ContractOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    customer_id: UUID
    title: str
    effective_from: date
    effective_to: date
    total_value: float
    payment_terms: str | None
    service_terms: str | None
    status: str
    current_assignee_role: str | None
    workflow_id: UUID | None


class AppendixCreate(BaseModel):
    code: str
    contract_id: UUID
    title: str
    change_summary: str | None = None
    effective_date: date
    field_name: str | None = None
    before_value: float | None = None
    after_value: float | None = None


class AppendixOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    contract_id: UUID
    title: str
    change_summary: str | None
    effective_date: date
    status: str
    field_name: str | None
    before_value: float | None
    after_value: float | None
    workflow_id: UUID | None


class WorkflowStatusCallback(BaseModel):
    document_type: str
    document_id: str
    workflow_status: str


class ContractExtendRequest(BaseModel):
    new_effective_to: date


class AttachmentCreate(BaseModel):
    file_name: str = "contract.pdf"
    file_url: str = "minio://contracts/placeholder.pdf"


class CustomerOverview(BaseModel):
    customer: CustomerOut
    contracts: list[ContractOut]
    contract_codes: list[str]
    price_list_count: int = 0
    billing_sheet_count: int = 0
