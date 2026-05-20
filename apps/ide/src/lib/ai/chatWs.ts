import type { ChatStreamChunk } from "@/lib/ipc/types";
import { resolveAiWsUrl } from "./config";

export type AiMode = "coding" | "design" | "reasoning";

interface WsChatPayload {
  project_id: string;
  message: string;
  model?: string | null;
  mode?: AiMode;
  request_id: string;
}

interface WsServerMessage {
  type: "token" | "done" | "error" | "pong" | "aborted";
  request_id: string;
  delta?: string | null;
  error?: string | null;
}

export class AiChatWebSocket {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;

  private async ensureConnected(): Promise<WebSocket> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      if (this.ws?.readyState === WebSocket.OPEN) return this.ws;
    }

    const url = resolveAiWsUrl();
    if (!url) {
      throw new Error("AI backend is not configured");
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("AI WebSocket connection timeout"));
      }, 8_000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.ws = ws;
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("AI WebSocket connection failed"));
      };
      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
      };
    });

    await this.connectPromise;
    this.connectPromise = null;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("AI WebSocket not connected");
    }
    return this.ws;
  }

  async streamChat(
    payload: WsChatPayload,
    onChunk: (chunk: ChatStreamChunk) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const ws = await this.ensureConnected();
    const requestId = payload.request_id;

    return new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(String(event.data)) as WsServerMessage;
          if (msg.request_id && msg.request_id !== requestId) return;

          if (msg.type === "token" && msg.delta) {
            onChunk({ delta: msg.delta, done: false });
          } else if (msg.type === "done") {
            onChunk({ delta: "", done: true });
            cleanup();
            resolve();
          } else if (msg.type === "error") {
            cleanup();
            reject(new Error(msg.error ?? "AI stream error"));
          } else if (msg.type === "aborted") {
            cleanup();
            reject(new DOMException("Aborted", "AbortError"));
          }
        } catch (e) {
          cleanup();
          reject(e instanceof Error ? e : new Error("Invalid WS message"));
        }
      };

      const onAbort = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "abort",
              request_id: requestId,
            }),
          );
        }
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        ws.removeEventListener("message", onMessage);
        signal.removeEventListener("abort", onAbort);
      };

      ws.addEventListener("message", onMessage);
      signal.addEventListener("abort", onAbort);

      ws.send(
        JSON.stringify({
          type: "chat",
          request_id: requestId,
          payload: {
            project_id: payload.project_id,
            message: payload.message,
            model: payload.model ?? null,
            mode: payload.mode ?? "coding",
            request_id: requestId,
          },
        }),
      );
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}

let sharedSession: AiChatWebSocket | null = null;

export function getAiChatSession(): AiChatWebSocket {
  if (!sharedSession) sharedSession = new AiChatWebSocket();
  return sharedSession;
}
