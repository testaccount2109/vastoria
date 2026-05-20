from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.auth.stub import require_admin_stub
from vastoria_cloud.db.models import ArtifactType
from vastoria_cloud.schemas.releases import (
    ArtifactUploadResponse,
    LatestReleaseResponse,
    Release,
    ReleaseCreate,
    ReleaseDetail,
    ReleaseListResponse,
    ReleaseUpdate,
)
from vastoria_cloud.services.releases import ReleaseService

router = APIRouter(prefix="/releases", tags=["releases"])


def _service(session: AsyncSession) -> ReleaseService:
    return ReleaseService(session)


@router.get("", response_model=ReleaseListResponse)
async def list_releases(
    session: AsyncSession = Depends(get_db),
    include_prerelease: bool = Query(True),
    windows_only: bool = Query(False, description="Only releases with Windows artifacts"),
) -> ReleaseListResponse:
    releases = await _service(session).list_releases(
        include_prerelease=include_prerelease,
        windows_only=windows_only,
    )
    return ReleaseListResponse(releases=releases, total=len(releases))


@router.get("/latest", response_model=LatestReleaseResponse)
async def latest_release(
    session: AsyncSession = Depends(get_db),
    include_prerelease: bool = Query(False),
) -> LatestReleaseResponse:
    release = await _service(session).get_latest(stable_only=not include_prerelease)
    if release is None:
        raise HTTPException(status_code=404, detail="No releases found")
    return LatestReleaseResponse(release=release)


@router.get("/{version}", response_model=ReleaseDetail)
async def get_release(
    version: str,
    session: AsyncSession = Depends(get_db),
) -> ReleaseDetail:
    release = await _service(session).get_release(version)
    if release is None:
        raise HTTPException(status_code=404, detail=f"Release {version} not found")
    return release


@router.post("", response_model=ReleaseDetail, status_code=201)
async def create_release(
    body: ReleaseCreate,
    session: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin_stub),
) -> ReleaseDetail:
    try:
        return await _service(session).create_release(body)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.patch("/{version}", response_model=ReleaseDetail)
async def update_release(
    version: str,
    body: ReleaseUpdate,
    session: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin_stub),
) -> ReleaseDetail:
    try:
        return await _service(session).update_release(version, body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{version}/artifacts", response_model=ArtifactUploadResponse)
async def upload_artifact(
    version: str,
    session: AsyncSession = Depends(get_db),
    _admin=Depends(require_admin_stub),
    artifact_type: ArtifactType = Form(...),
    file: UploadFile = File(...),
    recommended: bool | None = Form(default=None),
) -> ArtifactUploadResponse:
    data = await file.read()
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    try:
        return await _service(session).upload_artifact(
            version,
            artifact_type,
            file.filename,
            data,
            recommended=recommended,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
