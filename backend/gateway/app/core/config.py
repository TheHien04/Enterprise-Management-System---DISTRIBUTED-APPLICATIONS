from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "UDPT API Gateway"
    debug: bool = True
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    redis_url: str = "redis://redis:6379/0"

    contract_service_url: str = "http://contract-service:8001"
    pricing_service_url: str = "http://pricing-service:8002"
    operation_service_url: str = "http://operation-service:8003"
    billing_service_url: str = "http://billing-service:8004"
    workflow_service_url: str = "http://workflow-service:8005"
    notification_service_url: str = "http://notification-service:8006"
    audit_service_url: str = "http://audit-service:8007"
    esign_service_url: str = "http://esign-service:8008"


settings = Settings()
