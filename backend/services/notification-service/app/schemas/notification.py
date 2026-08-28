from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    body: str
    event_type: str | None = None
    reference_id: str | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    title: str
    body: str
    read: bool
    event_type: str | None
    reference_id: str | None
    created_at: datetime
