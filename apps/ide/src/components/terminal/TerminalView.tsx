import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  onTerminalExit,
  onTerminalOutput,
  resizeTerminal,
  writeTerminal,
} from "@/lib/ipc";
import { isTauri } from "@/lib/tauri";

interface TerminalViewProps {
  sessionId: string;
  isActive: boolean;
}

export function TerminalView({ sessionId, isActive }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 13,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#aeafad",
        selectionBackground: "#264f78",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    if (!isTauri()) {
      term.writeln("\x1b[33mVastoria terminal\x1b[0m — PTY available in Tauri build.");
      term.writeln("Run: \x1b[36mpnpm tauri:dev\x1b[0m for native shell sessions.\r\n");
      term.write("$ ");
    }

    term.onData((data) => {
      if (isTauri()) {
        void writeTerminal(sessionId, data);
      } else {
        if (data === "\r") {
          term.write("\r\n$ ");
        } else if (data === "\u007f") {
          term.write("\b \b");
        } else {
          term.write(data);
        }
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    let unlistenOut: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    void onTerminalOutput(({ sessionId: sid, data }) => {
      if (sid === sessionId) term.write(data);
    }).then((fn) => {
      unlistenOut = fn;
    });

    void onTerminalExit(({ sessionId: sid }) => {
      if (sid === sessionId) term.writeln("\r\n\x1b[31m[process exited]\x1b[0m");
    }).then((fn) => {
      unlistenExit = fn;
    });

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      if (isTauri()) {
        void resizeTerminal(sessionId, term.cols, term.rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      unlistenOut?.();
      unlistenExit?.();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [sessionId]);

  useEffect(() => {
    if (isActive && fitRef.current && containerRef.current) {
      fitRef.current.fit();
      if (isTauri() && termRef.current) {
        void resizeTerminal(sessionId, termRef.current.cols, termRef.current.rows);
      }
    }
  }, [isActive, sessionId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? "block" : "none" }}
    />
  );
}
