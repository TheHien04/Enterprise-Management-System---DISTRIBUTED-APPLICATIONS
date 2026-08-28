from fastapi import APIRouter

from app.api.v1 import billing_sheets, health, internal

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(billing_sheets.router)
api_router.include_router(internal.router)
