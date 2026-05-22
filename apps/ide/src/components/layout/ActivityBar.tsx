import {
  Cloud,
  Files,
  GitBranch,
  Package,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
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
  const activeWorkbench = useLayoutStore((s) => s.activeWorkbench);
  const openSettings = useLayoutStore((s) => s.openSettings);
  const toggleAiPanel = useLayoutStore((s) => s.toggleAiPanel);
  const aiPanelVisible = useLayoutStore((s) => s.aiPanelVisible);
  const { t } = useI18n();

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
        <button
          type="button"
          title={`${t("activity.settings")} (Ctrl+,)`}
          aria-label={t("activity.settings")}
          onClick={openSettings}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-sm text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg",
            activeWorkbench === "settings" &&
              "border-l-2 border-vast-accent bg-vast-bg-hover text-vast-fg",
          )}
        >
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
