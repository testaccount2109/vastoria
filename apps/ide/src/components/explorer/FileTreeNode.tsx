import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileEntry } from "@/lib/ipc";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useEditorStore } from "@/stores/editorStore";

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
}

export function FileTreeNode({ entry, depth }: FileTreeNodeProps) {
  const expandedPaths = useWorkspaceStore((s) => s.expandedPaths);
  const toggleExpanded = useWorkspaceStore((s) => s.toggleExpanded);
  const openFile = useEditorStore((s) => s.openFile);

  const isExpanded = expandedPaths.has(entry.path);
  const hasChildren = entry.isDirectory && (entry.children?.length ?? 0) > 0;

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleExpanded(entry.path);
    } else {
      void openFile(entry.path);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 py-0.5 pr-2 text-left text-sm hover:bg-vast-bg-hover",
          "text-vast-fg",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {entry.isDirectory ? (
          <>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={16} className="shrink-0 text-vast-fg-muted" />
              ) : (
                <ChevronRight size={16} className="shrink-0 text-vast-fg-muted" />
              )
            ) : (
              <span className="w-4 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen size={16} className="shrink-0 text-vast-accent" />
            ) : (
              <Folder size={16} className="shrink-0 text-vast-accent" />
            )}
          </>
        ) : (
          <>
            <span className="w-4 shrink-0" />
            <File size={16} className="shrink-0 text-vast-fg-muted" />
          </>
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {entry.isDirectory && isExpanded && entry.children?.map((child) => (
        <FileTreeNode key={child.path} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}
