import { create } from "zustand";
import { projectIdFromPath, type SyncEngineStatus, type SyncVersionInfo } from "@vastoria/sync-client";
import { createSyncEngine } from "@/lib/sync/engine";
import { getSyncApiUrl } from "@/stores/settingsStore";
import { useWorkspaceStore } from "./workspaceStore";

interface SyncState {
  engine: ReturnType<typeof createSyncEngine> | null;
  status: SyncEngineStatus;
  versions: SyncVersionInfo[];
  isPanelOpen: boolean;
  initEngine: () => void;
  push: (message?: string) => Promise<void>;
  pull: (versionHash?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  rollback: (versionHash: string) => Promise<void>;
  flushPending: () => Promise<void>;
  setPanelOpen: (open: boolean) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  engine: null,
  status: { state: "idle" },
  versions: [],
  isPanelOpen: false,

  initEngine: () => {
    if (get().engine) return;
    const engine = createSyncEngine(
      () => useWorkspaceStore.getState().rootPath,
      (status) => set({ status }),
    );
    set({ engine });

    const onOnline = () => void get().flushPending();
    window.addEventListener("online", onOnline);
  },

  push: async (message) => {
    if (!getSyncApiUrl()) {
      set({ status: { state: "offline", message: "Cloud sync disabled" } });
      return;
    }
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;
    get().initEngine();
    const engine = get().engine!;
    engine.registerProject(rootPath);
    await engine.push(rootPath, message);
  },

  pull: async (versionHash) => {
    if (!getSyncApiUrl()) return;
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;
    get().initEngine();
    await get().engine!.pull(rootPath, versionHash);
    await useWorkspaceStore.getState().refreshTree();
  },

  loadHistory: async () => {
    if (!getSyncApiUrl()) return;
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;
    get().initEngine();
    const hist = await get().engine!.history(rootPath);
    set({ versions: hist.versions });
  },

  rollback: async (versionHash) => {
    if (!getSyncApiUrl()) return;
    const rootPath = useWorkspaceStore.getState().rootPath;
    if (!rootPath) return;
    get().initEngine();
    await get().engine!.rollback(rootPath, versionHash);
    await useWorkspaceStore.getState().refreshTree();
    await get().loadHistory();
  },

  flushPending: async () => {
    if (!getSyncApiUrl()) return;
    get().initEngine();
    await get().engine!.flushPending();
  },

  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
}));

export function projectIdForRoot(rootPath: string): string {
  return projectIdFromPath(rootPath);
}
