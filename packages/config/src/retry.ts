export interface FetchWithRetryOptions extends RequestInit {
  /** Total attempts including the first (default 3). */
  retries?: number;
  /** Base delay in ms; doubled each retry (default 400). */
  retryDelayMs?: number;
  /** Optional hook when a retry is scheduled. */
  onRetry?: (attempt: number, error: unknown) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff for optional cloud APIs.
 * Local AI health checks should use a single attempt / short timeout instead.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const { retries = 3, retryDelayMs = 400, onRetry, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries - 1) {
      onRetry?.(attempt + 1, lastError);
      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
