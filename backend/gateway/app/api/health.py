from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def gateway_health():
    return {"status": "ok", "service": "api-gateway"}
