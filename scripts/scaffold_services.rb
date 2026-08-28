#!/usr/bin/env ruby
# frozen_string_literal: true

ROOT = File.expand_path('..', __dir__)
SERVICES = [
  ['contract-service', 8001, 'contract_db', 'Contract Service', 'Customers, contracts, appendices'],
  ['pricing-service', 8002, 'pricing_db', 'Pricing Service', 'Service catalog and price lists'],
  ['operation-service', 8003, 'operation_db', 'Operation Service', 'Volume records and period locking'],
  ['billing-service', 8004, 'billing_db', 'Billing Service', 'Billing sheets and adjustments'],
  ['workflow-service', 8005, 'workflow_db', 'Workflow Service', 'Configurable approval workflows'],
  ['notification-service', 8006, 'support_db', 'Notification Service', 'Async notifications'],
  ['audit-service', 8007, 'support_db', 'Audit Service', 'Immutable audit logs'],
  ['esign-service', 8008, 'support_db', 'E-Sign Service', 'Digital signing integration']
].freeze

def write(path, content)
  full = File.join(ROOT, path)
  FileUtils.mkdir_p(File.dirname(full))
  File.write(full, content)
  puts "  + #{path}"
end

require 'fileutils'

SERVICES.each do |slug, port, db, title, description|
  mod = slug.tr('-', '_')
  write("backend/services/#{slug}/requirements.txt", <<~REQ)
    fastapi>=0.115.0
    uvicorn[standard]>=0.30.0
    pydantic>=2.9.0
    pydantic-settings>=2.5.0
    sqlalchemy>=2.0.35
    psycopg[binary]>=3.2.0
    httpx>=0.27.0
    redis>=5.0.0
    python-multipart>=0.0.9
  REQ

  write("backend/services/#{slug}/Dockerfile", <<~DOCKER)
    FROM python:3.11-slim

    WORKDIR /app

    COPY backend/libs/udpt_common /libs/udpt_common
    RUN pip install --no-cache-dir /libs/udpt_common

    COPY backend/services/#{slug}/requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    COPY backend/services/#{slug}/app ./app

    ENV PYTHONPATH=/app
    EXPOSE #{port}

    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "#{port}"]
  DOCKER

  write("backend/services/#{slug}/app/__init__.py", "")

  write("backend/services/#{slug}/app/core/config.py", <<~PY)
    from pydantic_settings import BaseSettings, SettingsConfigDict


    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")

        service_name: str = "#{slug}"
        service_title: str = "#{title}"
        service_description: str = "#{description}"
        service_port: int = #{port}
        debug: bool = True

        database_url: str = "postgresql+psycopg://udpt:udpt_secret@postgres:5432/#{db}"
        redis_url: str = "redis://redis:6379/0"
        kafka_bootstrap_servers: str = "kafka:9092"
        jwt_secret: str = "change-me"
        jwt_algorithm: str = "HS256"


    settings = Settings()
  PY

  write("backend/services/#{slug}/app/core/__init__.py", "")

  write("backend/services/#{slug}/app/api/__init__.py", "")

  write("backend/services/#{slug}/app/api/router.py", <<~PY)
    from fastapi import APIRouter

    from app.api.v1 import health

    api_router = APIRouter()
    api_router.include_router(health.router, tags=["Health"])
  PY

  write("backend/services/#{slug}/app/api/v1/__init__.py", "")

  write("backend/services/#{slug}/app/api/v1/health.py", <<~PY)
    from fastapi import APIRouter

    from app.core.config import settings

    router = APIRouter()


    @router.get("/health")
    async def health_check():
        return {
            "status": "ok",
            "service": settings.service_name,
            "title": settings.service_title,
        }
  PY

  write("backend/services/#{slug}/app/main.py", <<~PY)
    from contextlib import asynccontextmanager

    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from udpt_common.exceptions import AppError

    from app.api.router import api_router
    from app.core.config import settings


    @asynccontextmanager
    async def lifespan(_: FastAPI):
        # TODO: init DB pool, Kafka producer, Redis client
        yield
        # TODO: graceful shutdown


    app = FastAPI(
        title=settings.service_title,
        description=settings.service_description,
        version="0.1.0",
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
  PY

  %w[models schemas services db repositories].each do |folder|
    write("backend/services/#{slug}/app/#{folder}/__init__.py", "")
    write("backend/services/#{slug}/app/#{folder}/.gitkeep", "") if folder == 'db'
  end

  write("backend/services/#{slug}/app/db/session.py", <<~PY)
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    from app.core.config import settings

    engine = create_async_engine(settings.database_url, echo=settings.debug, pool_pre_ping=True)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
  PY

  write("backend/services/#{slug}/app/db/base.py", <<~PY)
    from sqlalchemy.orm import DeclarativeBase


    class Base(DeclarativeBase):
        pass
  PY

  write("backend/services/#{slug}/README.md", <<~MD)
    # #{title}

    #{description}

    - Port: `#{port}`
    - Database: `#{db}`
    - Swagger: http://localhost:#{port}/docs

    ## Run locally

    ```bash
    cd backend/services/#{slug}
    pip install -r requirements.txt
    pip install -e ../../libs/udpt_common
    uvicorn app.main:app --reload --port #{port}
    ```
  MD
end

puts "\nScaffolded #{SERVICES.length} services."
