export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export interface RecentProject {
  path: string;
  name: string;
  openedAt: number;
}

export interface ReadFileResult {
  path: string;
  content: string;
}

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
}

export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code: number | null;
}

/** AI contract types — consumed by hooks, implemented externally later */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatStreamChunk {
  delta: string;
  done: boolean;
}

export interface FileContextPayload {
  cwd: string;
  openFiles: Array<{ path: string; content: string; language?: string }>;
  activeFile?: { path: string; selection?: string };
}

export interface DiffEdit {
  path: string;
  original: string;
  modified: string;
}

export interface OllamaStatus {
  installed: boolean;
  executablePath?: string;
  serviceRunning: boolean;
  version?: string;
  installCandidates: string[];
}

export interface OllamaModel {
  name: string;
  id: string;
  size: string;
  modified: string;
  running: boolean;
  processor?: string;
  until?: string;
}

export interface OllamaProgressEvent {
  model: string;
  action: string;
  line: string;
  done: boolean;
  error?: string;
}

export interface RuntimeInfo {
  appVersion: string;
  os: string;
  arch: string;
  cpuCount: number;
  rustTarget: string;
  ollamaStorageBytes: number;
}
