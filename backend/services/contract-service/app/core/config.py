from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "contract-service"
    service_title: str = "Contract Service"
    service_description: str = "Customers, contracts, appendices"
    service_port: int = 8001
    debug: bool = True

    database_url: str = "postgresql+psycopg://udpt:udpt_secret@postgres:5432/contract_db"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    workflow_service_url: str = "http://workflow-service:8005"
    config_dir: str = "/config"
    pricing_service_url: str = "http://pricing-service:8002"
    billing_service_url: str = "http://billing-service:8004"
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "udpt_minio"
    minio_secret_key: str = "udpt_minio_secret"
    minio_bucket: str = "contracts"
    minio_secure: bool = False
    audit_service_url: str = "http://audit-service:8007"


settings = Settings()
