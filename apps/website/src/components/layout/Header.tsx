"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/downloads", label: "Downloads" },
  { href: "/changelog", label: "Changelog" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-vast-border/80 bg-vast-bg/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-vast-accent/15 ring-1 ring-vast-accent/30">
            <Terminal className="h-4 w-4 text-vast-accent" />
          </span>
          <span className="font-semibold tracking-tight text-vast-fg group-hover:text-white">
            Vastoria
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-vast-bg-hover text-vast-fg"
                    : "text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/downloads"
          className="rounded-md bg-vast-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-vast-accent-hover"
        >
          Download
        </Link>
      </motion.div>
    </header>
  );
}
