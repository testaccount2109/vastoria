from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.schemas.sync import (
    SyncDownloadResponse,
    SyncHistoryResponse,
    SyncRollbackRequest,
    SyncRollbackResponse,
    SyncUploadRequest,
    SyncUploadResponse,
)
from vastoria_cloud.services.sync import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/upload", response_model=SyncUploadResponse)
async def sync_upload(
    body: SyncUploadRequest,
    session: AsyncSession = Depends(get_db),
) -> SyncUploadResponse:
    service = SyncService(session)
    try:
        return await service.upload(body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.get("/download/{project_id}", response_model=SyncDownloadResponse)
async def sync_download(
    project_id: str,
    session: AsyncSession = Depends(get_db),
    version: str | None = Query(default=None, description="version_hash"),
) -> SyncDownloadResponse:
    service = SyncService(session)
    try:
        return await service.download(project_id, version)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e


@router.get("/history/{project_id}", response_model=SyncHistoryResponse)
async def sync_history(
    project_id: str,
    session: AsyncSession = Depends(get_db),
) -> SyncHistoryResponse:
    return await SyncService(session).history(project_id)


@router.post("/rollback/{project_id}", response_model=SyncRollbackResponse)
async def sync_rollback(
    project_id: str,
    body: SyncRollbackRequest,
    session: AsyncSession = Depends(get_db),
) -> SyncRollbackResponse:
    service = SyncService(session)
    try:
        head = await service.rollback(project_id, body.version_hash)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e
    return SyncRollbackResponse(
        project_id=project_id,
        head_version_hash=head,
        rolled_back_to=body.version_hash,
    )
