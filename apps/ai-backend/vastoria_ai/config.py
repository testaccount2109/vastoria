from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 18420
    debug: bool = False

    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        validation_alias=AliasChoices("ollama_base_url", "ollama_url"),
    )
    ollama_default_model: str = "llama3.2"
    ollama_request_timeout: float = 300.0

    # Optional PostgreSQL; falls back to SQLite when unset
    database_url: str | None = None
    sqlite_path: str = ".vastoria/ai-backend.db"

    cors_origins: list[str] = [
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
    ]

    max_context_files: int = 12
    max_context_chars_per_file: int = 24_000
    max_terminal_context_chars: int = 8_000


@lru_cache
def get_settings() -> Settings:
    return Settings()
