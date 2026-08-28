from fastapi import APIRouter

from app.api.v1 import health, operations

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(operations.router)
