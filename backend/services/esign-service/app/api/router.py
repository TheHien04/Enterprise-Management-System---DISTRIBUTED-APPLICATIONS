from fastapi import APIRouter

from app.api.v1 import health, signing_sessions

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(signing_sessions.router)
