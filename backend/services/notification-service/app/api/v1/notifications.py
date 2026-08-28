from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from udpt_common.responses import SuccessResponse

from app.core.deps import get_db
from app.repositories.notification_repo import NotificationRepository
from app.schemas.notification import NotificationCreate, NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _service(session: AsyncSession) -> NotificationService:
    return NotificationService(NotificationRepository(session))


@router.get("", response_model=SuccessResponse[list[NotificationOut]])
async def list_notifications(
    user_id: str = Query(...),
    session: AsyncSession = Depends(get_db),
):
    data = await _service(session).list_by_user(user_id)
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[NotificationOut])
async def create_notification(payload: NotificationCreate, session: AsyncSession = Depends(get_db)):
    data = await _service(session).create(payload)
    return SuccessResponse(data=data, message="Notification created")


@router.patch("/{notification_id}/read", response_model=SuccessResponse[NotificationOut])
async def mark_notification_read(notification_id: UUID, session: AsyncSession = Depends(get_db)):
    data = await _service(session).mark_read(notification_id)
    return SuccessResponse(data=data, message="Notification marked as read")
