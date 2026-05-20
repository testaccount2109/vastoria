import { ServiceConnections } from "@/components/connections/ServiceConnections";
import { useEditorStore } from "@/stores/editorStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function StatusBar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const activeTab = useEditorStore((s) => s.getActiveTab());

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between bg-vast-status px-3 text-xs text-white">
      <span className="truncate">{rootPath ?? "No folder opened"}</span>
      <span className="flex gap-4">
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>{activeTab.isDirty ? "Modified" : "Saved"}</span>
          </>
        )}
        <ServiceConnections compact />
        <span>Windows</span>
      </span>
    </footer>
  );
}
