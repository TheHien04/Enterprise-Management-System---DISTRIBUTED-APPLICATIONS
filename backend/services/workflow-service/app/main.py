import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from udpt_common.db_init import create_tables, ensure_columns
from udpt_common.exceptions import AppError
from udpt_common.outbox import start_outbox_relay

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base, OutboxEvent
from app.db.session import SessionLocal, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_tables(engine, Base)
    await ensure_columns(
        engine,
        [
            ("workflow_instances", "current_assignee_user_id VARCHAR(64)"),
        ],
    )
    relay_task, stop_event = start_outbox_relay(SessionLocal, OutboxEvent, settings.kafka_bootstrap_servers)
    yield
    stop_event.set()
    relay_task.cancel()
    try:
        await relay_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.service_title,
    description=settings.service_description,
    version="0.2.0",
    lifespan=lifespan,
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


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": getattr(exc, "details", {}),
            },
        },
    )


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def root_health():
    return {"status": "ok", "service": settings.service_name}


@app.get("/health/outbox", tags=["Health"])
async def outbox_health():
    from sqlalchemy import func as sqlfunc
    from sqlalchemy import select

    async with SessionLocal() as session:
        pending = await session.scalar(
            select(sqlfunc.count()).select_from(OutboxEvent).where(OutboxEvent.status == "PENDING")
        )
    return {"status": "ok", "pending_outbox_events": int(pending or 0)}
