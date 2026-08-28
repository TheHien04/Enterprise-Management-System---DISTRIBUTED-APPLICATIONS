from uuid import UUID

from udpt_common.exceptions import NotFoundError

from app.models.entities import Notification
from app.repositories.notification_repo import NotificationRepository
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self.repo = repo

    async def list_by_user(self, user_id: str) -> list[Notification]:
        return await self.repo.list_by_user(user_id)

    async def create(self, payload: NotificationCreate) -> Notification:
        notification = Notification(
            user_id=payload.user_id,
            title=payload.title,
            body=payload.body,
            event_type=payload.event_type,
            reference_id=payload.reference_id,
        )
        return await self.repo.add(notification)

    async def mark_read(self, notification_id: UUID) -> Notification:
        notification = await self.repo.get_by_id(notification_id)
        if not notification:
            raise NotFoundError("Notification not found")
        notification.read = True
        return notification
