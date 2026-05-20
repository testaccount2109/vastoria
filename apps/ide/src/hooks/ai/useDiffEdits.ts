import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { DiffEdit } from "@/lib/ipc/types";

export interface UseDiffEditsOptions {
  /** Called when user accepts a diff — apply to editor buffer */
  onApply?: (edit: DiffEdit) => void | Promise<void>;
}

export interface PendingDiff extends DiffEdit {
  id: string;
  status: "pending" | "accepted" | "rejected";
}

/**
 * Manages diff-based edit proposals from an external AI layer.
 * Does not compute diffs — only stages and applies them in the UI.
 */
export function useDiffEdits(options: UseDiffEditsOptions = {}) {
  const { onApply } = options;
  const [pending, setPending] = useState<PendingDiff[]>([]);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const groups = useEditorStore((s) => s.groups);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const stageEdits = useCallback((edits: DiffEdit[]) => {
    setPending(
      edits.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        status: "pending" as const,
      })),
    );
  }, []);

  const acceptEdit = useCallback(
    async (id: string) => {
      const edit = pending.find((p) => p.id === id);
      if (!edit) return;

      const group =
        groups.find((g) => g.id === activeGroupId) ?? groups[0];
      const tab = group?.tabs.find((t) => t.path === edit.path);

      if (tab && group) {
        updateTabContent(group.id, tab.id, edit.modified);
      }

      if (onApply) await onApply(edit);

      setPending((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "accepted" } : p)),
      );
    },
    [pending, groups, activeGroupId, updateTabContent, onApply],
  );

  const rejectEdit = useCallback((id: string) => {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
    );
  }, []);

  const clearResolved = useCallback(() => {
    setPending((prev) => prev.filter((p) => p.status === "pending"));
  }, []);

  const pendingCount = pending.filter((p) => p.status === "pending").length;

  return {
    pending,
    pendingCount,
    stageEdits,
    acceptEdit,
    rejectEdit,
    clearResolved,
  };
}
