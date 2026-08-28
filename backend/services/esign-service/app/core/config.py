from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "esign-service"
    service_title: str = "E-Sign Service"
    service_description: str = "Digital signing integration"
    service_port: int = 8008
    debug: bool = True

    database_url: str = "postgresql+psycopg://udpt:udpt_secret@postgres:5432/support_db"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    billing_service_url: str = "http://billing-service:8004"
    audit_service_url: str = "http://audit-service:8007"


settings = Settings()
