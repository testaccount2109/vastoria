import pytest
from httpx import AsyncClient


def sample_upload(project_id: str, parent: str | None = None):
    return {
        "project_id": project_id,
        "parent_version_hash": parent,
        "incremental": True,
        "message": "test snapshot",
        "tree": {
            "nodes": [
                {
                    "path": "main.py",
                    "is_directory": False,
                    "content_hash": "abc123",
                    "size": 10,
                    "children": [],
                }
            ]
        },
        "files": [
            {
                "path": "main.py",
                "content_hash": "abc123",
                "content": "print('hi')",
            }
        ],
    }


@pytest.mark.asyncio
async def test_upload_download_history(client: AsyncClient):
    pid = "proj-test-1"
    r = await client.post("/sync/upload", json=sample_upload(pid))
    assert r.status_code == 200
    v1 = r.json()["version_hash"]
    assert v1

    hist = await client.get(f"/sync/history/{pid}")
    assert hist.status_code == 200
    assert len(hist.json()["versions"]) >= 1

    dl = await client.get(f"/sync/download/{pid}")
    assert dl.status_code == 200
    body = dl.json()
    assert body["version_hash"] == v1
    assert body["files"][0]["content"] == "print('hi')"


@pytest.mark.asyncio
async def test_incremental_upload(client: AsyncClient):
    pid = "proj-test-2"
    r1 = await client.post("/sync/upload", json=sample_upload(pid))
    v1 = r1.json()["version_hash"]

    payload = sample_upload(pid, parent=v1)
    payload["tree"]["nodes"][0]["content_hash"] = "def456"
    payload["files"] = [
        {"path": "main.py", "content_hash": "def456", "content": "print('v2')"}
    ]
    r2 = await client.post("/sync/upload", json=payload)
    assert r2.status_code == 200
    v2 = r2.json()["version_hash"]
    assert v2 != v1

    dl = await client.get(f"/sync/download/{pid}", params={"version": v1})
    assert dl.json()["files"][0]["content"] == "print('hi')"


@pytest.mark.asyncio
async def test_rollback(client: AsyncClient):
    pid = "proj-test-3"
    r1 = await client.post("/sync/upload", json=sample_upload(pid))
    v1 = r1.json()["version_hash"]

    payload = sample_upload(pid, parent=v1)
    payload["files"][0]["content_hash"] = "zzz999"
    payload["files"][0]["content"] = "print('v2')"
    payload["tree"]["nodes"][0]["content_hash"] = "zzz999"
    r2 = await client.post("/sync/upload", json=payload)
    v2 = r2.json()["version_hash"]
    assert v2 != v1

    rb = await client.post(
        f"/sync/rollback/{pid}",
        json={"version_hash": v1},
    )
    assert rb.status_code == 200
    assert rb.json()["head_version_hash"] == v1

    dl = await client.get(f"/sync/download/{pid}")
    assert dl.json()["version_hash"] == v1
