import { create } from "zustand";
import {
  closeTerminal,
  createTerminalSession,
  type TerminalSession,
} from "@/lib/ipc";

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  createSession: (cwd: string) => Promise<void>;
  closeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  ensureSession: (cwd: string) => Promise<void>;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: async (cwd) => {
    const session = await createTerminalSession(cwd);
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    }));
  },

  closeSession: async (id) => {
    await closeTerminal(id);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? (sessions[sessions.length - 1]?.id ?? null)
          : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  ensureSession: async (cwd) => {
    const { sessions, createSession } = get();
    if (sessions.length === 0) await createSession(cwd);
  },
}));
