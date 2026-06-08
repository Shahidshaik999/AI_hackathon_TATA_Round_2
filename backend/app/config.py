"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = ""
    groq_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./maintenance_wizard.db"

    # Vector DB
    chroma_persist_dir: str = "./chroma_db"

    # App
    secret_key: str = "dev_secret_key_change_in_prod"
    environment: str = "development"
    log_level: str = "INFO"
    app_name: str = "Maintenance Wizard"
    version: str = "1.0.0"

    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
