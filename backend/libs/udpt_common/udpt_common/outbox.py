"""Transactional outbox — persist events in the same DB transaction, relay to Kafka asynchronously."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import Any, Callable, Type

from sqlalchemy import DateTime, Integer, String, func, select
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Mapped, mapped_column

logger = logging.getLogger(__name__)


def make_outbox_model(base: Type) -> Type:
    """Factory: attach OutboxEvent to a service's declarative Base."""

    class OutboxEvent(base):  # type: ignore[misc, valid-type]
        __tablename__ = "outbox_events"

        id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        event_type: Mapped[str] = mapped_column(String(128), index=True)
        payload: Mapped[dict] = mapped_column(JSONB)
        status: Mapped[str] = mapped_column(String(16), default="PENDING", index=True)
        retry_count: Mapped[int] = mapped_column(Integer, default=0)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
        published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    return OutboxEvent


async def enqueue_domain_event(
    session: AsyncSession,
    OutboxEvent: Type,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    session.add(OutboxEvent(event_type=event_type, payload=payload, status="PENDING"))


async def relay_outbox_batch(
    session: AsyncSession,
    OutboxEvent: Type,
    bootstrap_servers: str,
    limit: int = 50,
) -> int:
    from udpt_common.kafka_events import publish_domain_event

    result = await session.scalars(
        select(OutboxEvent)
        .where(OutboxEvent.status == "PENDING")
        .order_by(OutboxEvent.created_at)
        .limit(limit)
    )
    events = list(result)
    published = 0
    for event in events:
        ok = await publish_domain_event(event.event_type, event.payload, bootstrap_servers)
        if ok:
            event.status = "PUBLISHED"
            event.published_at = datetime.now(UTC)
            published += 1
        else:
            event.retry_count += 1
    return published


async def run_outbox_relay_loop(
    session_factory: async_sessionmaker[AsyncSession],
    OutboxEvent: Type,
    bootstrap_servers: str,
    interval_seconds: float = 2.0,
    stop_event: asyncio.Event | None = None,
) -> None:
    while True:
        if stop_event and stop_event.is_set():
            break
        try:
            async with session_factory() as session:
                count = await relay_outbox_batch(session, OutboxEvent, bootstrap_servers)
                await session.commit()
                if count:
                    logger.info("Outbox relay published %s event(s)", count)
        except Exception as exc:
            logger.warning("Outbox relay loop error: %s", exc)
        await asyncio.sleep(interval_seconds)


def start_outbox_relay(
    session_factory: async_sessionmaker[AsyncSession],
    OutboxEvent: Type,
    bootstrap_servers: str,
    interval_seconds: float = 2.0,
) -> tuple[asyncio.Task, asyncio.Event]:
    stop_event = asyncio.Event()
    task = asyncio.create_task(
        run_outbox_relay_loop(session_factory, OutboxEvent, bootstrap_servers, interval_seconds, stop_event)
    )
    return task, stop_event
