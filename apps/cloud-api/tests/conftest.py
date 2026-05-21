import pytest
from httpx import ASGITransport, AsyncClient

from vastoria_cloud.config import get_settings
from vastoria_cloud.db import session as db_session
from vastoria_cloud.db.seed import seed_releases_if_empty
from vastoria_cloud.db.session import close_db, init_db
from vastoria_cloud.main import create_app


@pytest.fixture(autouse=True)
def isolated_env(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    blob_dir = tmp_path / "blobs"
    artifact_dir = tmp_path / "artifacts"
    release_metadata = tmp_path / "releases.json"
    release_metadata.write_text(
        """
{
  "releases": [
    {
      "version": "9.8.7",
      "published_at": "2026-05-21T12:00:00Z",
      "prerelease": false,
      "tags": ["windows", "test"],
      "recommended": true,
      "changelog": "## 9.8.7\\n\\n- Test release metadata",
      "downloads": {
        "installer": {
          "url": "https://vastoria.online/downloads/windows/v9.8.7/Vastoria-9.8.7-x64-setup.exe",
          "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "size_bytes": 100,
          "recommended": true,
          "platform": "windows_x86_64"
        },
        "portable": {
          "url": "https://vastoria.online/downloads/windows/v9.8.7/Vastoria-9.8.7-x64-portable.exe",
          "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "size_bytes": 90,
          "recommended": false,
          "platform": "windows_x86_64"
        },
        "msi": {
          "url": "https://vastoria.online/downloads/windows/v9.8.7/Vastoria-9.8.7-x64.msi",
          "sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          "size_bytes": 95,
          "recommended": false,
          "platform": "windows_x86_64"
        }
      }
    }
  ],
  "total": 1
}
""".strip()
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("SQLITE_PATH", str(db_file))
    monkeypatch.setenv("BLOB_STORAGE_PATH", str(blob_dir))
    monkeypatch.setenv("ARTIFACT_STORAGE_PATH", str(artifact_dir))
    monkeypatch.setenv("RELEASE_METADATA_PATH", str(release_metadata))
    monkeypatch.setenv("PUBLIC_BASE_URL", "http://test")
    monkeypatch.setenv("SEED_RELEASES_ON_STARTUP", "false")
    monkeypatch.setenv("SEED_MODELS_ON_STARTUP", "false")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def client():
    await init_db()
    app = create_app()
    assert db_session.SessionLocal is not None
    app.state.session_factory = db_session.SessionLocal

    async with db_session.SessionLocal() as session:
        await seed_releases_if_empty(session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await close_db()


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return {"X-Vastoria-Admin": "allow"}
