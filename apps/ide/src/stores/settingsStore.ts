import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveCloudApiUrl, resolveLocalAiUrl } from "@vastoria/config";

const DEFAULT_AI = resolveLocalAiUrl();
const DEFAULT_SYNC = resolveCloudApiUrl();

export type AppLanguage = "en" | "de";
export type StartupBehavior = "welcome" | "restoreWorkspace" | "newWindow";
export type AutoSaveMode = "off" | "afterDelay" | "onFocusChange" | "onWindowChange";
export type UpdateChannel = "stable" | "preview" | "nightly";
export type ThemeMode = "dark" | "light" | "system";
export type SidebarDensity = "compact" | "comfortable";
export type CursorStyle = "line" | "block" | "underline";
export type WordWrap = "off" | "on" | "bounded";
export type ShellKind = "powershell" | "cmd" | "gitBash" | "windowsTerminal";
export type IndexingBehavior = "full" | "workspaceOnly" | "manual";

export interface ServiceSettings {
  /** When false, IDE skips local AI backend calls (editor still works offline). */
  aiEnabled: boolean;
  aiApiUrl: string;
  /** When false, sync engine never calls cloud (local-only). */
  syncEnabled: boolean;
  syncApiUrl: string;
}

export interface GeneralSettings {
  language: AppLanguage;
  startupBehavior: StartupBehavior;
  autoSave: AutoSaveMode;
  telemetry: boolean;
  updateChannel: UpdateChannel;
  launchOnStartup: boolean;
  notifications: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string;
  fontSize: number;
  editorFont: string;
  uiScale: number;
  sidebarDensity: SidebarDensity;
  transparency: boolean;
  effects: boolean;
}

export interface AiModelSettings {
  defaultModel: string;
  contextLength: number;
  temperature: number;
  maxTokens: number;
  gpuUsage: boolean;
  cpuThreads: number;
  keepAlive: string;
  streaming: boolean;
  timeoutSeconds: number;
  parallelRequests: number;
}

export interface EditorSettings {
  fontFamily: string;
  ligatures: boolean;
  minimap: boolean;
  lineHeight: number;
  wordWrap: WordWrap;
  cursorStyle: CursorStyle;
  tabSize: number;
  formatOnSave: boolean;
  smoothScrolling: boolean;
}

export interface TerminalSettings {
  defaultShell: ShellKind;
  fontFamily: string;
  transparency: number;
  cursorStyle: CursorStyle;
  scrollbackSize: number;
}

export interface PerformanceSettings {
  hardwareAcceleration: boolean;
  memoryOptimization: boolean;
  animations: boolean;
  backgroundAiLimit: number;
  indexingBehavior: IndexingBehavior;
}

export interface DownloadSettings {
  downloadDirectory: string;
  concurrentDownloads: number;
  verifyChecksums: boolean;
}

export interface PrivacySettings {
  telemetry: boolean;
  crashReports: boolean;
  localHistory: boolean;
  redactPrompts: boolean;
}

export interface UpdateSettings {
  automaticUpdates: boolean;
  channel: UpdateChannel;
}

export interface VastoriaSettings extends ServiceSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  ai: AiModelSettings;
  editor: EditorSettings;
  terminal: TerminalSettings;
  performance: PerformanceSettings;
  downloads: DownloadSettings;
  updates: UpdateSettings;
  privacy: PrivacySettings;
}

interface SettingsState extends VastoriaSettings {
  updateGeneral: (patch: Partial<GeneralSettings>) => void;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  updateAi: (patch: Partial<AiModelSettings>) => void;
  updateEditor: (patch: Partial<EditorSettings>) => void;
  updateTerminal: (patch: Partial<TerminalSettings>) => void;
  updatePerformance: (patch: Partial<PerformanceSettings>) => void;
  updateDownloads: (patch: Partial<DownloadSettings>) => void;
  updateUpdates: (patch: Partial<UpdateSettings>) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => void;
  setAiEnabled: (enabled: boolean) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setAiApiUrl: (url: string) => void;
  setSyncApiUrl: (url: string) => void;
  resetDefaults: () => void;
}

