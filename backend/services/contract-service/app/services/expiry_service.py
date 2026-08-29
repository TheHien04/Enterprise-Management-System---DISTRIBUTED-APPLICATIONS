"""Expiry alerts for contracts and price lists (UC-09) — run on a background schedule."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta

import httpx

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.customer_repo import ContractRepository

logger = logging.getLogger(__name__)

EXPIRY_WINDOW_DAYS = 30
EXPIRY_POLL_SECONDS = 300  # 5 minutes


async def _post_notification(client: httpx.AsyncClient, payload: dict) -> bool:
    try:
        response = await client.post(
            f"{settings.notification_service_url}/api/v1/notifications",
            json=payload,
        )
        return response.status_code < 400
    except httpx.HTTPError as exc:
        logger.warning("Expiry notification failed: %s", exc)
        return False


async def emit_expiry_notifications(session) -> int:
    """Notify for contracts and price lists expiring within 30 days."""
    contract_repo = ContractRepository(session)
    contracts = await contract_repo.list_all()
    today = date.today()
    threshold = today + timedelta(days=EXPIRY_WINDOW_DAYS)
    sent = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        for contract in contracts:
            if contract.status not in {"ACTIVE", "APPROVED"}:
                continue
            if contract.effective_to > threshold or contract.effective_to < today:
                continue
            days_left = (contract.effective_to - today).days
            ok = await _post_notification(
                client,
                {
                    "user_id": "sale01",
                    "title": "Contract nearing expiry",
                    "body": f"{contract.code} expires in {days_left} day(s) on {contract.effective_to}",
                    "event_type": "CONTRACT_EXPIRING",
                    "reference_id": str(contract.id),
                },
            )
            if ok:
                sent += 1

        try:
            response = await client.get(f"{settings.pricing_service_url}/api/v1/price-lists")
            if response.status_code < 400:
                for pl in response.json().get("data") or []:
                    if pl.get("status") not in {"EFFECTIVE", "APPROVED"}:
                        continue
                    effective_to = date.fromisoformat(str(pl["effective_to"])[:10])
                    if effective_to > threshold or effective_to < today:
                        continue
                    days_left = (effective_to - today).days
                    ok = await _post_notification(
                        client,
                        {
                            "user_id": "sale01",
                            "title": "Price list nearing expiry",
                            "body": (
                                f"{pl.get('contract_code')} v{pl.get('version')} expires in "
                                f"{days_left} day(s) on {effective_to}"
                            ),
                            "event_type": "PRICE_LIST_EXPIRING",
                            "reference_id": str(pl.get("id")),
                        },
                    )
                    if ok:
                        sent += 1
        except httpx.HTTPError as exc:
            logger.warning("Price list expiry scan failed: %s", exc)

    return sent


async def run_expiry_scheduler(stop_event: asyncio.Event | None = None) -> None:
    while True:
        if stop_event and stop_event.is_set():
            break
        try:
            async with SessionLocal() as session:
                count = await emit_expiry_notifications(session)
                await session.commit()
                if count:
                    logger.info("Expiry scheduler sent %s notification(s)", count)
        except Exception as exc:
            logger.warning("Expiry scheduler error: %s", exc)
        await asyncio.sleep(EXPIRY_POLL_SECONDS)
