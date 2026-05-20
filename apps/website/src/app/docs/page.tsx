import type { Metadata } from "next";
import Link from "next/link";
import { DocsContent } from "@/components/docs/DocsContent";
import { setupSections, usageSections } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Setup and usage guides for Vastoria IDE on Windows.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="mb-10 lg:mb-0">
          <nav className="sticky top-20 space-y-6 text-sm">
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wider text-vast-fg-muted">
                Setup
              </p>
              <ul className="space-y-1.5">
                {setupSections.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`#${s.id}`}
                      className="text-vast-fg-muted hover:text-vast-accent"
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold uppercase tracking-wider text-vast-fg-muted">
                Usage
              </p>
              <ul className="space-y-1.5">
                {usageSections.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`#${s.id}`}
                      className="text-vast-fg-muted hover:text-vast-accent"
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        <div className="space-y-20">
          <DocsContent sections={setupSections} title="Setup guide" />
          <DocsContent sections={usageSections} title="Usage guide" />
        </div>
      </div>
    </div>
  );
}
