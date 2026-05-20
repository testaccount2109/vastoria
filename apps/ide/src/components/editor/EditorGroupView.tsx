import { MonacoPane } from "./MonacoPane";
import { TabBar } from "./TabBar";
import type { EditorGroup } from "@/stores/editorStore";
import { useEditorStore } from "@/stores/editorStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useCommandStore } from "@/stores/commandStore";
import { cn } from "@/lib/utils";

interface EditorGroupViewProps {
  group: EditorGroup;
  isActiveGroup: boolean;
}

export function EditorGroupView({ group, isActiveGroup }: EditorGroupViewProps) {
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);

  const activeTab = group.tabs.find((t) => t.id === group.activeTabId);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden border-r border-vast-border last:border-r-0",
        isActiveGroup && "ring-1 ring-vast-accent/30 ring-inset",
      )}
    >
      <TabBar
        group={group}
        isActiveGroup={isActiveGroup}
        onSelectTab={(tabId) => setActiveTab(group.id, tabId)}
        onCloseTab={(tabId) => closeTab(group.id, tabId)}
        onFocusGroup={() => setActiveGroup(group.id)}
      />
      <div
        className="min-h-0 flex-1"
        onMouseDown={() => setActiveGroup(group.id)}
      >
        {activeTab ? (
          <MonacoPane
            tab={activeTab}
            onChange={(content) => updateTabContent(group.id, activeTab.id, content)}
          />
        ) : (
          <WelcomePane />
        )}
      </div>
    </div>
  );
}

function WelcomePane() {
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);
  const openPath = useWorkspaceStore((s) => s.openPath);
  const openPalette = useCommandStore((s) => s.open);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-vast-fg-muted">
      <div className="text-center">
        <h1 className="text-2xl font-light text-vast-fg">Vastoria</h1>
        <p className="mt-1 text-sm">Linux-first AI IDE</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void openFolder()}
          className="rounded bg-vast-accent px-4 py-2 text-sm text-white hover:bg-vast-accent-hover"
        >
          Open Folder
        </button>
        <button
          type="button"
          onClick={openPalette}
          className="rounded border border-vast-border px-4 py-2 text-sm hover:bg-vast-bg-hover"
        >
          Command Palette
        </button>
      </div>
      {recentProjects.length > 0 && (
        <div className="text-sm">
          <p className="mb-2 text-center text-xs uppercase">Recent</p>
          <ul className="space-y-1">
            {recentProjects.slice(0, 5).map((p) => (
              <li key={p.path}>
                <button
                  type="button"
                  className="hover:text-vast-fg"
                  onClick={() => void openPath(p.path)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs">
        <kbd className="rounded bg-vast-bg-elevated px-1.5 py-0.5">Ctrl+Shift+P</kbd> command
        palette
      </p>
    </div>
  );
}
