import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "@/lib/tauri";
import type { TerminalExitEvent, TerminalOutputEvent, TerminalSession } from "./types";

let mockSessionCounter = 0;

export async function createTerminalSession(cwd: string): Promise<TerminalSession> {
  if (isTauri()) {
    return invoke<TerminalSession>("terminal_create", { cwd });
  }
  mockSessionCounter += 1;
  const id = `mock-${mockSessionCounter}`;
  return { id, title: `bash ${mockSessionCounter}`, cwd };
}

export async function writeTerminal(sessionId: string, data: string): Promise<void> {
  if (isTauri()) {
    await invoke("terminal_write", { sessionId, data });
    return;
  }
}

export async function resizeTerminal(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  if (isTauri()) {
    await invoke("terminal_resize", { sessionId, cols, rows });
  }
}

export async function closeTerminal(sessionId: string): Promise<void> {
  if (isTauri()) {
    await invoke("terminal_close", { sessionId });
  }
}

export function onTerminalOutput(
  handler: (event: TerminalOutputEvent) => void,
): Promise<UnlistenFn> {
  if (isTauri()) {
    return listen<TerminalOutputEvent>("terminal://output", (e) => handler(e.payload));
  }
  return Promise.resolve(() => undefined);
}

export function onTerminalExit(
  handler: (event: TerminalExitEvent) => void,
): Promise<UnlistenFn> {
  if (isTauri()) {
    return listen<TerminalExitEvent>("terminal://exit", (e) => handler(e.payload));
  }
  return Promise.resolve(() => undefined);
}
