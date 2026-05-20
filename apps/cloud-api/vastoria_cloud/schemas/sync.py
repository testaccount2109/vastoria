from pydantic import BaseModel, Field


class FileSnapshotNode(BaseModel):
    path: str
    is_directory: bool = False
    content_hash: str | None = None
    size: int | None = None
    children: list["FileSnapshotNode"] = Field(default_factory=list)


class FilePayload(BaseModel):
    path: str
    content_hash: str
    content: str | None = None
    encoding: str = "utf-8"


class SnapshotTree(BaseModel):
    nodes: list[FileSnapshotNode] = Field(default_factory=list)


class SyncUploadRequest(BaseModel):
    project_id: str
    parent_version_hash: str | None = None
    incremental: bool = True
    message: str | None = None
    tree: SnapshotTree
    files: list[FilePayload] = Field(default_factory=list)


class SyncUploadResponse(BaseModel):
    project_id: str
    version_hash: str
    parent_version_hash: str | None
    created_at: str
    files_uploaded: int
    files_skipped: int
    incremental: bool


class SyncVersionInfo(BaseModel):
    version_hash: str
    parent_version_hash: str | None
    created_at: str
    message: str | None = None
    file_count: int
    is_head: bool = False


class SyncHistoryResponse(BaseModel):
    project_id: str
    versions: list[SyncVersionInfo]
    head_version_hash: str | None


class SyncDownloadResponse(BaseModel):
    project_id: str
    version_hash: str
    parent_version_hash: str | None
    created_at: str
    tree: SnapshotTree
    files: list[FilePayload]


class SyncRollbackRequest(BaseModel):
    version_hash: str


class SyncRollbackResponse(BaseModel):
    project_id: str
    head_version_hash: str
    rolled_back_to: str
