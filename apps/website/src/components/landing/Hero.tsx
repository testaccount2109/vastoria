"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IdePreview } from "./IdePreview";

interface HeroProps {
  latestVersion?: string;
}

export function Hero({ latestVersion }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-vast-accent/8 blur-3xl" />
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(rgba(60,60,60,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(60,60,60,0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
          animate={{ backgroundPosition: ["0px 0px", "48px 48px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-vast-border bg-vast-bg-elevated px-3 py-1 text-xs text-vast-fg-muted"
          >
            <Monitor className="h-3.5 w-3.5 text-vast-green" />
            Native Windows AI IDE · WebView2 · No Electron
          </motion.span>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            The AI IDE built for{" "}
            <span className="bg-gradient-to-r from-vast-accent to-vast-green bg-clip-text text-transparent">
              Windows developers
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-vast-fg-muted">
            Vastoria combines a Cursor-inspired workspace with local-first editing,
            integrated PowerShell and Windows Terminal, and Ollama-powered AI — optimized
            for Windows 11 and Windows 10.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button href="/downloads" size="lg">
              <Download className="h-4 w-4" />
              {latestVersion ? `Download v${latestVersion}` : "Download"}
            </Button>
            <Button href="/docs" variant="secondary" size="lg">
              Read the docs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          <p className="mt-4 text-xs text-vast-fg-muted">
            Setup.exe & portable · Tauri 2 · Works offline
          </p>
        </motion.div>

        <div className="mt-16">
          <IdePreview />
        </div>
      </div>
    </section>
  );
}
