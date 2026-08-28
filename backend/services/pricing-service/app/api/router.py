from fastapi import APIRouter

from app.api.v1 import catalog, health, internal, price_lists

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(catalog.router)
api_router.include_router(price_lists.router)
api_router.include_router(internal.router)
