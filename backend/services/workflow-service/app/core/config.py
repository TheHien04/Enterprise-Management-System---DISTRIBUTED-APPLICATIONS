from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "workflow-service"
    service_title: str = "Workflow Service"
    service_description: str = "Configurable approval workflows"
    service_port: int = 8005
    debug: bool = True

    database_url: str = "postgresql+psycopg://udpt:udpt_secret@postgres:5432/workflow_db"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    contract_service_url: str = "http://contract-service:8001"
    billing_service_url: str = "http://billing-service:8004"
    pricing_service_url: str = "http://pricing-service:8002"
    audit_service_url: str = "http://audit-service:8007"


settings = Settings()
