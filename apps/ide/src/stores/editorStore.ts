import { create } from "zustand";
import { readFile, writeFile } from "@/lib/ipc";
import { languageFromPath } from "@/lib/utils";

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  isPinned?: boolean;
}

export interface EditorGroup {
  id: string;
  tabs: EditorTab[];
  activeTabId: string | null;
}

interface EditorState {
  groups: EditorGroup[];
  activeGroupId: string;
  openFile: (path: string) => Promise<void>;
  closeTab: (groupId: string, tabId: string) => void;
  setActiveTab: (groupId: string, tabId: string) => void;
  updateTabContent: (groupId: string, tabId: string, content: string) => void;
  saveTab: (groupId: string, tabId: string) => Promise<void>;
  splitEditor: (direction: "horizontal" | "vertical") => void;
  closeGroup: (groupId: string) => void;
  setActiveGroup: (groupId: string) => void;
  getActiveTab: () => EditorTab | null;
}

const createTabId = (path: string) => `tab-${path}`;

const defaultGroup = (): EditorGroup => ({
  id: crypto.randomUUID(),
  tabs: [],
  activeTabId: null,
});

export const useEditorStore = create<EditorState>((set, get) => ({
  groups: [defaultGroup()],
  activeGroupId: "",

  openFile: async (path) => {
    const { groups, activeGroupId } = get();
    const groupId = activeGroupId || groups[0]?.id;
    if (!groupId) return;

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const tabId = createTabId(path);
    const existing = group.tabs.find((t) => t.id === tabId);
    if (existing) {
      set({
        groups: groups.map((g) =>
          g.id === groupId ? { ...g, activeTabId: tabId } : g,
        ),
        activeGroupId: groupId,
      });
      return;
    }

    const { content } = await readFile(path);
    const name = path.split("/").filter(Boolean).pop() ?? path;
    const tab: EditorTab = {
      id: tabId,
      path,
      name,
      content,
      language: languageFromPath(path),
      isDirty: false,
    };

    set({
      groups: groups.map((g) =>
        g.id === groupId
          ? { ...g, tabs: [...g.tabs, tab], activeTabId: tabId }
          : g,
      ),
      activeGroupId: groupId,
    });
  },

  closeTab: (groupId, tabId) => {
    set((state) => {
      const groups = state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const tabs = g.tabs.filter((t) => t.id !== tabId);
        let activeTabId = g.activeTabId;
        if (activeTabId === tabId) {
          const idx = g.tabs.findIndex((t) => t.id === tabId);
          activeTabId = tabs[Math.max(0, idx - 1)]?.id ?? null;
        }
        return { ...g, tabs, activeTabId };
      });
      const filtered =
        groups.length > 1
          ? groups.filter((g) => g.tabs.length > 0 || groups.length === 1)
          : groups;
      const activeGroupId =
        filtered.find((g) => g.id === state.activeGroupId)?.id ??
        filtered[0]?.id ??
        "";
      return { groups: filtered.length ? filtered : [defaultGroup()], activeGroupId };
    });
  },

  setActiveTab: (groupId, tabId) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, activeTabId: tabId } : g,
      ),
      activeGroupId: groupId,
    }));
  },

  updateTabContent: (groupId, tabId, content) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              tabs: g.tabs.map((t) =>
                t.id === tabId ? { ...t, content, isDirty: true } : t,
              ),
            }
          : g,
      ),
    }));
  },

  saveTab: async (groupId, tabId) => {
    const group = get().groups.find((g) => g.id === groupId);
    const tab = group?.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    await writeFile(tab.path, tab.content);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              tabs: g.tabs.map((t) =>
                t.id === tabId ? { ...t, isDirty: false } : t,
              ),
            }
          : g,
      ),
    }));
  },

  splitEditor: (direction) => {
    const { groups, activeGroupId } = get();
    const source = groups.find((g) => g.id === activeGroupId) ?? groups[0];
    if (!source) return;

    const activeTab = source.tabs.find((t) => t.id === source.activeTabId);
    const newGroup: EditorGroup = {
      id: crypto.randomUUID(),
      tabs: activeTab ? [{ ...activeTab }] : [],
      activeTabId: activeTab?.id ?? null,
    };

    set({
      groups:
        direction === "horizontal"
          ? [...groups, newGroup]
          : [groups[0], newGroup].filter(Boolean),
      activeGroupId: newGroup.id,
    });
  },

  closeGroup: (groupId) => {
    set((state) => {
      if (state.groups.length <= 1) return state;
      const groups = state.groups.filter((g) => g.id !== groupId);
      return {
        groups,
        activeGroupId:
          state.activeGroupId === groupId
            ? (groups[0]?.id ?? "")
            : state.activeGroupId,
      };
    });
  },

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  getActiveTab: () => {
    const { groups, activeGroupId } = get();
    const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
    if (!group?.activeTabId) return null;
    return group.tabs.find((t) => t.id === group.activeTabId) ?? null;
  },
}));

// Initialize activeGroupId after store creation
useEditorStore.setState((s) => ({
  activeGroupId: s.groups[0]?.id ?? "",
}));
