import type { Metadata } from "next";
import { ReleaseList } from "@/components/releases/ReleaseList";
import { fetchReleases } from "@/lib/api";

export const metadata: Metadata = {
  title: "Releases",
  description: "Vastoria release history, changelogs, and download links.",
};

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const releases = await fetchReleases(true);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-semibold text-vast-fg sm:text-4xl">Releases</h1>
      <p className="mt-4 text-vast-fg-muted">
        Version history and changelogs. Download links are served from the
        Vastoria cloud API.
      </p>
      <div className="mt-10">
        <ReleaseList releases={releases} />
      </div>
    </div>
  );
}
