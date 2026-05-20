import { create } from "zustand";

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}

interface CommandState {
  isOpen: boolean;
  query: string;
  commands: CommandItem[];
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  registerCommands: (commands: CommandItem[]) => void;
  execute: (id: string) => Promise<void>;
  filteredCommands: () => CommandItem[];
}

export const useCommandStore = create<CommandState>((set, get) => ({
  isOpen: false,
  query: "",
  commands: [],

  open: () => set({ isOpen: true, query: "" }),
  close: () => set({ isOpen: false, query: "" }),
  setQuery: (query) => set({ query }),

  registerCommands: (commands) => set({ commands }),

  execute: async (id) => {
    const cmd = get().commands.find((c) => c.id === id);
    get().close();
    if (cmd) await cmd.action();
  },

  filteredCommands: () => {
    const { commands, query } = get();
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  },
}));
