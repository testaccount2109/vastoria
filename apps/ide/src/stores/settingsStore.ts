import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveCloudApiUrl, resolveLocalAiUrl } from "@vastoria/config";

const DEFAULT_AI = resolveLocalAiUrl();
const DEFAULT_SYNC = resolveCloudApiUrl();

export interface ServiceSettings {
  /** When false, IDE skips local AI backend calls (editor still works offline). */
  aiEnabled: boolean;
  aiApiUrl: string;
  /** When false, sync engine never calls cloud (local-only). */
  syncEnabled: boolean;
  syncApiUrl: string;
}

interface SettingsState extends ServiceSettings {
  setAiEnabled: (enabled: boolean) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setAiApiUrl: (url: string) => void;
  setSyncApiUrl: (url: string) => void;
  resetDefaults: () => void;
}

const defaults: ServiceSettings = {
  aiEnabled: true,
  aiApiUrl: DEFAULT_AI,
  syncEnabled: true,
  syncApiUrl: DEFAULT_SYNC,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setSyncEnabled: (syncEnabled) => set({ syncEnabled }),
      setAiApiUrl: (aiApiUrl) => set({ aiApiUrl: aiApiUrl.replace(/\/+$/, "") }),
      setSyncApiUrl: (syncApiUrl) => set({ syncApiUrl: syncApiUrl.replace(/\/+$/, "") }),
      resetDefaults: () => set({ ...defaults }),
    }),
    { name: "vastoria.settings" },
  ),
);

export function getAiApiUrl(): string {
  const s = useSettingsStore.getState();
  return s.aiEnabled ? s.aiApiUrl : "";
}

export function getSyncApiUrl(): string {
  const s = useSettingsStore.getState();
  return s.syncEnabled ? s.syncApiUrl : "";
}
