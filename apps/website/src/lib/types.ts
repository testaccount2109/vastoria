export interface DownloadAsset {
  url: string;
  sha256: string;
  size_bytes: number;
  recommended?: boolean;
  platform?: string;
}

export interface ReleaseDownloads {
  installer?: DownloadAsset | null;
  portable?: DownloadAsset | null;
  msi?: DownloadAsset | null;
}

export interface Release {
  version: string;
  published_at: string;
  prerelease: boolean;
  changelog: string;
  tags?: string[];
  recommended?: boolean;
  downloads: ReleaseDownloads;
}

export interface ReleaseListResponse {
  releases: Release[];
  total: number;
}

export interface LatestReleaseResponse {
  release: Release;
}

export interface LatestDownloadResponse {
  version: string;
  platform: string;
  recommended: boolean;
  prerelease: boolean;
  downloads: ReleaseDownloads;
}
