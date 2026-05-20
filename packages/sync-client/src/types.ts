export interface FileSnapshotNode {
  path: string;
  is_directory: boolean;
  content_hash?: string | null;
  size?: number | null;
  children: FileSnapshotNode[];
}

export interface SnapshotTree {
  nodes: FileSnapshotNode[];
}

export interface FilePayload {
  path: string;
  content_hash: string;
  content?: string | null;
  encoding?: string;
}

export interface SyncUploadRequest {
  project_id: string;
  parent_version_hash?: string | null;
  incremental: boolean;
  message?: string | null;
  tree: SnapshotTree;
  files: FilePayload[];
}

export interface SyncUploadResponse {
  project_id: string;
  version_hash: string;
  parent_version_hash: string | null;
  created_at: string;
  files_uploaded: number;
  files_skipped: number;
  incremental: boolean;
}

export interface SyncVersionInfo {
  version_hash: string;
  parent_version_hash: string | null;
  created_at: string;
  message?: string | null;
  file_count: number;
  is_head: boolean;
}

export interface SyncHistoryResponse {
  project_id: string;
  versions: SyncVersionInfo[];
  head_version_hash: string | null;
}

export interface SyncDownloadResponse {
  project_id: string;
  version_hash: string;
  parent_version_hash: string | null;
  created_at: string;
  tree: SnapshotTree;
  files: FilePayload[];
}

export interface LocalSyncState {
  projectId: string;
  rootPath: string;
  lastSyncedVersionHash: string | null;
  pendingUpload: boolean;
  lastSyncAt: string | null;
  online: boolean;
}

export interface SyncEngineStatus {
  state: "idle" | "syncing" | "offline" | "error";
  message?: string;
  lastVersionHash?: string | null;
}
