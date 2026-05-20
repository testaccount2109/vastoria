import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_update_check_no_update(client: AsyncClient):
    res = await client.get("/updates/check?current=99.0.0")
    assert res.status_code == 200
    data = res.json()
    assert data["update_available"] is False
    assert data["latest_version"] is not None


@pytest.mark.asyncio
async def test_update_check_has_update(client: AsyncClient):
    res = await client.get("/updates/check?current=0.0.1")
    assert res.status_code == 200
    data = res.json()
    assert data["update_available"] is True
    assert data["downloads"] is not None


@pytest.mark.asyncio
async def test_updates_latest(client: AsyncClient):
    res = await client.get("/updates/latest")
    assert res.status_code == 200
    assert res.json()["latest_version"] is not None
