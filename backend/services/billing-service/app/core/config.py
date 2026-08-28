from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "billing-service"
    service_title: str = "Billing Service"
    service_description: str = "Billing sheets and adjustments"
    service_port: int = 8004
    debug: bool = True

    database_url: str = "postgresql+psycopg://udpt:udpt_secret@postgres:5432/billing_db"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    pricing_service_url: str = "http://pricing-service:8002"
    operation_service_url: str = "http://operation-service:8003"
    contract_service_url: str = "http://contract-service:8001"
    esign_service_url: str = "http://esign-service:8008"
    workflow_service_url: str = "http://workflow-service:8005"
    audit_service_url: str = "http://audit-service:8007"


settings = Settings()
