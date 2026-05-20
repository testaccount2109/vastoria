import {
  Cloud,
  Files,
  GitBranch,
  Package,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore, type ActivityView } from "@/stores/layoutStore";

const items: { id: ActivityView; icon: typeof Files; label: string }[] = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "sync", icon: Cloud, label: "Sync" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "extensions", icon: Package, label: "Extensions" },
];

export function ActivityBar() {
  const activeActivity = useLayoutStore((s) => s.activeActivity);
  const setActiveActivity = useLayoutStore((s) => s.setActiveActivity);
  const toggleAiPanel = useLayoutStore((s) => s.toggleAiPanel);
  const aiPanelVisible = useLayoutStore((s) => s.aiPanelVisible);

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center bg-vast-activity py-2 gap-1 border-r border-vast-border">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          onClick={() => setActiveActivity(id)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-sm text-vast-fg-muted hover:text-vast-fg",
            activeActivity === id &&
              "text-vast-fg border-l-2 border-vast-accent bg-vast-bg-hover",
          )}
        >
          <Icon size={22} strokeWidth={1.5} />
        </button>
      ))}
      <div className="mt-auto flex flex-col gap-1">
        <button
          type="button"
          title="AI Panel"
          onClick={toggleAiPanel}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-sm text-vast-fg-muted hover:text-vast-fg",
            aiPanelVisible && "text-vast-accent",
          )}
        >
          <Sparkles size={22} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
