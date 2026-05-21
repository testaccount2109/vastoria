from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_downloads_base() -> str:
    import os

    return os.environ.get("DOWNLOADS_BASE_URL", "https://vastoria.online/downloads")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    vastoria_env: str = "development"

    host: str = "0.0.0.0"
    port: int = 18430
    debug: bool = False

    database_url: str | None = None
    sqlite_path: str = ".vastoria/cloud-api.db"

    blob_storage_path: str = ".vastoria/cloud-blobs"
    artifact_storage_path: str = ".vastoria/artifacts"

    public_base_url: str = "https://vastoria.online/api"
    downloads_base_url: str = _default_downloads_base()
    release_metadata_path: str = "/var/www/vastoria/downloads/windows/releases.json"

    cors_origins: list[str] = [
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
        "https://vastoria.online",
        "https://www.vastoria.online",
        "tauri://localhost",
    ]

    max_file_bytes: int = 5 * 1024 * 1024
    max_files_per_snapshot: int = 5000
    max_artifact_bytes: int = 512 * 1024 * 1024  # 512 MiB

    seed_releases_on_startup: bool = True
    # Model catalog removed — AI metadata stays on local ai-backend only
    seed_models_on_startup: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


def blob_dir() -> Path:
    path = Path(get_settings().blob_storage_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def artifact_dir() -> Path:
    path = Path(get_settings().artifact_storage_path)
    path.mkdir(parents=True, exist_ok=True)
    return path
