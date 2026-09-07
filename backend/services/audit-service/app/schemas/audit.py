from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    entity_type: str
    entity_id: str
    action: str
    actor_id: str
    before_state: dict | None = None
    after_state: dict | None = None
    note: str | None = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entity_type: str
    entity_id: str
    action: str
    actor_id: str
    before_state: dict | None
    after_state: dict | None
    note: str | None
    created_at: datetime
