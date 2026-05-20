from pydantic import BaseModel

from vastoria_cloud.schemas.releases import ReleaseDownloads


class UpdateCheckResponse(BaseModel):
    update_available: bool
    current_version: str | None = None
    latest_version: str | None = None
    prerelease: bool = False
    changelog: str | None = None
    downloads: ReleaseDownloads | None = None
