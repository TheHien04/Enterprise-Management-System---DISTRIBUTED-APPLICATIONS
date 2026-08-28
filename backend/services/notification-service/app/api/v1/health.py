from fastapi import APIRouter, Response, status
from udpt_common.kafka_health import check_kafka

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    kafka = await check_kafka(settings.kafka_bootstrap_servers)
    overall = "ok" if kafka.get("status") == "ok" else "degraded"
    return {
        "status": overall,
        "service": settings.service_name,
        "title": settings.service_title,
        "kafka": kafka,
    }


@router.get("/health/ready")
async def readiness_check(response: Response):
    kafka = await check_kafka(settings.kafka_bootstrap_servers)
    ready = kafka.get("status") == "ok"
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if ready else "not_ready",
        "service": settings.service_name,
        "kafka": kafka,
    }
