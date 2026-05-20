import type { ChatMessage, ChatStreamChunk, FileContextPayload } from "@/lib/ipc/types";
import { pushWorkspaceContext } from "./contextApi";
import { getAiChatSession, type AiMode } from "./chatWs";
import { resolveAiHttpBase } from "./config";

export interface StreamAdapterOptions {
  projectId: string;
  buildContext: () => FileContextPayload;
  model?: string;
  mode?: AiMode;
  onContextPushed?: (ok: boolean) => void;
}

/**
 * API-driven chat stream for useChatStream.
 * Injects workspace context before each message; uses WebSocket /chat/stream.
 */
export function createAiStreamAdapter(options: StreamAdapterOptions) {
  const { projectId, buildContext, model, mode = "coding", onContextPushed } = options;

  return async (
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void,
    signal: AbortSignal,
  ): Promise<void> => {
    if (!resolveAiHttpBase()) {
      throw new Error("AI backend is disabled in settings");
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.content.trim()) {
      throw new Error("No user message to send");
    }

    const ctx = buildContext();
    const ctxResult = await pushWorkspaceContext(projectId, ctx);
    onContextPushed?.(ctxResult.ok);

    const requestId = crypto.randomUUID();
    const session = getAiChatSession();
    await session.streamChat(
      {
        project_id: projectId,
        message: lastUser.content,
        model: model ?? null,
        mode,
        request_id: requestId,
      },
      onChunk,
      signal,
    );
  };
}
