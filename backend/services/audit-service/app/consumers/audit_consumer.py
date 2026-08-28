import asyncio
import logging

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.audit_repo import AuditRepository
from app.schemas.audit import AuditLogCreate
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


async def handle_domain_event(event_type: str | None, payload: dict) -> None:
    if not event_type:
        return
    async with SessionLocal() as session:
        service = AuditService(AuditRepository(session))
        await service.log(
            AuditLogCreate(
                entity_type=str(payload.get("entity_type", "SYSTEM")),
                entity_id=str(payload.get("entity_id", payload.get("reference_id", "unknown"))),
                action=str(payload.get("action", event_type)),
                actor_id=str(payload.get("actor_id", payload.get("user_id", "system"))),
                before_state=payload.get("before_state"),
                after_state=payload.get("after_state"),
                note=payload.get("note") or payload.get("body"),
            )
        )
        await session.commit()


async def start_audit_consumer() -> None:
    from udpt_common.kafka_events import run_domain_event_consumer

    while True:
        try:
            await run_domain_event_consumer(
                settings.kafka_bootstrap_servers,
                "audit-service",
                handle_domain_event,
            )
        except Exception as exc:
            logger.warning("Audit Kafka consumer restarting: %s", exc)
            await asyncio.sleep(5)
