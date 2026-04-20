import React from "react";
import { conceptStyle } from "@/lib/concept";
import { useProtocolStore } from "@/store/useProtocolStore";
import type { ConceptKind } from "@/types/protocol";

interface BaseProps {
  elementId: string;
  concept: ConceptKind;
  label?: string;
  hint?: string;
  className?: string;
}

/**
 * Wrapper that:
 *  1. Registers hover-enter/leave against the shared store so the linked hex
 *     bytes highlight in sync (the `elementId` is the link).
 *  2. Tints the field's left border with its concept color to reinforce the
 *     byte-to-input color mapping.
 */
export const LinkedField: React.FC<
  BaseProps & { children: React.ReactNode }
> = ({ elementId, concept, label, hint, className = "", children }) => {
  const setHover = useProtocolStore((s) => s.setHover);
  const hoveredId = useProtocolStore((s) => s.hoveredElementId);
  const s = conceptStyle(concept);
  const active = hoveredId === elementId;

  return (
    <div
      onMouseEnter={() => setHover(elementId)}
      onMouseLeave={() => setHover(null)}
      className={[
        "rounded-md border bg-white/60 p-2 transition-colors dark:bg-zinc-950/40",
        active ? s.badgeBorder : "border-stone-200 dark:border-zinc-800/80",
        className,
      ].join(" ")}
      style={active ? { boxShadow: `0 0 0 1px ${s.color}55, 0 0 18px ${s.color}22` } : undefined}
    >
      {label ? (
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: s.color }}
          >
            {label}
          </span>
          {hint ? (
            <span className="text-[10px] text-stone-500 font-mono dark:text-zinc-500">
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
};
