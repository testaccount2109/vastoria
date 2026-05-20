import { useEffect } from "react";
import { useCommandStore } from "@/stores/commandStore";
import { useEditorStore } from "@/stores/editorStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSyncStore } from "@/stores/syncStore";

export function useCommands() {
  const registerCommands = useCommandStore((s) => s.registerCommands);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const openPath = useWorkspaceStore((s) => s.openPath);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);
  const splitEditor = useEditorStore((s) => s.splitEditor);
  const saveTab = useEditorStore((s) => s.saveTab);
  const groups = useEditorStore((s) => s.groups);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleAiPanel = useLayoutStore((s) => s.toggleAiPanel);
  const toggleTerminal = useLayoutStore((s) => s.toggleTerminal);
  const createSession = useTerminalStore((s) => s.createSession);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const syncPush = useSyncStore((s) => s.push);
  const syncPull = useSyncStore((s) => s.pull);

  useEffect(() => {
    const base = [
      {
        id: "file.openFolder",
        label: "Open Folder…",
        category: "File",
        shortcut: "Ctrl+Shift+O",
        action: openFolder,
      },
      {
        id: "view.toggleSidebar",
        label: "Toggle Sidebar",
        category: "View",
        shortcut: "Ctrl+B",
        action: toggleSidebar,
      },
      {
        id: "view.toggleAi",
        label: "Toggle AI Panel",
        category: "View",
        shortcut: "Ctrl+Shift+A",
        action: toggleAiPanel,
      },
      {
        id: "view.toggleTerminal",
        label: "Toggle Terminal",
        category: "View",
        shortcut: "Ctrl+`",
        action: toggleTerminal,
      },
      {
        id: "editor.splitRight",
        label: "Split Editor Right",
        category: "Editor",
        shortcut: "Ctrl+\\",
        action: () => splitEditor("horizontal"),
      },
      {
        id: "file.save",
        label: "Save",
        category: "File",
        shortcut: "Ctrl+S",
        action: async () => {
          const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
          const tabId = group?.activeTabId;
          if (group && tabId) await saveTab(group.id, tabId);
        },
      },
      {
        id: "terminal.new",
        label: "New Terminal",
        category: "Terminal",
        shortcut: "Ctrl+Shift+`",
        action: () => createSession(rootPath ?? "/"),
      },
      {
        id: "sync.push",
        label: "Sync: Push to Cloud",
        category: "Sync",
        action: () => syncPush(),
      },
      {
        id: "sync.pull",
        label: "Sync: Pull from Cloud",
        category: "Sync",
        action: () => syncPull(),
      },
    ];

    const recent = recentProjects.map((p) => ({
      id: `recent.${p.path}`,
      label: `Open Recent: ${p.name}`,
      category: "Recent",
      action: () => openPath(p.path),
    }));

    registerCommands([...base, ...recent]);
  }, [
    registerCommands,
    openFolder,
    openPath,
    recentProjects,
    splitEditor,
    toggleSidebar,
    toggleAiPanel,
    toggleTerminal,
    createSession,
    saveTab,
    groups,
    activeGroupId,
    rootPath,
    syncPush,
    syncPull,
  ]);
}

export function useKeyboardShortcuts() {
  const open = useCommandStore((s) => s.open);
  const close = useCommandStore((s) => s.close);
  const isOpen = useCommandStore((s) => s.isOpen);
  const execute = useCommandStore((s) => s.execute);
  const commands = useCommandStore((s) => s.commands);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "p" && e.shiftKey) {
        e.preventDefault();
        open();
        return;
      }

      if (mod && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        void execute("file.save");
        return;
      }

      if (mod && e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        void execute("view.toggleSidebar");
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        void execute("view.toggleAi");
        return;
      }

      if (mod && e.key === "`" && e.shiftKey) {
        e.preventDefault();
        void execute("terminal.new");
        return;
      }

      if (mod && e.key === "`" && !e.shiftKey) {
        e.preventDefault();
        void execute("view.toggleTerminal");
        return;
      }

      if (mod && e.key === "\\") {
        e.preventDefault();
        void execute("editor.splitRight");
        return;
      }

      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, isOpen, execute, commands]);
}
