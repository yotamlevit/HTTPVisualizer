# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An interactive, single-page web app that demystifies HTTP/1.1, HTTP/2 and HTTP/3 by letting users construct a request visually and see the byte-for-byte hex dump update live. The UI is built in React + Vite + TypeScript + Tailwind + Zustand.

## Commands

- `npm run dev` — Vite dev server at `http://localhost:5173/`
- `npm run build` — `tsc -b` type-check + `vite build`; fails on any TS error
- `npm run preview` — serve the built bundle locally

There is no test runner, no ESLint config, and no CI configured. The `"lint"` npm script references `eslint` but the package is not installed — either ignore it or install ESLint before relying on it.

## The architecture that matters

### The byte-range / elementId contract (read this first)

Everything in this app hangs off one idea: **each UI input and each emitted byte share a string `elementId`**. This is what lets the user hover an input and see the exact corresponding bytes light up — and hover a byte and see its input light up.

- `src/types/protocol.ts` defines `ByteRange { start, end, elementId, concept, label }`. Every generator emits a `HexDump { bytes: Uint8Array, ranges: ByteRange[] }`.
- `src/store/useProtocolStore.ts` holds a single `hoveredElementId` in Zustand. Both sides (inputs via `LinkedField`/`HeadersEditor`, bytes via `HexDump`) write to it on mouse enter and read from it to decide whether to highlight.
- `src/components/HexDump.tsx` precomputes, per byte, the *innermost* range it belongs to; that range decides the byte's color and tooltip. Ranges are allowed to nest — generators deliberately emit an outer umbrella range for a whole header field plus inner ranges for each sub-part (index byte, name literal, value literal, etc.) so a hover on the editor row highlights the whole field while a hover on the "name length" hex byte highlights only that byte.

When adding a new field anywhere, you **must**:
1. Give it a unique `elementId` (convention: dotted path — `h2.pseudo.method`, `h1.header.<row-id>.value`, etc.).
2. Have the generator emit a `ByteRange` with that exact id and a `ConceptKind`.
3. Wrap the input in `LinkedField` (or `HeadersEditor` for dynamic rows) with the same `elementId`.

If the ids don't match, the bytes are still rendered but hover-linking silently breaks.

### Generators and the HexBuilder pattern

Pure TypeScript generators live in `src/lib/`:
- `http1.ts` — text protocol; every `\r\n` is emitted as its own `ByteRange` with concept `"crlf"` so it can be badged as `[CRLF]`. The empty CRLF that separates headers from body is explicit.
- `http2.ts` — 9-byte frame header via `appendFrame()` with **length back-patching**: 3 bytes are reserved, the payload is written, then the final length is written into the reserved slot via `HexBuilder.patch()`. Do not compute length ahead of time.
- `http3.ts` — `appendH3Frame()` uses `quicVarint()` for Type and Length. Length back-patching currently reserves a 2-byte varint slot; payloads needing 4/8-byte varints are clamped (documented in code).
- `hpack.ts` — small, **non-conformant** HPACK simulator. Its role is pedagogical: map `:method GET` to `0x82` etc. via a static-table subset, fall back to indexed-name-with-literal-value, then to new-name literal. No Huffman. `http3.ts` reuses this module for the QPACK simulation and prepends a QPACK block prefix `0x00 0x00`.
- `bytes.ts` — `HexBuilder` (push bytes + ranges, patch reserved offsets), `utf8`, `u24be`, `u32be`, `quicVarint`.

### Conceptual color palette (do not diverge)

Color is part of the product — it links bytes to inputs at a glance. The mapping lives in `src/lib/concept.ts` and is applied identically in both hex bytes and input frames:

| Concept           | Color  |
|-------------------|--------|
| Frame header bytes (length/type/flags/streamID, or H3 varints) | yellow/amber |
| Pseudo-headers (`:method`, `:path`, ...) | purple |
| Standard headers | blue |
| Body / DATA payload | green |
| CRLF | red |
| HTTP/1.1 method | orange |
| HTTP/1.1 path | cyan |
| HTTP/1.1 version | pink |

Add new `ConceptKind` values in `src/types/protocol.ts` **and** a matching entry in `CONCEPT_STYLES`. If you forget the latter the app will throw at render time for that byte.

### Layout rule

Never use a side-by-side / split-screen layout. The app uses a **vertical scrolling card layout**: inputs on top of each card, the card's own isolated hex dump directly underneath. Stream-wide controls (e.g. HTTP/2 Stream ID) go in a thin card above the frame cards.

### Store shape

Three independent state trees (`http1`, `http2`, `http3`) live in one Zustand store alongside `protocol` and `hoveredElementId`. This means switching protocols preserves each mode's inputs. Use the typed setter methods on the store rather than `set()`-ing ad-hoc slices; every setter treats the relevant sub-tree immutably.

## Path alias

`@/*` resolves to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`). Keep imports using the alias for clarity.

## When making changes

- A single keystroke must recompute the hex dump without lag. Generators are pure and memoized via `useMemo(..., [state])` in each mode component; do not introduce async work or side effects in the `lib/` layer.
- Don't break the invariant that an `elementId` referenced by a `LinkedField` appears as `elementId` in at least one `ByteRange` produced for the current protocol — otherwise hovering is dead on one side.
- The HPACK/QPACK code is intentionally simplified for teaching. If you need real HPACK, replace `src/lib/hpack.ts` — but expect tests and UI explanations to need updating because the exact bytes will change.
