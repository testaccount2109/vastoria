from pathlib import Path

from vastoria_cloud.config import blob_dir


class BlobStorage:
    def _path(self, content_hash: str) -> Path:
        base = blob_dir()
        return base / content_hash[:2] / content_hash

    def exists(self, content_hash: str) -> bool:
        return self._path(content_hash).is_file()

    def write(self, content_hash: str, content: str) -> None:
        path = self._path(content_hash)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def read(self, content_hash: str) -> str | None:
        path = self._path(content_hash)
        if not path.is_file():
            return None
        return path.read_text(encoding="utf-8")


blob_storage = BlobStorage()
