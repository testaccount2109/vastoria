import { Cloud, CloudOff, Download, History, Upload } from "lucide-react";
import { useEffect } from "react";
import { useSync } from "@/hooks/useSync";
import { projectIdForRoot } from "@/stores/syncStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { ServiceConnections } from "@/components/connections/ServiceConnections";
import { cn } from "@/lib/utils";

export function SyncPanel() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const { status, versions, hasWorkspace, syncNow, pull, loadHistory, rollback } =
    useSync();

  useEffect(() => {
    if (hasWorkspace) void loadHistory();
  }, [hasWorkspace, loadHistory]);

  if (!rootPath) {
    return (
      <p className="p-4 text-sm text-vast-fg-muted">
        Open a folder to enable project sync.
      </p>
    );
  }

  const projectId = projectIdForRoot(rootPath);

  return (
    <div className="flex h-full flex-col p-3 text-sm">
      <div className="mb-3 flex items-center gap-2">
        {status.state === "offline" ? (
          <CloudOff size={16} className="text-vast-fg-muted" />
        ) : (
          <Cloud size={16} className="text-vast-accent" />
        )}
        <span className="font-medium text-vast-fg">Project Sync</span>
      </div>
      <p className="mb-1 truncate text-xs text-vast-fg-muted" title={projectId}>
        {projectId}
      </p>
      <p
        className={cn(
          "mb-3 text-xs",
          status.state === "error" ? "text-red-400" : "text-vast-fg-muted",
        )}
      >
        {status.message ?? status.state}
        {status.lastVersionHash && (
          <span className="block truncate">v {status.lastVersionHash.slice(0, 12)}…</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Upload} label="Push" onClick={() => void syncNow()} />
        <ActionButton icon={Download} label="Pull head" onClick={() => void pull()} />
        <ActionButton icon={History} label="History" onClick={() => void loadHistory()} />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs font-semibold uppercase text-vast-fg-muted">
          Versions
        </p>
        {versions.length === 0 ? (
          <p className="text-xs text-vast-fg-muted">No remote snapshots yet.</p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => (
              <li
                key={v.version_hash}
                className="rounded border border-vast-border bg-vast-bg px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs">
                    {v.version_hash.slice(0, 10)}…
                    {v.is_head && (
                      <span className="ml-1 text-vast-accent">head</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-vast-accent hover:underline"
                    onClick={() => void rollback(v.version_hash)}
                  >
                    Rollback
                  </button>
                </div>
                <p className="text-xs text-vast-fg-muted">
                  {new Date(v.created_at).toLocaleString()} · {v.file_count} files
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ServiceConnections />
      <p className="mt-2 text-xs text-vast-fg-muted">
        Local workspace is master. Sync runs when online.
      </p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Upload;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded border border-vast-border px-2 py-1 text-xs hover:bg-vast-bg-hover"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
