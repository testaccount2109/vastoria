import { useEffect, useState } from "react";
import { CLOUD_API, fetchWithRetry, joinUrl } from "@vastoria/config";
import { aiHealthUrl } from "@/lib/ai/config";
import { getSyncApiBase } from "@/lib/sync/config";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

type PingState = "unknown" | "online" | "offline";

async function pingLocal(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

async function pingCloud(url: string): Promise<boolean> {
  try {
    const r = await fetchWithRetry(url, {
      retries: 2,
      retryDelayMs: 400,
      signal: AbortSignal.timeout(4000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function ServiceConnections({ compact = false }: { compact?: boolean }) {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const syncEnabled = useSettingsStore((s) => s.syncEnabled);
  const aiApiUrl = useSettingsStore((s) => s.aiApiUrl);
  const syncApiUrl = useSettingsStore((s) => s.syncApiUrl);
  const setAiEnabled = useSettingsStore((s) => s.setAiEnabled);
  const setSyncEnabled = useSettingsStore((s) => s.setSyncEnabled);

  const [aiPing, setAiPing] = useState<PingState>("unknown");
  const [cloudPing, setCloudPing] = useState<PingState>("unknown");

  useEffect(() => {
    const check = async () => {
      if (!aiEnabled) {
        setAiPing("offline");
      } else {
        const url = aiHealthUrl();
        setAiPing(url && (await pingLocal(url)) ? "online" : "offline");
      }
      if (!syncEnabled) {
        setCloudPing("offline");
      } else {
        const base = getSyncApiBase();
        setCloudPing(
          base && (await pingCloud(joinUrl(base, CLOUD_API.health)))
            ? "online"
            : "offline",
        );
      }
    };
    void check();
    const id = window.setInterval(() => void check(), 20_000);
    return () => window.clearInterval(id);
  }, [aiEnabled, syncEnabled, aiApiUrl, syncApiUrl]);

  if (compact) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <Dot label="AI" state={aiEnabled ? aiPing : "offline"} />
        <Dot label="Cloud" state={syncEnabled ? cloudPing : "offline"} />
      </span>
    );
  }

  return (
    <div className="space-y-3 border-t border-vast-border p-3 text-xs">
      <p className="font-semibold uppercase tracking-wide text-vast-fg-muted">
        Service connections
      </p>
      <p className="text-vast-fg-muted">
        Optional backends — IDE works fully offline without them.
      </p>
      <label className="flex items-center justify-between gap-2">
        <span className="text-vast-fg">AI backend</span>
        <input
          type="checkbox"
          checked={aiEnabled}
          onChange={(e) => setAiEnabled(e.target.checked)}
        />
      </label>
      {aiEnabled && (
        <input
          className="w-full rounded border border-vast-border bg-vast-bg px-2 py-1 text-vast-fg"
          value={aiApiUrl}
          onChange={(e) => useSettingsStore.getState().setAiApiUrl(e.target.value)}
        />
      )}
      <StatusLine label="AI" state={aiPing} endpoint={aiEnabled ? aiApiUrl : "disabled"} />
      <label className="flex items-center justify-between gap-2">
        <span className="text-vast-fg">Cloud sync</span>
        <input
          type="checkbox"
          checked={syncEnabled}
          onChange={(e) => setSyncEnabled(e.target.checked)}
        />
      </label>
      {syncEnabled && (
        <input
          className="w-full rounded border border-vast-border bg-vast-bg px-2 py-1 text-vast-fg"
          value={syncApiUrl}
          onChange={(e) => useSettingsStore.getState().setSyncApiUrl(e.target.value)}
        />
      )}
      <StatusLine
        label="Cloud"
        state={cloudPing}
        endpoint={syncEnabled ? syncApiUrl : "disabled"}
      />
    </div>
  );
}

function Dot({ label, state }: { label: string; state: PingState }) {
  return (
    <span className="flex items-center gap-1" title={`${label}: ${state}`}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "online" && "bg-emerald-400",
          state === "offline" && "bg-vast-fg-muted/50",
          state === "unknown" && "bg-amber-400",
        )}
      />
      {label}
    </span>
  );
}

function StatusLine({
  label,
  state,
  endpoint,
}: {
  label: string;
  state: PingState;
  endpoint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-vast-fg-muted">
      <span>
        {label}:{" "}
        <span
          className={cn(
            state === "online" && "text-emerald-400",
            state === "offline" && "text-vast-fg-muted",
          )}
        >
          {state}
        </span>
      </span>
      <span className="truncate font-mono text-[10px]" title={endpoint}>
        {endpoint.replace(/^https?:\/\//, "")}
      </span>
    </div>
  );
}
