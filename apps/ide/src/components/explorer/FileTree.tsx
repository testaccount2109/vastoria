import { FileTreeNode } from "./FileTreeNode";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { basename } from "@/lib/utils";

export function FileTree() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const fileTree = useWorkspaceStore((s) => s.fileTree);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);
  const openPath = useWorkspaceStore((s) => s.openPath);
  const openFolder = useWorkspaceStore((s) => s.openFolder);

  if (!rootPath) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm text-vast-fg-muted">
        <p>No folder opened.</p>
        <button
          type="button"
          onClick={() => void openFolder()}
          className="rounded bg-vast-accent px-3 py-1.5 text-left text-white hover:bg-vast-accent-hover"
        >
          Open Folder…
        </button>
        {recentProjects.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide">Recent</p>
            <ul className="space-y-1">
              {recentProjects.map((p) => (
                <li key={p.path}>
                  <button
                    type="button"
                    onClick={() => void openPath(p.path)}
                    className="w-full truncate text-left hover:text-vast-fg"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-vast-fg-muted">
        <span className="truncate" title={rootPath}>
          {basename(rootPath)}
        </span>
        <button
          type="button"
          onClick={() => void openFolder()}
          className="text-vast-accent hover:underline"
        >
          Change
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <p className="px-3 text-sm text-vast-fg-muted">Loading…</p>
        ) : (
          fileTree.map((entry) => (
            <FileTreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
