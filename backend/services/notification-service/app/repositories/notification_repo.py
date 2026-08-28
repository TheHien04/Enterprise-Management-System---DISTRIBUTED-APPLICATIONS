from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_user(self, user_id: str) -> list[Notification]:
        result = await self.session.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return list(result)

    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        return await self.session.get(Notification, notification_id)

    async def add(self, notification: Notification) -> Notification:
        self.session.add(notification)
        await self.session.flush()
        return notification
