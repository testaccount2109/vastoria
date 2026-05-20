import { create } from "zustand";
import {
  addRecentProject,
  getRecentProjects,
  pickFolder,
  readDirectoryRecursive,
  type FileEntry,
  type RecentProject,
} from "@/lib/ipc";

interface WorkspaceState {
  rootPath: string | null;
  fileTree: FileEntry[];
  expandedPaths: Set<string>;
  recentProjects: RecentProject[];
  isLoading: boolean;
  openFolder: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  loadRecent: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  fileTree: [],
  expandedPaths: new Set<string>(),
  recentProjects: [],
  isLoading: false,

  openFolder: async () => {
    const path = await pickFolder();
    if (!path) return;
    await get().openPath(path);
  },

  openPath: async (path) => {
    set({ isLoading: true, rootPath: path });
    try {
      const fileTree = await readDirectoryRecursive(path);
      await addRecentProject(path);
      const recentProjects = await getRecentProjects();
      set({
        fileTree,
        expandedPaths: new Set([path]),
        recentProjects,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  refreshTree: async () => {
    const { rootPath } = get();
    if (!rootPath) return;
    const fileTree = await readDirectoryRecursive(rootPath);
    set({ fileTree });
  },

  toggleExpanded: (path) => {
    set((state) => {
      const expandedPaths = new Set(state.expandedPaths);
      if (expandedPaths.has(path)) expandedPaths.delete(path);
      else expandedPaths.add(path);
      return { expandedPaths };
    });
  },

  loadRecent: async () => {
    const recentProjects = await getRecentProjects();
    set({ recentProjects });
  },
}));
