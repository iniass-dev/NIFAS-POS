from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "NIFAS POS"
    app_version: str = "1.0.0"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://nifas:nifas@localhost:5432/nifas_pos"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8h

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    class Config:
        env_file = ".env"


settings = Settings()
