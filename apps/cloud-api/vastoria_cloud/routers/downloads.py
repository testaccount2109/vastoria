from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.db.models import ArtifactType
from vastoria_cloud.schemas.downloads import LatestDownloadResponse, WindowsBuildsResponse
from vastoria_cloud.schemas.releases import Release
from vastoria_cloud.services.artifact_storage import artifact_storage
from vastoria_cloud.services.downloads import DownloadService
from vastoria_cloud.services.releases import ReleaseService

router = APIRouter(prefix="/downloads", tags=["downloads"])


@router.get("/latest", response_model=LatestDownloadResponse)
async def latest_windows_download(
    session: AsyncSession = Depends(get_db),
    stable_only: bool = Query(True),
) -> LatestDownloadResponse:
    """Latest Windows x64 build."""
    svc = DownloadService(ReleaseService(session))
    result = await svc.latest_windows(stable_only=stable_only)
    if result is None:
        raise HTTPException(status_code=404, detail="No Windows builds available")
    return result


@router.get("/windows", response_model=WindowsBuildsResponse)
async def list_windows_builds(
    session: AsyncSession = Depends(get_db),
    include_prerelease: bool = Query(True),
    recommended_only: bool = Query(
        False,
        description="Filter to releases flagged as recommended",
    ),
) -> WindowsBuildsResponse:
    svc = DownloadService(ReleaseService(session))
    return await svc.list_windows_builds(
        include_prerelease=include_prerelease,
        recommended_only=recommended_only,
    )


@router.get("/{version}", response_model=Release)
async def download_release_manifest(
    version: str,
    session: AsyncSession = Depends(get_db),
) -> Release:
    """Download links for a specific Windows release version."""
    release = await ReleaseService(session).get_release(version)
    if release is None:
        raise HTTPException(status_code=404, detail=f"Release {version} not found")
    if (
        not release.downloads.installer
        and not release.downloads.portable
        and not release.downloads.msi
    ):
        raise HTTPException(status_code=404, detail="No Windows artifacts for this version")
    return release


@router.get("/artifacts/{artifact_id}/file")
async def stream_artifact_file(
    artifact_id: int,
    session: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Stream a build artifact. Stateless — backed by object storage."""
    art = await ReleaseService(session).get_artifact_row(artifact_id)
    if art is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    path = artifact_storage.read_path(art.storage_key)
    if path is None:
        raise HTTPException(status_code=404, detail="Artifact file missing on disk")

    media_map = {
        ArtifactType.INSTALLER.value: "application/x-msdownload",
        ArtifactType.PORTABLE.value: "application/x-msdownload",
        ArtifactType.MSI.value: "application/x-msi",
    }
    media = media_map.get(art.artifact_type, "application/octet-stream")
    return FileResponse(
        path,
        media_type=media,
        filename=art.filename,
    )
