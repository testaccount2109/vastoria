import { Plus, X } from "lucide-react";
import { TerminalView } from "./TerminalView";
import { useTerminalStore } from "@/stores/terminalStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { cn } from "@/lib/utils";

export function TerminalPanel() {
  const sessions = useTerminalStore((s) => s.sessions);
  const activeSessionId = useTerminalStore((s) => s.activeSessionId);
  const createSession = useTerminalStore((s) => s.createSession);
  const closeSession = useTerminalStore((s) => s.closeSession);
  const setActiveSession = useTerminalStore((s) => s.setActiveSession);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  return (
    <div className="flex h-full flex-col bg-vast-terminal">
      <div className="flex h-9 shrink-0 items-center border-b border-vast-border bg-vast-bg-elevated">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSession(s.id)}
              className={cn(
                "group flex max-w-[160px] items-center gap-1 border-r border-vast-border px-3 py-1.5 text-xs",
                activeSessionId === s.id
                  ? "bg-vast-tab-active text-vast-fg"
                  : "text-vast-fg-muted hover:bg-vast-bg-hover",
              )}
            >
              <span className="truncate">{s.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="hidden rounded p-0.5 hover:bg-vast-bg-active group-hover:inline"
                onClick={(e) => {
                  e.stopPropagation();
                  void closeSession(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    void closeSession(s.id);
                  }
                }}
              >
                <X size={12} />
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          title="New terminal"
          onClick={() => void createSession(rootPath ?? "/")}
          className="flex h-full items-center px-3 text-vast-fg-muted hover:text-vast-fg"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {sessions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-vast-fg-muted">
            <button
              type="button"
              className="text-vast-accent hover:underline"
              onClick={() => void createSession(rootPath ?? "/")}
            >
              Create terminal session
            </button>
          </div>
        ) : (
          sessions.map((s) => (
            <TerminalView
              key={s.id}
              sessionId={s.id}
              isActive={s.id === activeSessionId}
            />
          ))
        )}
      </div>
    </div>
  );
}
