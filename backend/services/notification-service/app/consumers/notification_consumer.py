import asyncio
import logging

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.notification_repo import NotificationRepository
from app.schemas.notification import NotificationCreate
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


async def handle_domain_event(event_type: str | None, payload: dict) -> None:
    if not event_type:
        return
    user_id = str(payload.get("user_id") or payload.get("submitted_by") or "sale01")
    title = str(payload.get("title") or event_type.replace("_", " ").title())
    body = str(payload.get("body") or payload.get("message") or "")
    async with SessionLocal() as session:
        service = NotificationService(NotificationRepository(session))
        await service.create(
            NotificationCreate(
                user_id=user_id,
                title=title,
                body=body,
                event_type=event_type,
                reference_id=payload.get("reference_id"),
            )
        )
        await session.commit()


async def start_notification_consumer() -> None:
    from udpt_common.kafka_events import run_domain_event_consumer

    while True:
        try:
            await run_domain_event_consumer(
                settings.kafka_bootstrap_servers,
                "notification-service",
                handle_domain_event,
            )
        except Exception as exc:
            logger.warning("Notification Kafka consumer restarting: %s", exc)
            await asyncio.sleep(5)
