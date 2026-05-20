import { SyncClient } from "./client";
import { projectIdFromPath, versionHashFromManifest } from "./hash";
import {
  buildSnapshot,
  diffManifests,
  filterIncrementalFiles,
  type LocalFileEntry,
} from "./snapshot";
import type {
  LocalSyncState,
  SyncEngineStatus,
  SyncUploadRequest,
} from "./types";

const STORAGE_KEY = "vastoria.sync.state";

export interface SyncEngineOptions {
  baseUrl: string;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  getFileTree: () => Promise<LocalFileEntry[]>;
  onStatus?: (status: SyncEngineStatus) => void;
}

export class SyncEngine {
  private client: SyncClient;
  private opts: SyncEngineOptions;
  private states: Map<string, LocalSyncState> = new Map();

  constructor(options: SyncEngineOptions) {
    this.opts = options;
    this.client = new SyncClient({ baseUrl: options.baseUrl });
    this.loadStates();
  }

  private loadStates(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as LocalSyncState[];
      for (const s of arr) this.states.set(s.projectId, s);
    } catch {
      /* ignore */
    }
  }

  private persistStates(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...this.states.values()]),
    );
  }

  private setStatus(status: SyncEngineStatus): void {
    this.opts.onStatus?.(status);
  }

  getState(projectId: string): LocalSyncState | undefined {
    return this.states.get(projectId);
  }

  registerProject(rootPath: string): LocalSyncState {
    const projectId = projectIdFromPath(rootPath);
    const existing = this.states.get(projectId);
    if (existing) return existing;
    const state: LocalSyncState = {
      projectId,
      rootPath,
      lastSyncedVersionHash: null,
      pendingUpload: false,
      lastSyncAt: null,
      online: navigator.onLine,
    };
    this.states.set(projectId, state);
    this.persistStates();
    return state;
  }

  async checkOnline(): Promise<boolean> {
    const online = await this.client.ping();
    for (const s of this.states.values()) {
      s.online = online;
    }
    this.persistStates();
    return online;
  }

  /** Local is master: push local snapshot to server when online. */
  async push(rootPath: string, message?: string): Promise<string | null> {
    const state = this.registerProject(rootPath);
    state.pendingUpload = true;
    this.persistStates();
    this.setStatus({ state: "syncing", message: "Building snapshot…" });

    const online = await this.checkOnline();
    if (!online) {
      state.pendingUpload = true;
      this.persistStates();
      this.setStatus({ state: "offline", message: "Server unreachable" });
      return null;
    }

    try {
      const entries = await this.opts.getFileTree();
      const built = await buildSnapshot(entries, {
        readFile: this.opts.readFile,
      });
      const versionHash = await versionHashFromManifest(state.projectId, built.manifest);

      let files = built.files;
      if (state.lastSyncedVersionHash && state.lastSyncedVersionHash !== versionHash) {
        const prev = await this.client.download(
          state.projectId,
          state.lastSyncedVersionHash,
        ).catch(() => null);
        if (prev) {
          const prevManifest = prev.files.map((f) => ({
            path: f.path,
            content_hash: f.content_hash,
          }));
          const { added, changed } = diffManifests(prevManifest, built.manifest);
          const changedSet = new Set([...added, ...changed]);
          files = filterIncrementalFiles(built.files, changedSet);
        }
      }

      const body: SyncUploadRequest = {
        project_id: state.projectId,
        parent_version_hash: state.lastSyncedVersionHash,
        incremental: Boolean(state.lastSyncedVersionHash),
        message: message ?? `Sync ${new Date().toISOString()}`,
        tree: built.tree,
        files,
      };

      const res = await this.client.upload(body);
      state.lastSyncedVersionHash = res.version_hash;
      state.pendingUpload = false;
      state.lastSyncAt = new Date().toISOString();
      state.online = true;
      this.persistStates();
      this.setStatus({
        state: "idle",
        message: "Sync complete",
        lastVersionHash: res.version_hash,
      });
      return res.version_hash;
    } catch (e) {
      state.pendingUpload = true;
      this.persistStates();
      const msg = e instanceof Error ? e.message : "Sync failed";
      this.setStatus({ state: "error", message: msg });
      return null;
    }
  }

  /** Pull server head and apply to local workspace (explicit user action). */
  async pull(rootPath: string, versionHash?: string): Promise<void> {
    const state = this.registerProject(rootPath);
    const online = await this.checkOnline();
    if (!online) {
      this.setStatus({ state: "offline", message: "Cannot pull while offline" });
      return;
    }

    this.setStatus({ state: "syncing", message: "Downloading snapshot…" });
    try {
      const snap = await this.client.download(state.projectId, versionHash);
      for (const file of snap.files) {
        if (file.content != null) {
          const abs = `${state.rootPath}/${file.path}`;
          await this.opts.writeFile(abs, file.content);
        }
      }
      state.lastSyncedVersionHash = snap.version_hash;
      state.lastSyncAt = new Date().toISOString();
      this.persistStates();
      this.setStatus({
        state: "idle",
        message: "Download applied",
        lastVersionHash: snap.version_hash,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pull failed";
      this.setStatus({ state: "error", message: msg });
    }
  }

  async history(rootPath: string) {
    const state = this.registerProject(rootPath);
    return this.client.history(state.projectId);
  }

  async rollback(rootPath: string, versionHash: string): Promise<void> {
    const state = this.registerProject(rootPath);
    const online = await this.checkOnline();
    if (!online) {
      this.setStatus({ state: "offline", message: "Cannot rollback while offline" });
      return;
    }
    await this.client.rollback(state.projectId, versionHash);
    await this.pull(rootPath, versionHash);
    this.setStatus({
      state: "idle",
      message: `Rolled back to ${versionHash.slice(0, 8)}…`,
      lastVersionHash: versionHash,
    });
  }

  /** Flush pending uploads when coming back online. */
  async flushPending(): Promise<void> {
    for (const state of this.states.values()) {
      if (state.pendingUpload) {
        await this.push(state.rootPath);
      }
    }
  }
}
