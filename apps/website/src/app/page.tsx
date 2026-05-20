import { CtaBand } from "@/components/landing/CtaBand";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { fetchLatestRelease } from "@/lib/api";

export default async function HomePage() {
  const latest = await fetchLatestRelease();

  return (
    <>
      <Hero latestVersion={latest.version} />
      <Features />
      <CtaBand version={latest.version} />
    </>
  );
}
