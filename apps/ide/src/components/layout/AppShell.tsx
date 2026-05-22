import { useEffect } from "react";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "@/components/editor/EditorArea";
import { AiPanel } from "@/components/ai/AiPanel";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { SettingsView } from "@/components/settings/SettingsView";
import { CommandPalette } from "./CommandPalette";
import { StatusBar } from "./StatusBar";
import { Resizer } from "@/components/ui/Resizer";
import { useLayoutStore } from "@/stores/layoutStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCommands, useKeyboardShortcuts } from "@/hooks/useCommands";

export function AppShell() {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const aiPanelVisible = useLayoutStore((s) => s.aiPanelVisible);
  const aiPanelWidth = useLayoutStore((s) => s.aiPanelWidth);
  const setAiPanelWidth = useLayoutStore((s) => s.setAiPanelWidth);
  const terminalVisible = useLayoutStore((s) => s.terminalVisible);
  const terminalHeight = useLayoutStore((s) => s.terminalHeight);
  const setTerminalHeight = useLayoutStore((s) => s.setTerminalHeight);
  const activeWorkbench = useLayoutStore((s) => s.activeWorkbench);

  const loadRecent = useWorkspaceStore((s) => s.loadRecent);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const createSession = useTerminalStore((s) => s.createSession);
  const sessions = useTerminalStore((s) => s.sessions);

  useCommands();
  useKeyboardShortcuts();
  useSettingsEffects();

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (terminalVisible && sessions.length === 0) {
      void createSession(rootPath ?? "/");
    }
  }, [terminalVisible, sessions.length, createSession, rootPath]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <ActivityBar />

        {activeWorkbench === "editor" && sidebarVisible && (
          <>
            <div
              className="shrink-0 overflow-hidden border-r border-vast-border"
              style={{ width: sidebarWidth }}
            >
              <Sidebar />
            </div>
            <Resizer
              direction="horizontal"
              onResize={(d) => setSidebarWidth(Math.min(480, Math.max(180, sidebarWidth + d)))}
            />
          </>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-row">
            {activeWorkbench === "settings" ? <SettingsView /> : <EditorArea />}
            {activeWorkbench === "editor" && aiPanelVisible && (
              <>
                <Resizer
                  direction="horizontal"
                  onResize={(d) =>
                    setAiPanelWidth(Math.min(600, Math.max(280, aiPanelWidth - d)))
                  }
                />
                <div className="shrink-0 overflow-hidden" style={{ width: aiPanelWidth }}>
                  <AiPanel />
                </div>
              </>
            )}
          </div>

          {activeWorkbench === "editor" && terminalVisible && (
            <>
              <Resizer
                direction="vertical"
                onResize={(d) =>
                  setTerminalHeight(Math.min(500, Math.max(120, terminalHeight - d)))
                }
              />
              <div
                className="shrink-0 overflow-hidden border-t border-vast-border"
                style={{ height: terminalHeight }}
              >
                <TerminalPanel />
              </div>
            </>
          )}
        </div>
      </div>

      <StatusBar />
      <CommandPalette />
    </div>
  );
}

function useSettingsEffects() {
  const appearance = useSettingsStore((s) => s.appearance);
  const performance = useSettingsStore((s) => s.performance);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--vast-accent-runtime", appearance.accentColor);
    root.style.setProperty("--vast-ui-scale", String(appearance.uiScale));
    root.style.setProperty("--vast-font-size", `${appearance.fontSize}px`);
    root.dataset.theme = appearance.theme;
    root.dataset.animations = performance.animations ? "on" : "off";
  }, [appearance, performance.animations]);
}
