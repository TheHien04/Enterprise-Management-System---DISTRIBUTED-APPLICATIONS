from fastapi import APIRouter

from app.api.v1 import health, workflows

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
# /api/v1/workflows/health — must be registered (static) for gateway proxy; not /{workflow_id}
api_router.include_router(health.router, prefix="/workflows", tags=["Health"])
api_router.include_router(workflows.router)
