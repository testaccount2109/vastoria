import { useCallback, useEffect, useMemo, useState } from "react";
import { projectIdFromPath } from "@vastoria/sync-client";
import { createAiStreamAdapter } from "@/lib/ai/createStreamAdapter";
import { aiHealthUrl } from "@/lib/ai/config";
import type { UseChatStreamOptions } from "./useChatStream";
import type { FileContextPayload } from "@/lib/ipc/types";
import { useSettingsStore } from "@/stores/settingsStore";

export type AiBackendStatus = "disabled" | "checking" | "online" | "offline";

export interface UseAiBackendOptions {
  rootPath: string | null;
  buildContext: () => FileContextPayload;
  model?: string;
}

export function useAiBackend(options: UseAiBackendOptions) {
  const { rootPath, buildContext, model } = options;
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const [status, setStatus] = useState<AiBackendStatus>(
    aiEnabled ? "checking" : "disabled",
  );
  const [contextSynced, setContextSynced] = useState(false);

  const projectId = useMemo(
    () => (rootPath ? projectIdFromPath(rootPath) : null),
    [rootPath],
  );

  const checkHealth = useCallback(async () => {
    if (!aiEnabled) {
      setStatus("disabled");
      return;
    }
    const url = aiHealthUrl();
    if (!url) {
      setStatus("disabled");
      return;
    }
    setStatus("checking");
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      setStatus(res.ok ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }, [aiEnabled]);

  useEffect(() => {
    void checkHealth();
    const id = window.setInterval(() => void checkHealth(), 30_000);
    return () => window.clearInterval(id);
  }, [checkHealth]);

  const streamAdapter = useMemo((): UseChatStreamOptions["streamAdapter"] => {
    if (!aiEnabled || !projectId || status !== "online") {
      return undefined;
    }
    return createAiStreamAdapter({
      projectId,
      buildContext,
      model,
      onContextPushed: (ok) => setContextSynced(ok),
    });
  }, [aiEnabled, projectId, status, buildContext, model]);

  return {
    streamAdapter,
    status,
    projectId,
    contextSynced,
    refreshStatus: checkHealth,
    isAvailable: Boolean(streamAdapter),
  };
}
