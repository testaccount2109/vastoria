import { FileTree } from "@/components/explorer/FileTree";
import { SyncPanel } from "@/components/sync/SyncPanel";
import { useLayoutStore } from "@/stores/layoutStore";

export function Sidebar() {
  const activeActivity = useLayoutStore((s) => s.activeActivity);

  return (
    <div className="flex h-full flex-col bg-vast-sidebar">
      <div className="border-b border-vast-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vast-fg-muted">
        {activeActivity === "explorer" && "Explorer"}
        {activeActivity === "sync" && "Sync"}
        {activeActivity === "search" && "Search"}
        {activeActivity === "git" && "Source Control"}
        {activeActivity === "extensions" && "Extensions"}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeActivity === "explorer" && <FileTree />}
        {activeActivity === "sync" && <SyncPanel />}
        {activeActivity === "search" && (
          <p className="p-4 text-sm text-vast-fg-muted">Search — coming soon</p>
        )}
        {activeActivity === "git" && (
          <p className="p-4 text-sm text-vast-fg-muted">
            Git backup — use terminal or external tools
          </p>
        )}
        {activeActivity === "extensions" && (
          <p className="p-4 text-sm text-vast-fg-muted">Extensions — coming soon</p>
        )}
      </div>
    </div>
  );
}
