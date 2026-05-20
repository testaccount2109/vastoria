/**
 * Local-first AI defaults. These are for the desktop user's machine only and
 * are not production website/API URLs.
 */
export const LOCAL_AI_DEFAULT_URL = "http://127.0.0.1:18420";
export const OLLAMA_DEFAULT_URL = "http://127.0.0.1:11434";

export const SERVICE_PORTS = {
  ai: 18420,
  cloud: 18430,
  ollama: 11434,
  ideDev: 1420,
  websiteDev: 3000,
} as const;

export type VastoriaEnvironment = "development" | "staging" | "production";

export interface CloudServiceUrls {
  /** Sync, releases, auth — https://vastoria.online/api in production */
  api: string;
  /** Marketing site — https://vastoria.online in production */
  website: string;
  /** Windows artifacts and metadata — https://vastoria.online/downloads in production */
  downloads: string;
}

/** Cloud-only endpoints per deployment tier (local AI is never listed here). */
export const CLOUD_URLS: Record<VastoriaEnvironment, CloudServiceUrls> = {
  development: {
    api: "http://127.0.0.1:18430",
    website: "http://127.0.0.1:3000",
    downloads: "http://127.0.0.1:18430",
  },
  staging: {
    api: "https://vastoria.online/api",
    website: "https://vastoria.online",
    downloads: "https://vastoria.online/downloads",
  },
  production: {
    api: "https://vastoria.online/api",
    website: "https://vastoria.online",
    downloads: "https://vastoria.online/downloads",
  },
};
