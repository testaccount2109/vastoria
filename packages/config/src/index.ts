/**
 * Vastoria infrastructure config — local-first AI vs optional cloud services.
 *
 * LOCAL (desktop machine only, never cloud-hosted):
 *   - resolveLocalAiUrl()  → http://127.0.0.1:18420
 *   - resolveOllamaUrl()   → http://127.0.0.1:11434
 *
 * CLOUD:
 *   - resolveCloudApiUrl() → https://vastoria.online/api (production)
 *   - resolveDownloadsUrl() → https://vastoria.online/downloads (production)
 */

export {
  LOCAL_AI_DEFAULT_URL,
  OLLAMA_DEFAULT_URL,
  SERVICE_PORTS,
  CLOUD_URLS,
  type VastoriaEnvironment,
  type CloudServiceUrls,
} from "./constants";

export {
  resolveVastoriaEnvironment,
  getCloudUrlsForEnv,
  resolveLocalAiUrl,
  resolveOllamaUrl,
  resolveCloudApiUrl,
  resolveDownloadsUrl,
  resolveWebsiteUrl,
  normalizeBaseUrl,
  isRemoteCloudApi,
} from "./env";

import { resolveDownloadsUrl } from "./env";

export { fetchWithRetry, type FetchWithRetryOptions } from "./retry";

export const AI_API = {
  health: "/health",
  models: "/models",
  contextUpdate: "/context/update",
  contextGet: (projectId: string) => `/context/${encodeURIComponent(projectId)}`,
  chatHistory: (projectId: string) => `/chat/history/${encodeURIComponent(projectId)}`,
  chatAbort: (requestId: string) => `/chat/abort/${encodeURIComponent(requestId)}`,
  chatWs: "/chat/stream",
} as const;

export const CLOUD_API = {
  health: "/health",
  releases: "/releases",
  releasesLatest: "/releases/latest",
  release: (version: string) => `/releases/${encodeURIComponent(version)}`,
  downloadsLatest: "/downloads/latest",
  downloadsWindows: "/downloads/windows",
  downloadRelease: (version: string) => `/downloads/${encodeURIComponent(version)}`,
  artifactFile: (id: number) => `/downloads/artifacts/${id}/file`,
  syncUpload: "/sync/upload",
  syncDownload: (projectId: string) => `/sync/download/${encodeURIComponent(projectId)}`,
  syncHistory: (projectId: string) => `/sync/history/${encodeURIComponent(projectId)}`,
  syncRollback: (projectId: string) => `/sync/rollback/${encodeURIComponent(projectId)}`,
  updatesCheck: "/updates/check",
  updatesLatest: "/updates/latest",
} as const;

export function httpToWs(httpBase: string): string {
  const url = new URL(httpBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build a versioned artifact URL on the downloads CDN. */
export function buildDownloadArtifactUrl(
  version: string,
  filename: string,
  downloadsBase: string = resolveDownloadsUrl(),
): string {
  const v = version.startsWith("v") ? version : `v${version}`;
  return joinUrl(downloadsBase, `windows/${v}/${filename}`);
}
