import { AI_API, httpToWs, joinUrl } from "@vastoria/config";
import { getAiApiUrl } from "@/stores/settingsStore";

export function resolveAiHttpBase(): string {
  return getAiApiUrl();
}

export function resolveAiWsUrl(): string {
  const base = resolveAiHttpBase();
  if (!base) return "";
  return joinUrl(httpToWs(base), AI_API.chatWs);
}

export function aiHealthUrl(): string {
  const base = resolveAiHttpBase();
  return base ? joinUrl(base, AI_API.health) : "";
}

export function aiContextUpdateUrl(): string {
  const base = resolveAiHttpBase();
  return base ? joinUrl(base, AI_API.contextUpdate) : "";
}
