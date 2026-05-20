import { useCallback, useRef, useState } from "react";
import type { ChatMessage, ChatStreamChunk } from "@/lib/ipc/types";

export interface UseChatStreamOptions {
  /** Called when a backend stream adapter is wired — not implemented here */
  streamAdapter?: (
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void,
    signal: AbortSignal,
  ) => Promise<void>;
}

export interface UseChatStreamResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

/**
 * Chat stream hook — UI state only.
 * Wire `streamAdapter` from an external AI integration layer later.
 */
export function useChatStream(options: UseChatStreamOptions = {}): UseChatStreamResult {
  const { streamAdapter } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setError(null);
  }, [stop]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, userMsg]);
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      if (!streamAdapter) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content:
              "AI backend not connected. Wire `streamAdapter` via the Vastoria AI integration layer.",
          },
        ]);
        setIsStreaming(false);
        abortRef.current = null;
        return;
      }

      let assistantContent = "";
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        await streamAdapter([...messages, userMsg], (chunk) => {
          if (controller.signal.aborted) return;
          assistantContent += chunk.delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m,
            ),
          );
        }, controller.signal);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Stream failed");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, streamAdapter],
  );

  return { messages, isStreaming, error, sendMessage, stop, clear };
}
