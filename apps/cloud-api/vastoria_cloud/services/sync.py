import json
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from vastoria_cloud.config import get_settings
from vastoria_cloud.db.models import ProjectRow, SnapshotFileRow, SnapshotVersionRow
from vastoria_cloud.schemas.sync import (
    FilePayload,
    FileSnapshotNode,
    SnapshotTree,
    SyncDownloadResponse,
    SyncHistoryResponse,
    SyncUploadRequest,
    SyncUploadResponse,
    SyncVersionInfo,
)
from vastoria_cloud.services.hashing import flatten_tree, version_hash_for_project
from vastoria_cloud.services.storage import blob_storage


class SyncService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._settings = get_settings()

    async def upload(self, req: SyncUploadRequest) -> SyncUploadResponse:
        manifest_entries = flatten_tree(req.tree.nodes)
        version_hash = version_hash_for_project(req.project_id, manifest_entries)

        existing = await self._session.get(SnapshotVersionRow, version_hash)
        if existing:
            return SyncUploadResponse(
                project_id=req.project_id,
                version_hash=version_hash,
                parent_version_hash=existing.parent_version_hash,
                created_at=existing.created_at.isoformat(),
                files_uploaded=0,
                files_skipped=len(req.files),
                incremental=req.incremental,
            )

        if req.parent_version_hash:
            parent = await self._session.get(SnapshotVersionRow, req.parent_version_hash)
            if not parent or parent.project_id != req.project_id:
                raise ValueError("Invalid parent_version_hash for project")

        uploaded = 0
        skipped = 0
        for fp in req.files:
            if len(fp.content or "") > self._settings.max_file_bytes:
                raise ValueError(f"File too large: {fp.path}")
            if fp.content is None:
                if blob_storage.exists(fp.content_hash):
                    skipped += 1
                    continue
                raise ValueError(f"Missing content for new hash: {fp.path}")
            blob_storage.write(fp.content_hash, fp.content)
            uploaded += 1

        project = await self._session.get(ProjectRow, req.project_id)
        if not project:
            project = ProjectRow(project_id=req.project_id)
            self._session.add(project)

        await self._session.execute(
            update(SnapshotVersionRow)
            .where(SnapshotVersionRow.project_id == req.project_id)
            .values(is_head=False)
        )

        now = datetime.now(timezone.utc)
        version = SnapshotVersionRow(
            version_hash=version_hash,
            project_id=req.project_id,
            parent_version_hash=req.parent_version_hash,
            tree_json=req.tree.model_dump_json(),
            manifest_json=json.dumps(manifest_entries),
            message=req.message,
            file_count=len(manifest_entries),
            is_head=True,
        )
        self._session.add(version)

        for entry in manifest_entries:
            self._session.add(
                SnapshotFileRow(
                    version_hash=version_hash,
                    path=entry["path"],
                    content_hash=entry["content_hash"],
                )
            )

        project.head_version_hash = version_hash
        await self._session.commit()

        return SyncUploadResponse(
            project_id=req.project_id,
            version_hash=version_hash,
            parent_version_hash=req.parent_version_hash,
            created_at=now.isoformat(),
            files_uploaded=uploaded,
            files_skipped=skipped,
            incremental=req.incremental,
        )

    async def history(self, project_id: str) -> SyncHistoryResponse:
        result = await self._session.execute(
            select(SnapshotVersionRow)
            .where(SnapshotVersionRow.project_id == project_id)
            .order_by(SnapshotVersionRow.created_at.desc())
        )
        versions = result.scalars().all()
        project = await self._session.get(ProjectRow, project_id)

        return SyncHistoryResponse(
            project_id=project_id,
            head_version_hash=project.head_version_hash if project else None,
            versions=[
                SyncVersionInfo(
                    version_hash=v.version_hash,
                    parent_version_hash=v.parent_version_hash,
                    created_at=v.created_at.isoformat(),
                    message=v.message,
                    file_count=v.file_count,
                    is_head=v.is_head,
                )
                for v in versions
            ],
        )

    async def download(
        self, project_id: str, version_hash: str | None = None
    ) -> SyncDownloadResponse:
        if version_hash:
            version = await self._session.get(SnapshotVersionRow, version_hash)
        else:
            project = await self._session.get(ProjectRow, project_id)
            if not project or not project.head_version_hash:
                raise ValueError("No snapshots for project")
            version = await self._session.get(
                SnapshotVersionRow, project.head_version_hash
            )

        if not version or version.project_id != project_id:
            raise ValueError("Snapshot not found")

        tree = SnapshotTree.model_validate_json(version.tree_json)
        files: list[FilePayload] = []

        result = await self._session.execute(
            select(SnapshotFileRow).where(
                SnapshotFileRow.version_hash == version.version_hash
            )
        )
        for row in result.scalars().all():
            content = blob_storage.read(row.content_hash)
            files.append(
                FilePayload(
                    path=row.path,
                    content_hash=row.content_hash,
                    content=content,
                )
            )

        return SyncDownloadResponse(
            project_id=project_id,
            version_hash=version.version_hash,
            parent_version_hash=version.parent_version_hash,
            created_at=version.created_at.isoformat(),
            tree=tree,
            files=files,
        )

    async def rollback(self, project_id: str, version_hash: str) -> str:
        version = await self._session.get(SnapshotVersionRow, version_hash)
        if not version or version.project_id != project_id:
            raise ValueError("Version not found")

        await self._session.execute(
            update(SnapshotVersionRow)
            .where(SnapshotVersionRow.project_id == project_id)
            .values(is_head=False)
        )
        version.is_head = True
        project = await self._session.get(ProjectRow, project_id)
        if project:
            project.head_version_hash = version_hash
        await self._session.commit()
        return version_hash

    def diff_manifests(
        self,
        old_entries: list[dict],
        new_entries: list[dict],
    ) -> tuple[list[str], list[str], list[str]]:
        old_map = {e["path"]: e["content_hash"] for e in old_entries}
        new_map = {e["path"]: e["content_hash"] for e in new_entries}
        added = [p for p in new_map if p not in old_map]
        removed = [p for p in old_map if p not in new_map]
        changed = [
            p for p in new_map if p in old_map and new_map[p] != old_map[p]
        ]
        return added, removed, changed
