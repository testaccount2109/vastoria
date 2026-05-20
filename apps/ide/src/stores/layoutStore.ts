import { create } from "zustand";

export type ActivityView = "explorer" | "sync" | "search" | "git" | "extensions";
export type PanelView = "terminal" | "problems" | "output";

interface LayoutState {
  sidebarWidth: number;
  aiPanelWidth: number;
  terminalHeight: number;
  sidebarVisible: boolean;
  aiPanelVisible: boolean;
  terminalVisible: boolean;
  activeActivity: ActivityView;
  activePanel: PanelView;
  setSidebarWidth: (w: number) => void;
  setAiPanelWidth: (w: number) => void;
  setTerminalHeight: (h: number) => void;
  toggleSidebar: () => void;
  toggleAiPanel: () => void;
  toggleTerminal: () => void;
  setActiveActivity: (view: ActivityView) => void;
  setActivePanel: (view: PanelView) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarWidth: 260,
  aiPanelWidth: 360,
  terminalHeight: 220,
  sidebarVisible: true,
  aiPanelVisible: true,
  terminalVisible: true,
  activeActivity: "explorer",
  activePanel: "terminal",

  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setAiPanelWidth: (aiPanelWidth) => set({ aiPanelWidth }),
  setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleAiPanel: () => set((s) => ({ aiPanelVisible: !s.aiPanelVisible })),
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
  setActiveActivity: (activeActivity) => set({ activeActivity, sidebarVisible: true }),
  setActivePanel: (activePanel) => set({ activePanel, terminalVisible: true }),
}));
