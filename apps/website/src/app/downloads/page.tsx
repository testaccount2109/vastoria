import type { Metadata } from "next";
import { DownloadCards } from "@/components/downloads/DownloadCards";
import { ReleaseList } from "@/components/releases/ReleaseList";
import { fetchLatestRelease } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Downloads",
  description: "Download Vastoria for Windows — setup installer, portable exe, and MSI.",
};

export default async function DownloadsPage() {
  const release = await fetchLatestRelease();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-vast-fg sm:text-4xl">
          Download Vastoria
        </h1>
        <p className="mt-4 text-lg text-vast-fg-muted">
          Windows x64 builds for Windows 11 and Windows 10. Latest stable:{" "}
          <span className="font-mono text-vast-fg">v{release.version}</span>
          {release.recommended && (
            <span className="ml-2 text-emerald-400">· Windows 11 recommended</span>
          )}
        </p>
      </div>

      <div className="mt-12">
        <DownloadCards release={release} />
      </div>

      <div className="mt-12">
        <ReleaseList releases={[release]} />
      </div>

      <div className="mt-12 rounded-xl border border-vast-border bg-vast-bg-elevated p-6">
        <h2 className="font-medium text-vast-fg">System requirements</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-vast-fg-muted">
          <li>Windows 10 version 1903+ or Windows 11 (x64)</li>
          <li>Microsoft Edge WebView2 Runtime (installed by setup when missing)</li>
          <li>4 GB RAM minimum, 8 GB recommended</li>
          <li>Optional: Ollama for local AI features</li>
        </ul>
      </div>
    </div>
  );
}
