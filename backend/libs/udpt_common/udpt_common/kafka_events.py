import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

DOMAIN_EVENTS_TOPIC = "udpt.domain.events"


async def publish_domain_event(event_type: str, payload: dict[str, Any], bootstrap_servers: str) -> None:
    """Publish domain event to Kafka; silently skip if broker unavailable (APR-07 fallback via HTTP)."""
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
    except Exception as exc:
        logger.warning("Kafka publish skipped: %s", exc)


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
