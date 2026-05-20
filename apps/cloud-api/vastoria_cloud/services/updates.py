from packaging.version import InvalidVersion, Version

from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.schemas.updates import UpdateCheckResponse
from vastoria_cloud.services.releases import ReleaseService


class UpdateService:
    def __init__(self, session: AsyncSession) -> None:
        self._releases = ReleaseService(session)

    @staticmethod
    def _parse(version: str) -> Version:
        cleaned = version.lstrip("v")
        return Version(cleaned)

    async def check(
        self,
        *,
        current: str,
        platform: str = "windows_x86_64",
        stable_only: bool = True,
    ) -> UpdateCheckResponse:
        latest = await self._releases.get_latest(stable_only=stable_only)
        if latest is None:
            return UpdateCheckResponse(
                update_available=False,
                current_version=current,
                latest_version=None,
            )

        try:
            cur_v = self._parse(current)
            lat_v = self._parse(latest.version)
            available = lat_v > cur_v
        except InvalidVersion:
            available = latest.version != current

        if platform != "windows_x86_64":
            return UpdateCheckResponse(
                update_available=False,
                current_version=current,
                latest_version=latest.version,
                prerelease=latest.prerelease,
            )

        return UpdateCheckResponse(
            update_available=available,
            current_version=current,
            latest_version=latest.version,
            prerelease=latest.prerelease,
            changelog=latest.changelog if available else None,
            downloads=latest.downloads if available else None,
        )

    async def latest(
        self,
        *,
        platform: str = "windows_x86_64",
        stable_only: bool = True,
    ) -> UpdateCheckResponse:
        latest = await self._releases.get_latest(stable_only=stable_only)
        if latest is None:
            return UpdateCheckResponse(update_available=False)

        return UpdateCheckResponse(
            update_available=True,
            latest_version=latest.version,
            prerelease=latest.prerelease,
            changelog=latest.changelog,
            downloads=latest.downloads if platform == "windows_x86_64" else None,
        )
