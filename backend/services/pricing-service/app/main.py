from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from udpt_common.db_init import create_tables
from udpt_common.exceptions import AppError

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.catalog_service import seed_catalog
from app.services.price_list_service import seed_price_lists


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_tables(engine, Base)
    async with SessionLocal() as session:
        await seed_catalog(session)
        await seed_price_lists(session)
        await session.commit()
    yield


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
