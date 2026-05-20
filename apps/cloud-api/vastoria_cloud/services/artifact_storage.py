import hashlib
from pathlib import Path

from vastoria_cloud.config import artifact_dir


class ArtifactStorage:
    """Content-addressed binary storage for release builds (installer, portable, msi)."""

    def storage_path(self, storage_key: str) -> Path:
        base = artifact_dir()
        return base / storage_key

    def write_stream(self, storage_key: str, data: bytes) -> tuple[str, int]:
        path = self.storage_path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256()
        size = 0
        with path.open("wb") as f:
            f.write(data)
            digest.update(data)
            size = len(data)
        return digest.hexdigest(), size

    def write_chunks(self, storage_key: str, chunks: list[bytes]) -> tuple[str, int]:
        path = self.storage_path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256()
        size = 0
        with path.open("wb") as f:
            for chunk in chunks:
                f.write(chunk)
                digest.update(chunk)
                size += len(chunk)
        return digest.hexdigest(), size

    def exists(self, storage_key: str) -> bool:
        return self.storage_path(storage_key).is_file()

    def read_path(self, storage_key: str) -> Path | None:
        path = self.storage_path(storage_key)
        return path if path.is_file() else None

    def delete(self, storage_key: str) -> None:
        path = self.storage_path(storage_key)
        if path.is_file():
            path.unlink()


artifact_storage = ArtifactStorage()
