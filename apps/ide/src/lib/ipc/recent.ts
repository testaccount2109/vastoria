import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri";
import type { RecentProject } from "./types";

const MOCK_RECENT: RecentProject[] = [
  { path: "/mock/workspace", name: "workspace", openedAt: Date.now() - 86400000 },
];

export async function getRecentProjects(): Promise<RecentProject[]> {
  if (isTauri()) {
    return invoke<RecentProject[]>("get_recent_projects");
  }
  return MOCK_RECENT;
}

export async function addRecentProject(path: string): Promise<void> {
  if (isTauri()) {
    await invoke("add_recent_project", { path });
    return;
  }
  const name = path.split("/").filter(Boolean).pop() ?? path;
  const existing = MOCK_RECENT.findIndex((p) => p.path === path);
  if (existing >= 0) MOCK_RECENT.splice(existing, 1);
  MOCK_RECENT.unshift({ path, name, openedAt: Date.now() });
  if (MOCK_RECENT.length > 10) MOCK_RECENT.pop();
}
