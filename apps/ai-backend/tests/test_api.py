import pytest
from httpx import ASGITransport, AsyncClient

from vastoria_ai.db.session import SessionLocal, close_db, init_db
from vastoria_ai.main import create_app
from vastoria_ai.services.chat import ChatService


@pytest.fixture
async def client():
    await init_db()
    app = create_app()
    app.state.session_factory = SessionLocal
    app.state.chat_service = ChatService(session_factory=SessionLocal)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await close_db()


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    r = await client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "vastoria-ai"


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert "ollama" in r.json()


@pytest.mark.asyncio
async def test_context_update(client: AsyncClient):
    r = await client.post(
        "/context/update",
        json={
            "project_id": "test-project",
            "cwd": "/tmp/test",
            "open_files": [{"path": "/tmp/test/main.py", "content": "print(1)"}],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["project_id"] == "test-project"


@pytest.mark.asyncio
async def test_models_endpoint(client: AsyncClient):
    r = await client.get("/models")
    assert r.status_code == 200
    body = r.json()
    assert "models" in body
    assert "ollama_reachable" in body
