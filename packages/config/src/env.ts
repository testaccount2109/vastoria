import {
  CLOUD_URLS,
  LOCAL_AI_DEFAULT_URL,
  OLLAMA_DEFAULT_URL,
  type CloudServiceUrls,
  type VastoriaEnvironment,
} from "./constants";

function readRaw(key: string): string | undefined {
  if (typeof import.meta !== "undefined") {
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    const fromVite = meta.env?.[key];
    if (fromVite !== undefined && fromVite !== "") return fromVite;
  }
  const proc = typeof globalThis !== "undefined"
    ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    : undefined;
  if (proc?.env?.[key]) {
    return proc.env[key];
  }
  return undefined;
}

function firstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readRaw(key);
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Active tier: development | staging | production */
export function resolveVastoriaEnvironment(): VastoriaEnvironment {
  const explicit = firstDefined(["VASTORIA_ENV", "VITE_VASTORIA_ENV", "NEXT_PUBLIC_VASTORIA_ENV"]);
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  const nodeEnv = readRaw("NODE_ENV");
  if (nodeEnv === "production") return "production";
  return "development";
}

export function getCloudUrlsForEnv(env: VastoriaEnvironment = resolveVastoriaEnvironment()): CloudServiceUrls {
  return CLOUD_URLS[env];
}

/**
 * Local AI backend (IDE → vastoria-ai). Always localhost in normal setups.
 */
export function resolveLocalAiUrl(): string {
  return normalizeBaseUrl(
    firstDefined(["VITE_LOCAL_AI_URL", "VITE_AI_API_URL", "LOCAL_AI_URL", "VASTORIA_AI_URL"]) ??
      LOCAL_AI_DEFAULT_URL,
  );
}

/**
 * Ollama — AI backend only; never exposed to IDE or cloud directly in production proxy.
 */
export function resolveOllamaUrl(): string {
  return normalizeBaseUrl(
    firstDefined(["OLLAMA_URL", "OLLAMA_BASE_URL"]) ?? OLLAMA_DEFAULT_URL,
  );
}

/**
 * Cloud API (sync, releases, metadata). Never used for AI inference.
 */
export function resolveCloudApiUrl(env: VastoriaEnvironment = resolveVastoriaEnvironment()): string {
  return normalizeBaseUrl(
    firstDefined([
      "VITE_CLOUD_API_URL",
      "VITE_SYNC_API_URL",
      "NEXT_PUBLIC_CLOUD_API_URL",
      "NEXT_PUBLIC_VASTORIA_API_URL",
      "CLOUD_API_URL",
      "VASTORIA_CLOUD_URL",
      "VASTORIA_API_URL",
    ]) ?? getCloudUrlsForEnv(env).api,
  );
}

/**
 * Public download CDN base (Windows installer / portable URLs in release metadata).
 */
export function resolveDownloadsUrl(env: VastoriaEnvironment = resolveVastoriaEnvironment()): string {
  return normalizeBaseUrl(
    firstDefined([
      "VITE_DOWNLOADS_URL",
      "NEXT_PUBLIC_DOWNLOADS_URL",
      "DOWNLOADS_API_URL",
      "DOWNLOADS_BASE_URL",
    ]) ?? getCloudUrlsForEnv(env).downloads,
  );
}

export function resolveWebsiteUrl(env: VastoriaEnvironment = resolveVastoriaEnvironment()): string {
  return normalizeBaseUrl(
    firstDefined(["VITE_WEBSITE_URL", "NEXT_PUBLIC_WEBSITE_URL", "WEBSITE_URL"]) ??
      getCloudUrlsForEnv(env).website,
  );
}

/** True when cloud API host is not loopback (production/staging deploy). */
export function isRemoteCloudApi(url: string = resolveCloudApiUrl()): boolean {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}
