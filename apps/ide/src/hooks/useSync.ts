import { useCallback, useEffect } from "react";
import { useSyncStore } from "@/stores/syncStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

/**
 * Offline-first sync hook — local workspace is always master.
 * Push uploads when online; pending uploads flush on reconnect.
 */
export function useSync() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const status = useSyncStore((s) => s.status);
  const versions = useSyncStore((s) => s.versions);
  const initEngine = useSyncStore((s) => s.initEngine);
  const push = useSyncStore((s) => s.push);
  const pull = useSyncStore((s) => s.pull);
  const loadHistory = useSyncStore((s) => s.loadHistory);
  const rollback = useSyncStore((s) => s.rollback);
  const flushPending = useSyncStore((s) => s.flushPending);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  useEffect(() => {
    if (!rootPath) return;
    const engine = useSyncStore.getState().engine;
    engine?.registerProject(rootPath);
  }, [rootPath]);

  useEffect(() => {
    const onOnline = () => void flushPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushPending]);

  const syncNow = useCallback(
    async (message?: string) => {
      await push(message);
      await loadHistory();
    },
    [push, loadHistory],
  );

  return {
    status,
    versions,
    isOnline: status.state !== "offline",
    hasWorkspace: Boolean(rootPath),
    syncNow,
    push,
    pull,
    loadHistory,
    rollback,
    flushPending,
  };
}
