import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_latest_windows_download(client: AsyncClient):
    res = await client.get("/downloads/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["platform"] == "windows_x86_64"
    assert data["recommended"] is True
    assert data["downloads"]["installer"] is not None


@pytest.mark.asyncio
async def test_list_windows_builds(client: AsyncClient):
    res = await client.get("/downloads/windows")
    assert res.status_code == 200
    body = res.json()
    assert body["platform"] == "windows_x86_64"
    assert body["total"] >= 1


@pytest.mark.asyncio
async def test_recommended_filter(client: AsyncClient):
    res = await client.get("/downloads/windows?recommended_only=true")
    assert res.status_code == 200
    for build in res.json()["builds"]:
        assert build["recommended"] is True
