import type { ConceptKind } from "@/types/protocol";

/**
 * Concept → color map.
 *
 * The Tailwind class strings below MUST be written as literal tokens the JIT
 * scanner can see; otherwise the utility class for that exact opacity will
 * never be generated. Do NOT derive hexBg via string transforms on hexIdleBg.
 */
export interface ConceptStyle {
  /** byte background when hovered (stronger tint) */
  hexBg: string;
  /** byte background when idle (subtle tint) */
  hexIdleBg: string;
  /** text color for hex bytes */
  hexText: string;
  /** badge background for the legend */
  badgeBg: string;
  /** badge border */
  badgeBorder: string;
  /** badge text */
  badgeText: string;
  /** underlying CSS color (hex) — used for inline styles where Tailwind can't help */
  color: string;
}

export const CONCEPT_STYLES: Record<ConceptKind, ConceptStyle> = {
  method: {
    color: "#f97316",
    hexIdleBg: "bg-orange-500/20",
    hexBg: "bg-orange-500/40",
    hexText: "text-orange-700 dark:text-orange-300",
    badgeBg: "bg-orange-500/20",
    badgeBorder: "border-orange-500/50",
    badgeText: "text-orange-700 dark:text-orange-300",
  },
  path: {
    color: "#06b6d4",
    hexIdleBg: "bg-cyan-500/20",
    hexBg: "bg-cyan-500/40",
    hexText: "text-cyan-700 dark:text-cyan-300",
    badgeBg: "bg-cyan-500/20",
    badgeBorder: "border-cyan-500/50",
    badgeText: "text-cyan-700 dark:text-cyan-300",
  },
  version: {
    color: "#ec4899",
    hexIdleBg: "bg-pink-500/20",
    hexBg: "bg-pink-500/40",
    hexText: "text-pink-700 dark:text-pink-300",
    badgeBg: "bg-pink-500/20",
    badgeBorder: "border-pink-500/50",
    badgeText: "text-pink-700 dark:text-pink-300",
  },
  crlf: {
    color: "#ef4444",
    hexIdleBg: "bg-red-500/20",
    hexBg: "bg-red-500/40",
    hexText: "text-red-700 dark:text-red-300",
    badgeBg: "bg-red-500/20",
    badgeBorder: "border-red-500/50",
    badgeText: "text-red-700 dark:text-red-300",
  },
  "header-name": {
    color: "#3b82f6",
    hexIdleBg: "bg-blue-500/20",
    hexBg: "bg-blue-500/40",
    hexText: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-500/20",
    badgeBorder: "border-blue-500/50",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  "header-value": {
    color: "#60a5fa",
    hexIdleBg: "bg-sky-500/20",
    hexBg: "bg-sky-500/40",
    hexText: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-500/20",
    badgeBorder: "border-sky-500/50",
    badgeText: "text-sky-700 dark:text-sky-300",
  },
  "header-sep": {
    color: "#64748b",
    hexIdleBg: "bg-slate-500/20",
    hexBg: "bg-slate-500/40",
    hexText: "text-slate-700 dark:text-slate-300",
    badgeBg: "bg-slate-500/20",
    badgeBorder: "border-slate-500/50",
    badgeText: "text-slate-700 dark:text-slate-300",
  },
  body: {
    color: "#22c55e",
    hexIdleBg: "bg-emerald-500/20",
    hexBg: "bg-emerald-500/40",
    hexText: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-500/20",
    badgeBorder: "border-emerald-500/50",
    badgeText: "text-emerald-700 dark:text-emerald-300",
  },
  data: {
    color: "#22c55e",
    hexIdleBg: "bg-emerald-500/20",
    hexBg: "bg-emerald-500/40",
    hexText: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-500/20",
    badgeBorder: "border-emerald-500/50",
    badgeText: "text-emerald-700 dark:text-emerald-300",
  },
  "frame-length": {
    color: "#eab308",
    hexIdleBg: "bg-yellow-500/20",
    hexBg: "bg-yellow-500/40",
    hexText: "text-yellow-700 dark:text-yellow-300",
    badgeBg: "bg-yellow-500/20",
    badgeBorder: "border-yellow-500/50",
    badgeText: "text-yellow-700 dark:text-yellow-300",
  },
  "frame-type": {
    color: "#facc15",
    hexIdleBg: "bg-amber-500/20",
    hexBg: "bg-amber-500/40",
    hexText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  "frame-flags": {
    color: "#f59e0b",
    hexIdleBg: "bg-amber-500/20",
    hexBg: "bg-amber-500/40",
    hexText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  "frame-streamid": {
    color: "#fbbf24",
    hexIdleBg: "bg-yellow-600/20",
    hexBg: "bg-yellow-600/40",
    hexText: "text-yellow-700 dark:text-yellow-200",
    badgeBg: "bg-yellow-600/20",
    badgeBorder: "border-yellow-600/50",
    badgeText: "text-yellow-700 dark:text-yellow-200",
  },
  "frame-varint-type": {
    color: "#facc15",
    hexIdleBg: "bg-amber-500/20",
    hexBg: "bg-amber-500/40",
    hexText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  "frame-varint-length": {
    color: "#eab308",
    hexIdleBg: "bg-yellow-500/20",
    hexBg: "bg-yellow-500/40",
    hexText: "text-yellow-700 dark:text-yellow-300",
    badgeBg: "bg-yellow-500/20",
    badgeBorder: "border-yellow-500/50",
    badgeText: "text-yellow-700 dark:text-yellow-300",
  },
  "pseudo-header": {
    color: "#a855f7",
    hexIdleBg: "bg-purple-500/20",
    hexBg: "bg-purple-500/40",
    hexText: "text-purple-700 dark:text-purple-300",
    badgeBg: "bg-purple-500/20",
    badgeBorder: "border-purple-500/50",
    badgeText: "text-purple-700 dark:text-purple-300",
  },
  "standard-header": {
    color: "#3b82f6",
    hexIdleBg: "bg-blue-500/20",
    hexBg: "bg-blue-500/40",
    hexText: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-500/20",
    badgeBorder: "border-blue-500/50",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
};

export const conceptStyle = (c: ConceptKind) => CONCEPT_STYLES[c];
