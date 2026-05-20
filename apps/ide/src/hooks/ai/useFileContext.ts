import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { FileContextPayload } from "@/lib/ipc/types";

export interface UseFileContextOptions {
  /** Max open files to include in context payload */
  maxFiles?: number;
  /** Optional transform before sending to AI layer */
  transform?: (payload: FileContextPayload) => FileContextPayload;
}

/**
 * Builds file context payloads for AI requests — no network calls.
 */
export function useFileContext(options: UseFileContextOptions = {}) {
  const { maxFiles = 8, transform } = options;
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const groups = useEditorStore((s) => s.groups);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const buildContext = useCallback((): FileContextPayload => {
    const activeGroup =
      groups.find((g) => g.id === activeGroupId) ?? groups[0];
    const activeTab = activeGroup?.tabs.find(
      (t) => t.id === activeGroup.activeTabId,
    );

    const openFiles = groups
      .flatMap((g) => g.tabs)
      .filter((t, i, arr) => arr.findIndex((x) => x.path === t.path) === i)
      .slice(0, maxFiles)
      .map((t) => ({
        path: t.path,
        content: t.content,
        language: t.language,
      }));

    const payload: FileContextPayload = {
      cwd: rootPath ?? "",
      openFiles,
      activeFile: activeTab
        ? { path: activeTab.path, selection: undefined }
        : undefined,
    };

    return transform ? transform(payload) : payload;
  }, [groups, activeGroupId, rootPath, maxFiles, transform]);

  const contextPreview = useMemo(() => buildContext(), [buildContext]);

  return {
    buildContext,
    contextPreview,
    hasWorkspace: Boolean(rootPath),
    openFileCount: contextPreview.openFiles.length,
  };
}
