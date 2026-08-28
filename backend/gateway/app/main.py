from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from udpt_common.auth import decode_access_token
from udpt_common.exceptions import AppError

from app.api import auth, health
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_MAP: dict[str, tuple[str, str]] = {
    "customers": (settings.contract_service_url, "customers"),
    "contracts": (settings.contract_service_url, "contracts"),
    "pricing": (settings.pricing_service_url, ""),
    "operations": (settings.operation_service_url, ""),
    "billing": (settings.billing_service_url, ""),
    "workflows": (settings.workflow_service_url, ""),
    "notifications": (settings.notification_service_url, ""),
    "audit": (settings.audit_service_url, ""),
    "esign": (settings.esign_service_url, ""),
}


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_access_token(token, secret=settings.jwt_secret, algorithm=settings.jwt_algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"code": exc.code, "message": exc.message, "details": getattr(exc, "details", {})},
        },
    )


app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])


@app.api_route("/api/v1/{service}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_request(
    service: str,
    path: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    if service not in SERVICE_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")

    base_url, prefix = SERVICE_MAP[service]
    if prefix:
        target_url = f"{base_url}/api/v1/{prefix}" + (f"/{path}" if path else "")
    else:
        target_url = f"{base_url}/api/v1/{path}"
    headers = {
        "X-User-Id": str(user.get("sub", "")),
        "X-User-Roles": ",".join(user.get("roles", [])),
    }
    if request.headers.get("X-Idempotency-Key"):
        headers["X-Idempotency-Key"] = request.headers["X-Idempotency-Key"]

    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            request.method,
            target_url,
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=response.headers.get("content-type"),
    )


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "services": list(SERVICE_MAP.keys()),
    }
