import json

import httpx


def _serialize_state(state: str | dict | None) -> str | None:
    if state is None:
        return None
    if isinstance(state, dict):
        return json.dumps(state)
    return state


async def log_audit(
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str,
    before_state: str | dict | None = None,
    after_state: str | dict | None = None,
    note: str | None = None,
    audit_service_url: str = "http://audit-service:8007",
) -> None:
    """Fire-and-forget audit entry (4.10 — immutable trail, independent of display data)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{audit_service_url}/api/v1/audit",
                json={
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action": action,
                    "actor_id": actor_id,
                    "before_state": _serialize_state(before_state),
                    "after_state": _serialize_state(after_state),
                    "note": note,
                },
            )
    except httpx.HTTPError:
        return
