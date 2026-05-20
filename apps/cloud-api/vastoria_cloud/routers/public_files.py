"""Versioned download paths: /v{version}/{filename} (CDN-compatible on same host)."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.db.models import ArtifactType, ReleaseRow
from vastoria_cloud.services.artifact_storage import artifact_storage

router = APIRouter(tags=["public-files"])

_MEDIA = {
    ArtifactType.INSTALLER.value: "application/x-msdownload",
    ArtifactType.PORTABLE.value: "application/x-msdownload",
    ArtifactType.MSI.value: "application/x-msi",
}


@router.get("/v{version}/{filename}")
async def serve_versioned_build(
    version: str,
    filename: str,
    session: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Serve Windows builds by version path (e.g. /v0.1.2/Vastoria-0.1.2-x64-setup.exe)."""
    ver = version.lstrip("v")
    row = await session.scalar(
        select(ReleaseRow)
        .where(ReleaseRow.version == ver)
        .options(selectinload(ReleaseRow.artifacts)),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Release not found")

    art = next((a for a in row.artifacts if a.filename == filename), None)
    if art is None:
        raise HTTPException(status_code=404, detail="Artifact not found")

    path = artifact_storage.read_path(art.storage_key)
    if path is None:
        raise HTTPException(status_code=404, detail="Artifact file missing on disk")

    media = _MEDIA.get(art.artifact_type, "application/octet-stream")
    return FileResponse(path, media_type=media, filename=art.filename)
