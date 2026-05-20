import type {
  SyncDownloadResponse,
  SyncHistoryResponse,
  SyncUploadRequest,
  SyncUploadResponse,
} from "./types";

export interface SyncClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class SyncClient {
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options: SyncClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  async upload(body: SyncUploadRequest): Promise<SyncUploadResponse> {
    const r = await this.fetchImpl(`${this.baseUrl}/sync/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Upload failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<SyncUploadResponse>;
  }

  async download(
    projectId: string,
    versionHash?: string,
  ): Promise<SyncDownloadResponse> {
    const qs = versionHash ? `?version=${encodeURIComponent(versionHash)}` : "";
    const r = await this.fetchImpl(
      `${this.baseUrl}/sync/download/${encodeURIComponent(projectId)}${qs}`,
    );
    if (!r.ok) throw new Error(`Download failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<SyncDownloadResponse>;
  }

  async history(projectId: string): Promise<SyncHistoryResponse> {
    const r = await this.fetchImpl(
      `${this.baseUrl}/sync/history/${encodeURIComponent(projectId)}`,
    );
    if (!r.ok) throw new Error(`History failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<SyncHistoryResponse>;
  }

  async rollback(projectId: string, versionHash: string): Promise<void> {
    const r = await this.fetchImpl(
      `${this.baseUrl}/sync/rollback/${encodeURIComponent(projectId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_hash: versionHash }),
      },
    );
    if (!r.ok) throw new Error(`Rollback failed: ${r.status} ${await r.text()}`);
  }

  async ping(): Promise<boolean> {
    try {
      const r = await this.fetchImpl(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return r.ok;
    } catch {
      return false;
    }
  }
}