const defaults: VastoriaSettings = {
  aiEnabled: true,
  aiApiUrl: DEFAULT_AI,
  syncEnabled: true,
  syncApiUrl: DEFAULT_SYNC,
  general: {
    language: "en",
    startupBehavior: "restoreWorkspace",
    autoSave: "afterDelay",
    telemetry: false,
    updateChannel: "stable",
    launchOnStartup: false,
    notifications: true,
  },
  appearance: {
    theme: "dark",
    accentColor: "#0078d4",
    fontSize: 13,
    editorFont: "Cascadia Code",
    uiScale: 1,
    sidebarDensity: "comfortable",
    transparency: false,
    effects: true,
  },
  ai: {
    defaultModel: "",
    contextLength: 8192,
    temperature: 0.2,
    maxTokens: 2048,
    gpuUsage: true,
    cpuThreads: 0,
    keepAlive: "5m",
    streaming: true,
    timeoutSeconds: 120,
    parallelRequests: 1,
  },
  editor: {
    fontFamily: "Cascadia Code",
    ligatures: true,
    minimap: true,
    lineHeight: 20,
    wordWrap: "off",
    cursorStyle: "line",
    tabSize: 2,
    formatOnSave: false,
    smoothScrolling: true,
  },
  terminal: {
    defaultShell: "powershell",
    fontFamily: "Cascadia Mono",
    transparency: 0,
    cursorStyle: "block",
    scrollbackSize: 10000,
  },
  performance: {
    hardwareAcceleration: true,
    memoryOptimization: true,
    animations: true,
    backgroundAiLimit: 2,
    indexingBehavior: "workspaceOnly",
  },
  downloads: {
    downloadDirectory: "",
    concurrentDownloads: 2,
    verifyChecksums: true,
  },
  updates: {
    automaticUpdates: true,
    channel: "stable",
  },
  privacy: {
    telemetry: false,
    crashReports: false,
    localHistory: true,
    redactPrompts: true,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      updateGeneral: (patch) =>
        set((s) => ({
          general: { ...s.general, ...patch },
          privacy:
            patch.telemetry === undefined
              ? s.privacy
              : { ...s.privacy, telemetry: patch.telemetry },
        })),
      updateAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
      updateAi: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),
      updateEditor: (patch) => set((s) => ({ editor: { ...s.editor, ...patch } })),
      updateTerminal: (patch) => set((s) => ({ terminal: { ...s.terminal, ...patch } })),
      updatePerformance: (patch) =>
        set((s) => ({ performance: { ...s.performance, ...patch } })),
      updateDownloads: (patch) => set((s) => ({ downloads: { ...s.downloads, ...patch } })),
      updateUpdates: (patch) =>
        set((s) => ({
          updates: { ...s.updates, ...patch },
          general:
            patch.channel === undefined
              ? s.general
              : { ...s.general, updateChannel: patch.channel },
        })),
      updatePrivacy: (patch) =>
        set((s) => ({
          privacy: { ...s.privacy, ...patch },
          general:
            patch.telemetry === undefined
              ? s.general
              : { ...s.general, telemetry: patch.telemetry },
        })),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setSyncEnabled: (syncEnabled) => set({ syncEnabled }),
      setAiApiUrl: (aiApiUrl) => set({ aiApiUrl: aiApiUrl.replace(/\/+$/, "") }),
      setSyncApiUrl: (syncApiUrl) => set({ syncApiUrl: syncApiUrl.replace(/\/+$/, "") }),
      resetDefaults: () => set({ ...defaults }),
    }),
    {
      name: "vastoria.settings",
      version: 2,
      merge: (persisted, current) =>
        deepMerge(current, persisted as Partial<SettingsState>) as SettingsState,
    },
  ),
);

function deepMerge<T extends object>(base: T, patch: Partial<T>): T {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const baseValue = next[key as keyof T] as unknown;
      next[key as keyof T] = deepMerge(
        (baseValue && typeof baseValue === "object" ? baseValue : {}) as object,
        value as object,
      ) as T[keyof T];
    } else if (value !== undefined) {
      next[key as keyof T] = value as T[keyof T];
    }
  }
  return next;
}

export function getAiApiUrl(): string {
  const s = useSettingsStore.getState();
  return s.aiEnabled ? s.aiApiUrl : "";
}

export function getSyncApiUrl(): string {
  const s = useSettingsStore.getState();
  return s.syncEnabled ? s.syncApiUrl : "";
}
