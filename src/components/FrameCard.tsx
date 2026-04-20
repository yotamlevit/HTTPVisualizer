import React from "react";
import { HexDump } from "./HexDump";
import type { HexDump as HexDumpT } from "@/types/protocol";

interface Props {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  dump: HexDumpT;
  emptyHint?: string;
  icon?: React.ReactNode;
}

/**
 * Generic vertical card: inputs on top, isolated hex dump on the bottom.
 * This is the layout unit that replaces the side-by-side split-screen.
 */
export const FrameCard: React.FC<Props> = ({
  title,
  subtitle,
  badge,
  children,
  dump,
  emptyHint,
  icon,
}) => {
  const byteCount = dump.bytes.length;

  return (
    <section className="card">
      <header className="card-head">
        {icon ? <span className="text-stone-500 dark:text-zinc-500">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">
              {title}
            </h3>
            {badge}
          </div>
          {subtitle ? (
            <p className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5 truncate">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="pill" title="Live byte count of this card's payload+frame">
          {byteCount} B
        </span>
      </header>

      <div className="px-4 py-4 space-y-3 border-b border-stone-200 dark:border-zinc-800/80">
        {children}
      </div>

      <div className="bg-stone-100/60 dark:bg-zinc-950/40">
        <HexDump dump={dump} emptyHint={emptyHint} />
      </div>
    </section>
  );
};
