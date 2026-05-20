import { getSyncApiUrl } from "@/stores/settingsStore";

/** Cloud sync API base — empty when sync is disabled (offline-first). */
export function getSyncApiBase(): string {
  return getSyncApiUrl();
}
