from fastapi import APIRouter

from app.api.v1 import health, notifications

api_router = APIRouter()
# /api/v1/health — direct service probes
api_router.include_router(health.router, tags=["Health"])
# /api/v1/notifications/health — reachable via gateway SERVICE_MAP prefix
api_router.include_router(health.router, prefix="/notifications", tags=["Health"])
api_router.include_router(notifications.router)
