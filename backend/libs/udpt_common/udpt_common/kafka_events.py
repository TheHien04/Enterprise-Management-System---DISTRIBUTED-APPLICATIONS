import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

DOMAIN_EVENTS_TOPIC = "udpt.domain.events"


async def publish_domain_event(event_type: str, payload: dict[str, Any], bootstrap_servers: str) -> bool:
    """Publish domain event to Kafka. Returns True on success, False if broker unavailable."""
    try:
        from aiokafka import AIOKafkaProducer

        producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await producer.start()
        try:
            await producer.send_and_wait(
                DOMAIN_EVENTS_TOPIC,
                {"event_type": event_type, "payload": payload},
            )
        finally:
            await producer.stop()
        return True
    except Exception as exc:
        logger.warning("Kafka publish failed: %s", exc)
        return False


async def count_pending_outbox(session_factory, OutboxEvent) -> int:
    """Count PENDING outbox rows (for SC-07 / health checks)."""
    from sqlalchemy import func as sqlfunc, select

    async with session_factory() as session:
        result = await session.scalar(
            select(sqlfunc.count()).select_from(OutboxEvent).where(OutboxEvent.status == "PENDING")
        )
        return int(result or 0)


async def run_domain_event_consumer(
    bootstrap_servers: str,
    group_id: str,
    handler,
) -> None:
    from aiokafka import AIOKafkaConsumer

    consumer = AIOKafkaConsumer(
        DOMAIN_EVENTS_TOPIC,
        bootstrap_servers=bootstrap_servers,
        group_id=group_id,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    try:
        async for message in consumer:
            body = message.value or {}
            await handler(body.get("event_type"), body.get("payload") or {})
    finally:
        await consumer.stop()
