from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SigningSessionStartRequest(BaseModel):
    document_type: str
    document_id: str


class SigningSessionCompleteRequest(BaseModel):
    success: bool = True


class SigningSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_type: str
    document_id: str
    status: str
    provider_ref: str | None
    created_at: datetime
    updated_at: datetime
