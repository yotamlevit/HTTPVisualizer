import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { conceptStyle } from "@/lib/concept";
import { useProtocolStore } from "@/store/useProtocolStore";
import type { HeaderKV } from "@/types/protocol";

interface Props {
  headers: HeaderKV[];
  idPrefix: string; // e.g. "h1.header" or "h2.header" — lets this component serve H1/H2/H3
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<HeaderKV>) => void;
  onRemove: (id: string) => void;
}

/**
 * Dynamic key-value editor. Each row hover-links to a set of byte ranges in the
 * corresponding hex dump via `elementId = ${idPrefix}.${row.id}` with
 * `.name` / `.value` children that the generators emit.
 */
export const HeadersEditor: React.FC<Props> = ({
  headers,
  idPrefix,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const setHover = useProtocolStore((s) => s.setHover);
  const hoveredId = useProtocolStore((s) => s.hoveredElementId);
  const nameStyle = conceptStyle("header-name");
  const valStyle = conceptStyle("header-value");

  return (
    <div className="space-y-1.5">
      {headers.map((h) => {
        const rowId = `${idPrefix}.${h.id}`;
        const active = hoveredId?.startsWith(rowId);
        return (
          <div
            key={h.id}
            onMouseEnter={() => setHover(rowId)}
            onMouseLeave={() => setHover(null)}
            className={[
              "grid grid-cols-[1fr_2fr_auto] gap-2 items-stretch rounded-md border bg-white/60 p-1.5 transition-colors dark:bg-zinc-950/40",
              active
                ? "border-blue-500/50"
                : "border-stone-200 dark:border-zinc-800/80",
            ].join(" ")}
          >
            <input
              id={`${rowId}.name`}
              name={`${rowId}.name`}
              className="input !py-1.5"
              placeholder="Header-Name"
              value={h.name}
              onChange={(e) => onUpdate(h.id, { name: e.target.value })}
              onMouseEnter={() => setHover(`${rowId}.name`)}
              style={
                hoveredId === `${rowId}.name`
                  ? { borderColor: nameStyle.color }
                  : undefined
              }
            />
            <input
              id={`${rowId}.value`}
              name={`${rowId}.value`}
              className="input !py-1.5"
              placeholder="Header-Value"
              value={h.value}
              onChange={(e) => onUpdate(h.id, { value: e.target.value })}
              onMouseEnter={() => setHover(`${rowId}.value`)}
              style={
                hoveredId === `${rowId}.value`
                  ? { borderColor: valStyle.color }
                  : undefined
              }
            />
            <button
              type="button"
              onClick={() => onRemove(h.id)}
              className="btn !px-2 text-stone-500 hover:text-red-600 hover:border-red-500/40 dark:text-zinc-400 dark:hover:text-red-300"
              aria-label="remove header"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <button type="button" onClick={onAdd} className="btn btn-accent">
        <Plus className="w-3.5 h-3.5" />
        Add Header
      </button>
    </div>
  );
};
