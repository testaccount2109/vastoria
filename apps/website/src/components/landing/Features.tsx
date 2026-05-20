"use client";

import { motion } from "framer-motion";
import {
  CloudOff,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Waypoints,
} from "lucide-react";

const features = [
  {
    icon: Terminal,
    title: "Integrated terminal",
    description:
      "Multi-session PTY with PowerShell, Windows Terminal, and CMD. Run builds and tests without leaving the editor.",
  },
  {
    icon: Sparkles,
    title: "Local AI via Ollama",
    description:
      "Chat, context, and diff staging connect to your own models — no cloud LLM required.",
  },
  {
    icon: CloudOff,
    title: "Offline-first",
    description:
      "Edit, index, and ship without network. Cloud sync and releases are optional extras.",
  },
  {
    icon: Cpu,
    title: "Tauri, not Electron",
    description:
      "Native WebView2 shell with a fraction of the memory footprint. Built for Windows only.",
  },
  {
    icon: Waypoints,
    title: "Windows desktop integration",
    description:
      "AppData storage, native file dialogs, Start Menu shortcuts, and installers designed for Windows 10 and 11.",
  },
  {
    icon: Layers,
    title: "VS Code familiarity",
    description:
      "Activity bar, Monaco editor, command palette, and splits — the layout you already know.",
  },
];

export function Features() {
  return (
    <section className="border-t border-vast-border bg-vast-bg-elevated/30 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-vast-fg sm:text-3xl">
            Everything you expect. Nothing you don&apos;t.
          </h2>
          <p className="mt-3 text-vast-fg-muted">
            A premium developer experience without shipping a Chromium browser.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="rounded-xl border border-vast-border bg-vast-bg p-6 transition-colors hover:border-vast-border/80 hover:bg-vast-bg-hover/50"
            >
              <feature.icon className="h-5 w-5 text-vast-accent" />
              <h3 className="mt-4 font-medium text-vast-fg">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-vast-fg-muted">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
