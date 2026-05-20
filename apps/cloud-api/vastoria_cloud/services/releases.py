import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from vastoria_cloud.config import get_settings
from vastoria_cloud.db.models import ArtifactType, BuildArtifactRow, Platform, ReleaseRow
from vastoria_cloud.schemas.releases import (
    ArtifactInfo,
    ArtifactUploadResponse,
    DownloadAsset,
    Release,
    ReleaseCreate,
    ReleaseDetail,
    ReleaseDownloads,
    ReleaseUpdate,
)
from vastoria_cloud.services.artifact_storage import artifact_storage


class ReleaseService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._settings = get_settings()

    def _cdn_public_url(self, version: str, filename: str) -> str | None:
        downloads = self._settings.downloads_base_url.rstrip("/")
        api = self._settings.public_base_url.rstrip("/")
        if not downloads:
            return None
        ver = version if version.startswith("v") else f"v{version}"
        if downloads == api or downloads == api.removesuffix("/api"):
            base = api.removesuffix("/api") if api.endswith("/api") else api
            return f"{base}/downloads/windows/{ver}/{filename}"
        return f"{downloads}/windows/{ver}/{filename}"

    def _artifact_url(self, version: str, filename: str, artifact_id: int) -> str:
        cdn = self._cdn_public_url(version, filename)
        if cdn:
            return cdn
        base = self._settings.public_base_url.rstrip("/")
        return f"{base}/downloads/artifacts/{artifact_id}/file"

    def _row_to_release(self, row: ReleaseRow) -> Release:
        downloads = ReleaseDownloads()
        for art in row.artifacts:
            if art.platform != Platform.WINDOWS_X86_64.value:
                continue
            asset = DownloadAsset(
                url=self._artifact_url(row.version, art.filename, art.id),
                sha256=art.sha256,
                size_bytes=art.size_bytes,
                recommended=art.recommended,
                platform=art.platform,
            )
            if art.artifact_type == ArtifactType.INSTALLER.value:
                downloads.installer = asset
            elif art.artifact_type == ArtifactType.PORTABLE.value:
                downloads.portable = asset
            elif art.artifact_type == ArtifactType.MSI.value:
                downloads.msi = asset

        return Release(
            version=row.version,
            published_at=row.published_at,
            prerelease=row.prerelease,
            changelog=row.changelog,
            tags=json.loads(row.tags or "[]"),
            recommended=row.recommended,
            downloads=downloads,
        )

    def _row_to_detail(self, row: ReleaseRow) -> ReleaseDetail:
        base = self._row_to_release(row)
        artifacts = [
            ArtifactInfo(
                id=a.id,
                artifact_type=a.artifact_type,
                platform=a.platform,
                filename=a.filename,
                sha256=a.sha256,
                size_bytes=a.size_bytes,
                recommended=a.recommended,
                download_url=self._artifact_url(row.version, a.filename, a.id),
            )
            for a in row.artifacts
            if a.platform == Platform.WINDOWS_X86_64.value
        ]
        return ReleaseDetail(**base.model_dump(), artifacts=artifacts)

    async def list_releases(
        self,
        *,
        include_prerelease: bool = True,
        windows_only: bool = True,
    ) -> list[Release]:
        stmt = (
            select(ReleaseRow)
            .options(selectinload(ReleaseRow.artifacts))
            .order_by(ReleaseRow.published_at.desc())
        )
        rows = (await self._session.scalars(stmt)).all()
        releases = [self._row_to_release(r) for r in rows]
        if not include_prerelease:
            releases = [r for r in releases if not r.prerelease]
        if windows_only:
            releases = [
                r
                for r in releases
                if r.downloads.installer is not None
                or r.downloads.portable is not None
                or r.downloads.msi is not None
            ]
        return releases

    async def get_release(self, version: str) -> ReleaseDetail | None:
        stmt = (
            select(ReleaseRow)
            .where(ReleaseRow.version == version)
            .options(selectinload(ReleaseRow.artifacts))
        )
        row = await self._session.scalar(stmt)
        return self._row_to_detail(row) if row else None

    async def get_latest(self, *, stable_only: bool = True) -> Release | None:
        releases = await self.list_releases(include_prerelease=not stable_only)
        for release in releases:
            if (
                release.downloads.installer
                or release.downloads.portable
                or release.downloads.msi
            ):
                return release
        return releases[0] if releases else None

    async def create_release(self, body: ReleaseCreate) -> ReleaseDetail:
        existing = await self._session.scalar(
            select(ReleaseRow).where(ReleaseRow.version == body.version)
        )
        if existing:
            raise ValueError(f"Release {body.version} already exists")

        published = body.published_at or datetime.now(timezone.utc)
        row = ReleaseRow(
            version=body.version,
            changelog=body.changelog,
            prerelease=body.prerelease,
            tags=json.dumps(body.tags),
            recommended=body.recommended,
            published_at=published,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row, ["artifacts"])
        return self._row_to_detail(row)

    async def update_release(self, version: str, body: ReleaseUpdate) -> ReleaseDetail:
        row = await self._session.scalar(
            select(ReleaseRow)
            .where(ReleaseRow.version == version)
            .options(selectinload(ReleaseRow.artifacts))
        )
        if not row:
            raise ValueError(f"Release {version} not found")

        if body.changelog is not None:
            row.changelog = body.changelog
        if body.prerelease is not None:
            row.prerelease = body.prerelease
        if body.tags is not None:
            row.tags = json.dumps(body.tags)
        if body.recommended is not None:
            row.recommended = body.recommended

        await self._session.commit()
        await self._session.refresh(row, ["artifacts"])
        return self._row_to_detail(row)

    async def upload_artifact(
        self,
        version: str,
        artifact_type: ArtifactType,
        filename: str,
        data: bytes,
        *,
        recommended: bool | None = None,
    ) -> ArtifactUploadResponse:
        if len(data) > self._settings.max_artifact_bytes:
            raise ValueError("Artifact exceeds max size")

        row = await self._session.scalar(
            select(ReleaseRow)
            .where(ReleaseRow.version == version)
            .options(selectinload(ReleaseRow.artifacts))
        )
        if not row:
            raise ValueError(f"Release {version} not found")

        storage_key = f"{version}/{filename}"
        sha256, size = artifact_storage.write_stream(storage_key, data)

        if recommended is None:
            recommended = artifact_type == ArtifactType.INSTALLER

        existing = next(
            (a for a in row.artifacts if a.artifact_type == artifact_type.value),
            None,
        )
        if existing:
            artifact_storage.delete(existing.storage_key)
            existing.filename = filename
            existing.storage_key = storage_key
            existing.sha256 = sha256
            existing.size_bytes = size
            existing.recommended = recommended
            art = existing
        else:
            art = BuildArtifactRow(
                release_id=row.id,
                artifact_type=artifact_type.value,
                platform=Platform.WINDOWS_X86_64.value,
                filename=filename,
                storage_key=storage_key,
                sha256=sha256,
                size_bytes=size,
                recommended=recommended,
            )
            self._session.add(art)

        await self._session.commit()
        await self._session.refresh(art)

        info = ArtifactInfo(
            id=art.id,
            artifact_type=art.artifact_type,
            platform=art.platform,
            filename=art.filename,
            sha256=art.sha256,
            size_bytes=art.size_bytes,
            recommended=art.recommended,
            download_url=self._artifact_url(version, art.filename, art.id),
        )
        return ArtifactUploadResponse(artifact=info, release_version=version)

    async def get_artifact_row(self, artifact_id: int) -> BuildArtifactRow | None:
        return await self._session.get(BuildArtifactRow, artifact_id)
