import { Download, HardDrive, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, truncateHash } from "@/lib/format";
import type { Release } from "@/lib/types";

interface DownloadCardsProps {
  release: Release;
  showRecommendedBadge?: boolean;
}

export function DownloadCards({
  release,
  showRecommendedBadge = true,
}: DownloadCardsProps) {
  const { installer, portable, msi } = release.downloads;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {installer ? (
        <article className="relative overflow-hidden rounded-xl border border-vast-accent/40 bg-vast-bg-elevated ring-1 ring-vast-accent/20">
          {showRecommendedBadge && (
            <div className="absolute right-4 top-4">
              <Badge variant="green">Recommended for Windows 11</Badge>
            </div>
          )}
          <div className="border-b border-vast-border px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-vast-accent/15">
                <HardDrive className="h-5 w-5 text-vast-accent" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-vast-fg">Setup installer</h2>
                <p className="text-sm text-vast-fg-muted">NSIS · Start Menu & uninstall</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-vast-fg-muted">
              Full Windows installer with desktop shortcut, Start Menu entry, and
              automatic WebView2 bootstrap when needed. Best for everyday development on
              Windows 10 and 11.
            </p>
            <dl className="space-y-2 font-mono text-xs text-vast-fg-muted">
              <div className="flex justify-between gap-4">
                <dt>Size</dt>
                <dd className="text-vast-fg">{formatBytes(installer.size_bytes)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>SHA256</dt>
                <dd className="truncate text-vast-fg" title={installer.sha256}>
                  {truncateHash(installer.sha256)}
                </dd>
              </div>
            </dl>
            <Button href={installer.url} size="lg" className="w-full">
              <Download className="h-4 w-4" />
              Download installer v{release.version}
            </Button>
          </div>
        </article>
      ) : null}

      {portable ? (
        <article className="rounded-xl border border-vast-border bg-vast-bg-elevated">
          <div className="border-b border-vast-border px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-vast-bg-hover">
                <Package className="h-5 w-5 text-vast-fg-muted" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-vast-fg">Portable .exe</h2>
                <p className="text-sm text-vast-fg-muted">No install required</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-vast-fg-muted">
              Single executable you can run from any folder or USB drive. Ideal for
              locked-down environments or quick trials.
            </p>
            <dl className="space-y-2 font-mono text-xs text-vast-fg-muted">
              <div className="flex justify-between gap-4">
                <dt>Size</dt>
                <dd className="text-vast-fg">{formatBytes(portable.size_bytes)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>SHA256</dt>
                <dd className="truncate text-vast-fg" title={portable.sha256}>
                  {truncateHash(portable.sha256)}
                </dd>
              </div>
            </dl>
            <Button
              href={portable.url}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Download className="h-4 w-4" />
              Download portable v{release.version}
            </Button>
          </div>
        </article>
      ) : null}

      {msi ? (
        <article className="rounded-xl border border-vast-border bg-vast-bg-elevated lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-vast-fg">MSI package</h2>
              <p className="text-sm text-vast-fg-muted">
                Enterprise deployment · {formatBytes(msi.size_bytes)}
              </p>
            </div>
            <Button href={msi.url} variant="secondary">
              <Download className="h-4 w-4" />
              Download MSI
            </Button>
          </div>
        </article>
      ) : null}
    </div>
  );
}
