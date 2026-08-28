import httpx


async def notify_document_status(
    *,
    document_type: str,
    document_id: str,
    workflow_status: str,
    service_urls: dict[str, str],
) -> None:
    """Notify owning service when workflow reaches a terminal/intermediate state (APR-05)."""
    base_url = service_urls.get(document_type)
    if not base_url:
        return
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            f"{base_url}/api/v1/internal/workflow-status",
            json={
                "document_type": document_type,
                "document_id": document_id,
                "workflow_status": workflow_status,
            },
            headers={"X-Internal-Service": "workflow-service"},
        )
