import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_releases(client: AsyncClient):
    res = await client.get("/releases")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    first = data["releases"][0]
    assert "version" in first
    assert "downloads" in first
    assert first["downloads"]["installer"] is not None


@pytest.mark.asyncio
async def test_latest_release(client: AsyncClient):
    res = await client.get("/releases/latest")
    assert res.status_code == 200
    release = res.json()["release"]
    assert release["prerelease"] is False
    assert release["recommended"] is True


@pytest.mark.asyncio
async def test_get_release_by_version(client: AsyncClient):
    res = await client.get("/releases/0.1.0")
    assert res.status_code == 200
    body = res.json()
    assert body["version"] == "0.1.0"
    assert len(body["artifacts"]) >= 2


@pytest.mark.asyncio
async def test_create_release_requires_admin_stub(client: AsyncClient, admin_headers):
    res = await client.post(
        "/releases",
        json={
            "version": "0.2.0-test",
            "changelog": "## Test\n\n- item",
            "tags": ["windows", "beta"],
            "recommended": True,
        },
        headers=admin_headers,
    )
    assert res.status_code == 201
    assert res.json()["version"] == "0.2.0-test"


@pytest.mark.asyncio
async def test_create_release_rejects_without_admin(client: AsyncClient):
    res = await client.post("/releases", json={"version": "9.9.9", "changelog": "x"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_upload_artifact(client: AsyncClient, admin_headers):
    await client.post(
        "/releases",
        json={"version": "0.2.1-artifact", "changelog": "build"},
        headers=admin_headers,
    )
    files = {
        "file": (
            "Vastoria-test-setup.exe",
            b"fake-installer-bytes",
            "application/octet-stream",
        )
    }
    data = {"artifact_type": "installer", "recommended": "true"}
    res = await client.post(
        "/releases/0.2.1-artifact/artifacts",
        files=files,
        data=data,
        headers=admin_headers,
    )
    assert res.status_code == 200
    artifact = res.json()["artifact"]
    assert artifact["artifact_type"] == "installer"
    assert artifact["recommended"] is True

    dl = await client.get(f"/downloads/artifacts/{artifact['id']}/file")
    assert dl.status_code == 200
    assert dl.content == b"fake-installer-bytes"
