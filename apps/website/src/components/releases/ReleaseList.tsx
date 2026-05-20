"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDate } from "@/lib/format";
import type { Release } from "@/lib/types";

function ChangelogBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="prose-vast space-y-2 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-vast-fg">
              {line.replace(/^##\s*/, "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="flex gap-2 text-vast-fg-muted">
              <span className="text-vast-accent">·</span>
              {line.slice(2)}
            </p>
          );
        }
        if (line.trim() === "") return null;
        return (
          <p key={i} className="text-vast-fg-muted">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ReleaseRow({ release, defaultOpen }: { release: Release; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <article className="rounded-xl border border-vast-border bg-vast-bg-elevated overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-vast-bg-hover/50"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg font-semibold text-vast-fg">
            v{release.version}
          </span>
          {release.prerelease && <Badge variant="accent">Pre-release</Badge>}
          {!release.prerelease && defaultOpen && (
            <Badge variant="green">Latest stable</Badge>
          )}
          <span className="text-sm text-vast-fg-muted">
            {formatDate(release.published_at)}
          </span>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-vast-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-vast-border px-5 py-5 space-y-5">
              <ChangelogBody text={release.changelog} />
              <div className="flex flex-wrap gap-3 pt-2">
                {release.downloads.installer && (
                  <Button href={release.downloads.installer.url} size="sm">
                    <Download className="h-3.5 w-3.5" />
                    Installer ({formatBytes(release.downloads.installer.size_bytes)})
                  </Button>
                )}
                {release.downloads.portable && (
                  <Button
                    href={release.downloads.portable.url}
                    variant="secondary"
                    size="sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Portable ({formatBytes(release.downloads.portable.size_bytes)})
                  </Button>
                )}
                {release.downloads.msi && (
                  <Button href={release.downloads.msi.url} variant="ghost" size="sm">
                    <Download className="h-3.5 w-3.5" />
                    MSI ({formatBytes(release.downloads.msi.size_bytes)})
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export function ReleaseList({ releases }: { releases: Release[] }) {
  if (releases.length === 0) {
    return (
      <p className="text-vast-fg-muted">No releases published yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {releases.map((release, i) => (
        <ReleaseRow
          key={release.version}
          release={release}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
