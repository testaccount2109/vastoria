import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.db.models import ArtifactType, BuildArtifactRow, Platform, ReleaseRow
from vastoria_cloud.schemas.releases import ReleaseCreate
from vastoria_cloud.services.releases import ReleaseService


def _releases_json_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "releases.json"


async def seed_releases_if_empty(session: AsyncSession) -> int:
    count = await session.scalar(select(func.count()).select_from(ReleaseRow))
    if count and count > 0:
        return 0

    raw = json.loads(_releases_json_path().read_text(encoding="utf-8"))
    service = ReleaseService(session)
    created = 0

    for item in raw:
        body = ReleaseCreate(
            version=item["version"],
            changelog=item["changelog"],
            prerelease=item.get("prerelease", False),
            tags=item.get("tags", ["windows"]),
            recommended=item.get("recommended", True),
            published_at=datetime.fromisoformat(
                item["published_at"].replace("Z", "+00:00")
            ),
        )
        detail = await service.create_release(body)
        release_row = await session.scalar(
            select(ReleaseRow).where(ReleaseRow.version == detail.version)
        )
        if not release_row:
            continue

        downloads = item.get("downloads", {})
        for artifact_type, spec in downloads.items():
            atype = ArtifactType(artifact_type)
            storage_key = f"{item['version']}/seed-{artifact_type}.bin"
            art = BuildArtifactRow(
                release_id=release_row.id,
                artifact_type=atype.value,
                platform=Platform.WINDOWS_X86_64.value,
                filename=spec["url"].split("/")[-1],
                storage_key=storage_key,
                sha256=spec["sha256"],
                size_bytes=spec["size_bytes"],
                recommended=atype == ArtifactType.INSTALLER,
            )
            session.add(art)
        created += 1

    await session.commit()
    return created


async def seed_models(session: AsyncSession) -> int:
    from vastoria_cloud.services.model_catalog import ModelCatalogService

    return await ModelCatalogService(session).seed_from_file()
