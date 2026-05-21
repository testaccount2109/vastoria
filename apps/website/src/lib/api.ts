import {
  CLOUD_API,
  fetchWithRetry,
  joinUrl,
  resolveCloudApiUrl,
  resolveDownloadsUrl,
} from "@vastoria/config";
import type {
  LatestDownloadResponse,
  LatestReleaseResponse,
  Release,
  ReleaseListResponse,
} from "./types";

/** SSR: loopback API. Never use production defaults when CLOUD_API_URL is set. */
function getApiBase(): string {
  return (
    process.env.CLOUD_API_URL ??
    process.env.NEXT_PUBLIC_CLOUD_API_URL ??
    resolveCloudApiUrl()
  );
}

function getDownloadsBase(): string {
  return (
    process.env.DOWNLOADS_BASE_URL ??
    process.env.NEXT_PUBLIC_DOWNLOADS_URL ??
    resolveDownloadsUrl()
  );
}

function apiUrl(path: string): string {
  return joinUrl(getApiBase(), path);
}

function downloadsUrl(path: string): string {
  return joinUrl(getDownloadsBase(), path);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithRetry(apiUrl(path), {
    ...init,
    retries: 3,
    retryDelayMs: 500,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function downloadsFetch<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(downloadsUrl(path), {
    retries: 3,
    retryDelayMs: 500,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Downloads ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** All releases with changelogs and download links. */
export async function fetchReleases(
  includePrerelease = true,
  windowsOnly = false,
): Promise<Release[]> {
  try {
    const data = await downloadsFetch<ReleaseListResponse>("/windows/releases.json");
    let releases = data.releases;
    if (!includePrerelease) {
      releases = releases.filter((release) => !release.prerelease);
    }
    if (windowsOnly) {
      releases = releases.filter(
        (release) =>
          release.downloads.installer ||
          release.downloads.portable ||
          release.downloads.msi,
      );
    }
    return releases;
  } catch {
    // Fall through to the API. Static metadata is published by the release workflow.
  }

  try {
    const qs = new URLSearchParams({
      include_prerelease: String(includePrerelease),
      windows_only: String(windowsOnly),
    });
    const data = await apiFetch<ReleaseListResponse>(
      `${CLOUD_API.releases}?${qs}`,
    );
    return data.releases;
  } catch {
    return [];
  }
}

/** Latest stable release (releases API). */
export async function fetchLatestRelease(
  includePrerelease = false,
): Promise<Release> {
  try {
    const data = await downloadsFetch<LatestReleaseResponse>("/windows/latest.json");
    if (includePrerelease || !data.release.prerelease) {
      return data.release;
    }
  } catch {
    // Fall through to the API.
  }

  try {
    const data = await apiFetch<LatestReleaseResponse>(
      `${CLOUD_API.releasesLatest}?include_prerelease=${includePrerelease}`,
    );
    return data.release;
  } catch (error) {
    throw new Error("Unable to load current release metadata", { cause: error });
  }
}

/** Latest Windows download bundle (downloads API). */
export async function fetchLatestDownload(
  stableOnly = true,
): Promise<LatestDownloadResponse | null> {
  try {
    const data = await downloadsFetch<LatestReleaseResponse>("/windows/latest.json");
    const release = data.release;
    if (stableOnly && release.prerelease) {
      return null;
    }
    return {
      version: release.version,
      platform: "windows_x86_64",
      recommended: Boolean(release.recommended),
      prerelease: release.prerelease,
      downloads: release.downloads,
    };
  } catch {
    // Fall through to the API.
  }

  try {
    return await apiFetch<LatestDownloadResponse>(
      `${CLOUD_API.downloadsLatest}?stable_only=${stableOnly}`,
    );
  } catch {
    return null;
  }
}

export async function fetchRelease(version: string): Promise<Release | null> {
  try {
    const releases = await fetchReleases(true);
    const normalized = version.replace(/^v/, "");
    const match = releases.find((r) => r.version.replace(/^v/, "") === normalized);
    if (match) return match;
  } catch {
    // Fall through to the API.
  }

  try {
    return await apiFetch<Release>(CLOUD_API.release(version));
  } catch {
    return null;
  }
}

export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetchWithRetry(apiUrl(CLOUD_API.health), {
      retries: 2,
      retryDelayMs: 300,
    });
    return res.ok;
  } catch {
    return false;
  }
}
