from vastoria_cloud.schemas.downloads import (
    LatestDownloadResponse,
    WindowsBuildSummary,
    WindowsBuildsResponse,
)
from vastoria_cloud.schemas.releases import ReleaseDownloads
from vastoria_cloud.services.releases import ReleaseService


class DownloadService:
    def __init__(self, release_service: ReleaseService) -> None:
        self._releases = release_service

    async def latest_windows(self, *, stable_only: bool = True) -> LatestDownloadResponse | None:
        release = await self._releases.get_latest(stable_only=stable_only)
        if release is None:
            return None

        downloads = ReleaseDownloads(
            installer=release.downloads.installer,
            portable=release.downloads.portable,
            msi=release.downloads.msi,
        )
        if not downloads.installer and not downloads.portable and not downloads.msi:
            return None

        return LatestDownloadResponse(
            version=release.version,
            platform="windows_x86_64",
            recommended=release.recommended,
            prerelease=release.prerelease,
            downloads=downloads,
        )

    async def list_windows_builds(
        self,
        *,
        include_prerelease: bool = True,
        recommended_only: bool = False,
    ) -> WindowsBuildsResponse:
        releases = await self._releases.list_releases(
            include_prerelease=include_prerelease,
            windows_only=True,
        )
        builds: list[WindowsBuildSummary] = []
        for r in releases:
            if recommended_only and not r.recommended:
                continue
            if not r.downloads.installer and not r.downloads.portable and not r.downloads.msi:
                continue
            builds.append(
                WindowsBuildSummary(
                    version=r.version,
                    prerelease=r.prerelease,
                    recommended=r.recommended,
                    published_at=r.published_at.isoformat(),
                    has_installer=r.downloads.installer is not None,
                    has_portable=r.downloads.portable is not None,
                    has_msi=r.downloads.msi is not None,
                )
            )
        return WindowsBuildsResponse(builds=builds, total=len(builds))
