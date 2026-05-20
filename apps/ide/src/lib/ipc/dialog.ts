import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri";

export async function pickFolder(): Promise<string | null> {
  if (isTauri()) {
    return invoke<string | null>("pick_folder");
  }
  return "/mock/workspace";
}
