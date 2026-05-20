from pydantic import BaseModel

from vastoria_cloud.schemas.releases import DownloadAsset, ReleaseDownloads


class LatestDownloadResponse(BaseModel):
    version: str
    platform: str = "windows_x86_64"
    recommended: bool
    prerelease: bool
    downloads: ReleaseDownloads


class WindowsBuildSummary(BaseModel):
    version: str
    prerelease: bool
    recommended: bool
    published_at: str
    has_installer: bool
    has_portable: bool
    has_msi: bool


class WindowsBuildsResponse(BaseModel):
    platform: str = "windows_x86_64"
    builds: list[WindowsBuildSummary]
    total: int
