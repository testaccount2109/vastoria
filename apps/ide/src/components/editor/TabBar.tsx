import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorGroup } from "@/stores/editorStore";

interface TabBarProps {
  group: EditorGroup;
  isActiveGroup: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onFocusGroup: () => void;
}

export function TabBar({
  group,
  isActiveGroup,
  onSelectTab,
  onCloseTab,
  onFocusGroup,
}: TabBarProps) {
  return (
    <div
      className="flex h-9 shrink-0 overflow-x-auto bg-vast-bg-elevated border-b border-vast-border"
      onMouseDown={onFocusGroup}
    >
      {group.tabs.map((tab) => {
        const isActive = group.activeTabId === tab.id && isActiveGroup;
        return (
          <div
            key={tab.id}
            className={cn(
              "group flex max-w-[200px] shrink-0 items-center gap-1 border-r border-vast-border px-3 text-sm cursor-pointer",
              isActive
                ? "bg-vast-tab-active text-vast-fg border-t border-t-vast-accent"
                : "bg-vast-bg-elevated text-vast-fg-muted hover:bg-vast-bg-hover",
            )}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="truncate">{tab.name}</span>
            {tab.isDirty && <span className="text-vast-accent">●</span>}
            <button
              type="button"
              className="ml-1 hidden rounded p-0.5 hover:bg-vast-bg-active group-hover:inline-flex"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
