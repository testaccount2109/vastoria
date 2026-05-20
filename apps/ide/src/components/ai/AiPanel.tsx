import { useState } from "react";
import {
  FileCode,
  GitCompare,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { useChatStream } from "@/hooks/ai/useChatStream";
import { useAiBackend } from "@/hooks/ai/useAiBackend";
import { useFileContext } from "@/hooks/ai/useFileContext";
import { useDiffEdits } from "@/hooks/ai/useDiffEdits";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { cn } from "@/lib/utils";

export function AiPanel() {
  const [input, setInput] = useState("");
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const { buildContext, openFileCount, hasWorkspace } = useFileContext();
  const { streamAdapter, status, contextSynced, isAvailable } = useAiBackend({
    rootPath,
    buildContext,
  });
  const { messages, isStreaming, error, sendMessage, stop, clear } = useChatStream({
    streamAdapter,
  });
  const { pending, pendingCount, acceptEdit, rejectEdit, clearResolved } = useDiffEdits();

  const handleSend = () => {
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  };

  const statusLabel =
    status === "online"
      ? contextSynced
        ? "AI online · context synced"
        : "AI online"
      : status === "checking"
        ? "Checking AI…"
        : status === "disabled"
          ? "AI disabled"
          : "AI offline";

  return (
    <aside className="flex h-full flex-col bg-vast-ai border-l border-vast-border">
      <header className="flex items-center justify-between border-b border-vast-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-vast-fg-muted">
          AI Assistant
        </span>
        <div className="flex gap-1">
          <IconButton title="Clear chat" onClick={clear}>
            <Trash2 size={14} />
          </IconButton>
          {isStreaming && (
            <IconButton title="Stop" onClick={stop}>
              <Square size={14} />
            </IconButton>
          )}
        </div>
      </header>

      <div className="flex gap-2 border-b border-vast-border px-3 py-2 text-xs text-vast-fg-muted">
        <span className="flex items-center gap-1">
          <FileCode size={12} />
          {hasWorkspace ? `${openFileCount} files in context` : "No workspace"}
        </span>
        <span
          className={cn(
            status === "online" && "text-emerald-400",
            status === "offline" && "text-amber-500/90",
          )}
        >
          {statusLabel}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="border-b border-vast-border px-3 py-2">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-vast-fg-muted">
            <GitCompare size={12} />
            Pending edits ({pendingCount})
          </p>
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
            {pending
              .filter((p) => p.status === "pending")
              .map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded bg-vast-bg px-2 py-1"
                >
                  <span className="truncate">{p.path.split("/").pop()}</span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="text-green-400 hover:underline"
                      onClick={() => void acceptEdit(p.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="text-red-400 hover:underline"
                      onClick={() => rejectEdit(p.id)}
                    >
                      Reject
                    </button>
                  </span>
                </li>
              ))}
          </ul>
          <button
            type="button"
            className="mt-1 text-xs text-vast-fg-muted hover:text-vast-fg"
            onClick={clearResolved}
          >
            Clear resolved
          </button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-sm text-vast-fg-muted">
            {isAvailable
              ? "Ask about your codebase. Context is injected via the AI backend API before each message."
              : "Local AI offline. Enable under Sync → connections, or start vastoria-ai at http://127.0.0.1:18420 (Ollama on :11434)."}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-4 bg-vast-accent/20 text-vast-fg"
                : "mr-4 bg-vast-bg-elevated text-vast-fg",
            )}
          >
            <p className="mb-1 text-xs uppercase text-vast-fg-muted">{m.role}</p>
            <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
          </div>
        ))}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="border-t border-vast-border p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isAvailable ? "Ask Vastoria AI…" : "AI backend unavailable"
            }
            rows={3}
            disabled={!isAvailable}
            className="flex-1 resize-none rounded border border-vast-border bg-vast-bg px-2 py-1.5 text-sm text-vast-fg outline-none focus:border-vast-accent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !input.trim() || !isAvailable}
            className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded bg-vast-accent text-white hover:bg-vast-accent-hover disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-vast-fg-muted">Enter send · Shift+Enter newline</p>
      </div>
    </aside>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1 text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg"
    >
      {children}
    </button>
  );
}
