from fastapi import APIRouter

from app.api.v1 import contracts, customers, health, internal

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(customers.router)
api_router.include_router(contracts.router)
api_router.include_router(internal.router)
