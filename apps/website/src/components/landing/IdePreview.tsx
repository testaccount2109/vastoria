"use client";

import { motion } from "framer-motion";
import {
  Bot,
  FileCode2,
  FolderTree,
  GitBranch,
  Search,
  Terminal,
} from "lucide-react";

const tabs = ["main.rs", "lib.rs", "Cargo.toml"];

const activityIcons = [FolderTree, Search, GitBranch, Bot];

export function IdePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative mx-auto w-full max-w-3xl"
    >
      <div className="absolute -inset-4 rounded-2xl bg-vast-accent/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-vast-border bg-vast-bg-elevated shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-vast-border bg-[#323233] px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-vast-fg-muted">
            vastoria — C:\Users\dev\projects\kernel-lab
          </span>
        </div>
        <div className="flex h-[340px]">
          <aside className="flex w-11 flex-col items-center gap-3 border-r border-vast-border bg-vast-activity py-3">
            {activityIcons.map((Icon, i) => (
              <span
                key={i}
                className={
                  i === 0
                    ? "text-vast-fg"
                    : "text-vast-fg-muted/60"
                }
              >
                <Icon className="h-5 w-5" />
              </span>
            ))}
          </aside>
          <aside className="hidden w-44 border-r border-vast-border bg-vast-sidebar p-2 sm:block">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-vast-fg-muted">
              Explorer
            </p>
            {["src/", "  main.rs", "  lib.rs", "Cargo.toml", "README.md"].map(
              (line) => (
                <p
                  key={line}
                  className={`truncate px-2 py-0.5 font-mono text-[11px] ${
                    line.includes("main.rs")
                      ? "bg-vast-bg-active text-vast-fg"
                      : "text-vast-fg-muted"
                  }`}
                >
                  {line}
                </p>
              ),
            )}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex border-b border-vast-border bg-vast-bg">
              {tabs.map((tab, i) => (
                <span
                  key={tab}
                  className={`flex items-center gap-1.5 border-r border-vast-border px-3 py-1.5 font-mono text-[11px] ${
                    i === 0
                      ? "bg-vast-tab-active text-vast-fg"
                      : "text-vast-fg-muted"
                  }`}
                >
                  <FileCode2 className="h-3 w-3" />
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex-1 overflow-hidden p-3 font-mono text-[11px] leading-relaxed">
              <p>
                <span className="text-vast-purple">fn</span>{" "}
                <span className="text-vast-green">main</span>
                <span className="text-vast-fg">() {"{"}</span>
              </p>
              <p className="pl-4">
                <span className="text-vast-fg-muted">{"// Native Windows AI IDE"}</span>
              </p>
              <p className="pl-4">
                <span className="text-vast-purple">let</span>{" "}
                <span className="text-vast-fg">runtime</span> ={" "}
                <span className="text-vast-orange">&quot;windows&quot;</span>;
              </p>
              <p>
                <span className="text-vast-fg">{"}"}</span>
              </p>
            </div>
            <div className="flex h-24 items-center gap-2 border-t border-vast-border bg-vast-terminal px-3">
              <Terminal className="h-3.5 w-3.5 shrink-0 text-vast-fg-muted" />
              <p className="font-mono text-[11px] text-vast-green">
                PS C:\projects\kernel-lab&gt; vastoria --version
              </p>
            </div>
          </div>
          <aside className="hidden w-36 border-l border-vast-border bg-vast-ai p-2 lg:block">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-vast-fg-muted">
              AI
            </p>
            <div className="space-y-2 rounded-md bg-vast-bg p-2 text-[10px] text-vast-fg-muted">
              <p>Explain this module…</p>
              <p className="text-vast-accent">Streaming via Ollama</p>
            </div>
          </aside>
        </div>
        <div className="flex items-center justify-between border-t border-vast-border bg-vast-status px-3 py-1 font-mono text-[10px] text-white/90">
          <span>main*</span>
          <span>Rust · Windows · UTF-8</span>
        </div>
      </div>
    </motion.div>
  );
}
