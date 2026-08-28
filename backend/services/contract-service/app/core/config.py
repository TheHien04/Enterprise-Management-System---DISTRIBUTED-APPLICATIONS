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


settings = Settings()
