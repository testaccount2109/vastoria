"""IDE update checks — version metadata only (no AI execution)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.api.deps import get_db
from vastoria_cloud.schemas.updates import UpdateCheckResponse
from vastoria_cloud.services.updates import UpdateService

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("/check", response_model=UpdateCheckResponse)
async def check_for_updates(
    current: str = Query(..., description="Currently installed IDE version"),
    platform: str = Query("windows_x86_64", description="Target platform"),
    stable_only: bool = Query(True),
    session: AsyncSession = Depends(get_db),
) -> UpdateCheckResponse:
    """Return whether a newer release exists and where to download it."""
    return await UpdateService(session).check(current=current, platform=platform, stable_only=stable_only)


@router.get("/latest", response_model=UpdateCheckResponse)
async def latest_update(
    platform: str = Query("windows_x86_64"),
    stable_only: bool = Query(True),
    session: AsyncSession = Depends(get_db),
) -> UpdateCheckResponse:
    """Latest available update metadata (no current version comparison)."""
    return await UpdateService(session).latest(platform=platform, stable_only=stable_only)
