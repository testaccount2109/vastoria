import { useEffect, useRef } from "react";
import { useCommandStore } from "@/stores/commandStore";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const isOpen = useCommandStore((s) => s.isOpen);
  const query = useCommandStore((s) => s.query);
  const setQuery = useCommandStore((s) => s.setQuery);
  const close = useCommandStore((s) => s.close);
  const execute = useCommandStore((s) => s.execute);
  const filteredCommands = useCommandStore((s) => s.filteredCommands);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = filteredCommands();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-vast-border bg-vast-bg-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Enter" && commands[0]) void execute(commands[0].id);
          }}
          placeholder="Type a command…"
          className="w-full border-b border-vast-border bg-transparent px-4 py-3 text-sm text-vast-fg outline-none placeholder:text-vast-fg-muted"
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {commands.length === 0 && (
            <li className="px-4 py-2 text-sm text-vast-fg-muted">No matching commands</li>
          )}
          {commands.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => void execute(cmd.id)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-vast-bg-hover",
                  i === 0 && "bg-vast-bg-hover",
                )}
              >
                <span className="text-vast-fg">{cmd.label}</span>
                <span className="flex items-center gap-3 text-xs text-vast-fg-muted">
                  <span>{cmd.category}</span>
                  {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
