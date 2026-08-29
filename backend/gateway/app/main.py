import json
import time

import httpx
import redis.asyncio as redis
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from udpt_common.exceptions import AppError

from app.api import admin, auth, health
from app.core.config import settings
from app.core.deps import get_current_user

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    # Avoid 307 slash redirects on collection POSTs — browsers drop CORS on redirect
    # and Create buttons appear to do nothing (Failed to fetch).
    redirect_slashes=False,
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
    # pricing/operations/billing/esign keep empty prefix — upstream routes are
    # /api/v1/price-lists, /api/v1/periods, /api/v1/billing-sheets, /api/v1/signing-sessions
    "pricing": (settings.pricing_service_url, ""),
    "operations": (settings.operation_service_url, ""),
    "billing": (settings.billing_service_url, ""),
    # workflows/notifications/audit share the gateway segment name as upstream prefix
    "workflows": (settings.workflow_service_url, "workflows"),
    "notifications": (settings.notification_service_url, "notifications"),
    "audit": (settings.audit_service_url, "audit"),
    "esign": (settings.esign_service_url, ""),
}

# Gateway RBAC — mirrors frontend route permissions (§6 security)
SERVICE_ROLE_REQUIREMENTS: dict[str, list[str] | None] = {
    # LEGAL/DIRECTOR need customer labels on contract screens (read via same proxy)
    "customers": ["SALES_STAFF", "SALES_MANAGER", "LEGAL", "DIRECTOR", "ADMIN"],
    "contracts": ["SALES_STAFF", "SALES_MANAGER", "LEGAL", "DIRECTOR", "ADMIN"],
    "pricing": ["SALES_STAFF", "SALES_MANAGER", "DIRECTOR", "ADMIN"],
    "operations": ["OPERATIONS", "DIRECTOR", "ADMIN"],
    "billing": ["ACCOUNTING", "DIRECTOR", "ADMIN"],
    "esign": ["ACCOUNTING", "DIRECTOR", "ADMIN"],
    "workflows": None,
    "notifications": None,
    # Full /audit admin page stays DIRECTOR/ADMIN in the UI; entity ActivityTimeline
    # needs scoped GET for roles that can open the parent entity.
    "audit": ["DIRECTOR", "ADMIN"],
}

# Method-aware overrides (read vs write). Service-to-service writes bypass the gateway.
AUDIT_READ_ROLES = [
    "SALES_STAFF",
    "SALES_MANAGER",
    "LEGAL",
    "ACCOUNTING",
    "OPERATIONS",
    "DIRECTOR",
    "ADMIN",
]
AUDIT_WRITE_ROLES = ["DIRECTOR", "ADMIN"]

_redis: redis.Redis | None = None
RATE_LIMIT_PER_MINUTE = 120


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


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
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])


async def _proxy_to_service(
    service: str,
    path: str,
    request: Request,
    user: dict,
):
    if service not in SERVICE_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown service: {service}")

    user_roles = user.get("roles") or []
    if service == "audit":
        required_roles = AUDIT_READ_ROLES if request.method == "GET" else AUDIT_WRITE_ROLES
    else:
        required_roles = SERVICE_ROLE_REQUIREMENTS.get(service)

    if required_roles is not None:
        if not any(role in required_roles for role in user_roles):
            raise HTTPException(status_code=403, detail="Insufficient role for this resource")

    r = await get_redis()
    rate_key = f"rate:{user.get('sub')}:{int(time.time() // 60)}"
    count = await r.incr(rate_key)
    if count == 1:
        await r.expire(rate_key, 60)
    if count > RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly")

    idempotency_key = request.headers.get("X-Idempotency-Key")
    if idempotency_key and request.method in {"POST", "PUT", "PATCH"}:
        r = await get_redis()
        cache_key = f"idempotency:{user.get('sub')}:{service}:{path}:{idempotency_key}"
        cached = await r.get(cache_key)
        if cached:
            payload = json.loads(cached)
            return JSONResponse(status_code=payload["status"], content=payload["body"])

    base_url, prefix = SERVICE_MAP[service]
    # Collection roots must NOT use a trailing slash: with redirect_slashes=False on
    # upstream services, `/customers/` 404s while `/customers` succeeds.
    if prefix:
        target_url = f"{base_url}/api/v1/{prefix}" + (f"/{path}" if path else "")
    else:
        target_url = f"{base_url}/api/v1/{path}" if path else f"{base_url}/api/v1"

    headers = {
        "X-User-Id": str(user.get("sub", "")),
        "X-User-Roles": ",".join(user.get("roles", [])),
    }
    if request.headers.get("content-type"):
        headers["Content-Type"] = request.headers["content-type"]
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    body = await request.body()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            request.method,
            target_url,
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )

    if idempotency_key and request.method in {"POST", "PUT", "PATCH"} and response.status_code < 500:
        try:
            body_json = response.json()
        except Exception:
            body_json = {"raw": response.text}
        r = await get_redis()
        cache_key = f"idempotency:{user.get('sub')}:{service}:{path}:{idempotency_key}"
        await r.setex(cache_key, 86400, json.dumps({"status": response.status_code, "body": body_json}))

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=response.headers.get("content-type"),
    )


@app.api_route("/api/v1/{service}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
@app.api_route("/api/v1/{service}/", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_service_root(
    service: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    return await _proxy_to_service(service, "", request, user)


@app.api_route("/api/v1/{service}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_request(
    service: str,
    path: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    return await _proxy_to_service(service, path, request, user)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "services": list(SERVICE_MAP.keys()),
    }
