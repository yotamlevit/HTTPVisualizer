import React, { useMemo } from "react";
import { asciiGlyph, toHex } from "@/lib/bytes";
import { conceptStyle } from "@/lib/concept";
import { useProtocolStore } from "@/store/useProtocolStore";
import type { ByteRange, HexDump as HexDumpT } from "@/types/protocol";

const BYTES_PER_ROW = 16;

interface Props {
  dump: HexDumpT;
  emptyHint?: string;
}

/**
 * Render a hex dump where each byte knows which UI element it belongs to.
 *
 * Implementation notes:
 *  - We pre-compute, for each byte offset, the "innermost" range it belongs to
 *    so color-coding and hover targeting are O(1) per byte.
 *  - The store holds the hovered elementId. When a byte belongs to that element
 *    (or to a *descendant* — e.g. hovering a pseudo-header row also highlights
 *    its sub-byte ranges), it gets the highlighted background.
 */
export const HexDump: React.FC<Props> = ({ dump, emptyHint }) => {
  const hoveredId = useProtocolStore((s) => s.hoveredElementId);
  const setHover = useProtocolStore((s) => s.setHover);

  const byteMeta = useMemo(() => computeByteMeta(dump), [dump]);

  if (dump.bytes.length === 0) {
    return (
      <div className="font-mono text-xs text-stone-500 dark:text-zinc-500 italic px-3 py-4">
        {emptyHint ?? "(empty)"}
      </div>
    );
  }

  const rows: number[] = [];
  for (let i = 0; i < dump.bytes.length; i += BYTES_PER_ROW) rows.push(i);

  const isHoveredByte = (offset: number): boolean => {
    if (!hoveredId) return false;
    const meta = byteMeta[offset];
    return meta.ids.includes(hoveredId);
  };

  return (
    <div className="font-mono text-[12px] leading-5 overflow-x-auto">
      <div className="min-w-[680px]">
        {rows.map((rowStart) => (
          <div key={rowStart} className="flex items-center gap-4 px-3 py-0.5">
            <span className="shrink-0 select-none text-stone-400 dark:text-zinc-600 w-16 tabular-nums">
              {rowStart.toString(16).padStart(6, "0").toUpperCase()}
            </span>

            <span className="flex gap-[2px] shrink-0">
              {Array.from({ length: BYTES_PER_ROW }, (_, i) => {
                const off = rowStart + i;
                if (off >= dump.bytes.length)
                  return <span key={i} className="inline-block w-[22px]" />;
                const byte = dump.bytes[off];
                const meta = byteMeta[off];
                const style = meta.innermost ? conceptStyle(meta.innermost.concept) : null;
                const hovered = isHoveredByte(off);

                const bg =
                  hovered && style
                    ? style.hexBg
                    : style
                      ? style.hexIdleBg
                      : "bg-transparent";
                const text = style ? style.hexText : "text-stone-500 dark:text-zinc-500";

                return (
                  <button
                    type="button"
                    key={i}
                    onMouseEnter={() =>
                      meta.innermost && setHover(meta.innermost.elementId)
                    }
                    onMouseLeave={() => setHover(null)}
                    className={[
                      "inline-flex w-[22px] justify-center rounded-sm px-0.5 tabular-nums transition-colors",
                      bg,
                      text,
                      hovered
                        ? "ring-1 ring-inset ring-stone-900/20 dark:ring-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
                        : "",
                    ].join(" ")}
                    title={meta.innermost?.label}
                  >
                    {toHex(byte)}
                  </button>
                );
              })}
            </span>

            <span className="shrink-0 text-stone-500 dark:text-zinc-500 tracking-tight">
              {Array.from({ length: BYTES_PER_ROW }, (_, i) => {
                const off = rowStart + i;
                if (off >= dump.bytes.length) return " ";
                const meta = byteMeta[off];
                const byte = dump.bytes[off];
                // CRLF shown as pill-style glyph
                if (meta.innermost?.concept === "crlf") {
                  if (byte === 0x0d) return "␍";
                  if (byte === 0x0a) return "␊";
                }
                return asciiGlyph(byte);
              }).join("")}
            </span>
          </div>
        ))}
      </div>

      <Legend dump={dump} />
    </div>
  );
};

interface ByteMeta {
  /** All range ids this byte is part of (outer and inner). */
  ids: string[];
  /** The *innermost* (smallest) range this byte is part of — drives color + title. */
  innermost: ByteRange | null;
}

const computeByteMeta = (dump: HexDumpT): ByteMeta[] => {
  const out: ByteMeta[] = Array.from({ length: dump.bytes.length }, () => ({
    ids: [],
    innermost: null,
  }));

  for (const r of dump.ranges) {
    for (let i = r.start; i < r.end; i++) {
      if (!out[i]) continue;
      out[i].ids.push(r.elementId);
      const cur = out[i].innermost;
      if (!cur || r.end - r.start < cur.end - cur.start) {
        out[i].innermost = r;
      }
    }
  }
  return out;
};

// ---------- Legend ----------

const Legend: React.FC<{ dump: HexDumpT }> = ({ dump }) => {
  // Show one badge per distinct concept present in this dump.
  const concepts = Array.from(
    new Set(dump.ranges.map((r) => r.concept)),
  );
  if (concepts.length === 0) return null;

  return (
    <div className="border-t border-stone-200 dark:border-zinc-800/80 mt-2 px-3 py-2 flex flex-wrap gap-1.5">
      {concepts.map((c) => {
        const s = conceptStyle(c);
        return (
          <span
            key={c}
            className={`pill ${s.badgeBg} ${s.badgeBorder} ${s.badgeText} border`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
            {labelFor(c)}
          </span>
        );
      })}
    </div>
  );
};

const labelFor = (c: string): string =>
  ({
    method: "Method",
    path: "Path",
    version: "Version",
    crlf: "CRLF",
    "header-name": "Header Name",
    "header-value": "Header Value",
    "header-sep": "Separator",
    body: "Body",
    data: "DATA",
    "frame-length": "Length (24b)",
    "frame-type": "Type (8b)",
    "frame-flags": "Flags (8b)",
    "frame-streamid": "Stream ID (31b)",
    "frame-varint-type": "varint Type",
    "frame-varint-length": "varint Length",
    "pseudo-header": "Pseudo-Header",
    "standard-header": "Header",
  })[c] ?? c;
