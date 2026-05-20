from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from vastoria_cloud.db.models import ArtifactType


class DownloadAsset(BaseModel):
    url: str
    sha256: str
    size_bytes: int
    recommended: bool = False
    platform: str = "windows_x86_64"


class ReleaseDownloads(BaseModel):
    installer: DownloadAsset | None = None
    portable: DownloadAsset | None = None
    msi: DownloadAsset | None = None


class Release(BaseModel):
    version: str
    published_at: datetime
    prerelease: bool = False
    changelog: str
    tags: list[str] = Field(default_factory=list)
    recommended: bool = False
    downloads: ReleaseDownloads


class ReleaseListResponse(BaseModel):
    releases: list[Release]
    total: int


class LatestReleaseResponse(BaseModel):
    release: Release


class ReleaseCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=64, pattern=r"^[\w.\-+]+$")
    changelog: str = ""
    prerelease: bool = False
    tags: list[str] = Field(default_factory=list)
    recommended: bool = True
    published_at: datetime | None = None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        return [t.strip().lower() for t in v if t.strip()]


class ReleaseUpdate(BaseModel):
    changelog: str | None = None
    prerelease: bool | None = None
    tags: list[str] | None = None
    recommended: bool | None = None


class ArtifactInfo(BaseModel):
    id: int
    artifact_type: str
    platform: str
    filename: str
    sha256: str
    size_bytes: int
    recommended: bool
    download_url: str


class ReleaseDetail(Release):
    artifacts: list[ArtifactInfo] = Field(default_factory=list)


class ArtifactUploadResponse(BaseModel):
    artifact: ArtifactInfo
    release_version: str
