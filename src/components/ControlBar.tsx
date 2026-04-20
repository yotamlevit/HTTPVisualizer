import React from "react";
import { Binary, Github, Moon, Network, Sun } from "lucide-react";
import { useProtocolStore } from "@/store/useProtocolStore";
import { useTheme } from "@/store/useTheme";
import type { Protocol } from "@/types/protocol";

const PROTOCOLS: Protocol[] = ["HTTP/1.1", "HTTP/2", "HTTP/3"];

export const ControlBar: React.FC = () => {
  const protocol = useProtocolStore((s) => s.protocol);
  const setProtocol = useProtocolStore((s) => s.setProtocol);
  const [theme, setTheme] = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/80 backdrop-blur supports-[backdrop-filter]:bg-stone-50/60 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
            <Binary className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold leading-none">HTTP Visualizer</h1>
            <p className="text-[11px] text-stone-500 mt-0.5 dark:text-zinc-500">
              Low-level protocol &amp; hex
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-stone-200 mx-1 dark:bg-zinc-800" />

        <label
          htmlFor="protocol-select"
          className="flex items-center gap-2 text-xs text-stone-600 dark:text-zinc-400"
        >
          <Network className="w-3.5 h-3.5" />
          Protocol
          <select
            id="protocol-select"
            name="protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as Protocol)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-mono text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-300"
          >
            {PROTOCOLS.map((p) => (
              <option key={p} value={p} className="bg-white dark:bg-zinc-950">
                {p}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="btn"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <a
            className="btn"
            href="https://datatracker.ietf.org/doc/html/rfc9110"
            target="_blank"
            rel="noreferrer"
          >
            RFC 9110
          </a>
          <a className="btn" href="https://github.com/yotamlevit/HTTPVisualizer" target="_blank" rel="noreferrer">
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Source</span>
          </a>
        </div>
      </div>
    </header>
  );
};
