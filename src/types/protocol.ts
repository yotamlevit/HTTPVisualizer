/**
 * Core protocol types for HTTP Visualizer.
 *
 * Design notes:
 * - The UI and the hex dump are linked by `ByteRange.elementId`. Every conceptual
 *   element (a header value, a pseudo-header, the CRLF after Start-Line, etc.)
 *   gets a stable id; the hex generator emits ByteRange rows; the renderer uses
 *   the same ids to paint the hex and the inputs in matching colors and to
 *   orchestrate bidirectional hover highlighting.
 */

export type Protocol = "HTTP/1.1" | "HTTP/2" | "HTTP/3";

export type ConceptKind =
  // HTTP/1.1
  | "method"
  | "path"
  | "version"
  | "crlf"
  | "header-name"
  | "header-value"
  | "header-sep"
  | "body"
  // H2 / H3 framing
  | "frame-length"
  | "frame-type"
  | "frame-flags"
  | "frame-streamid"
  | "frame-varint-type"
  | "frame-varint-length"
  // HPACK / QPACK
  | "pseudo-header"
  | "standard-header"
  | "data";

/** A contiguous byte span produced by a generator, tied back to a UI element. */
export interface ByteRange {
  /** inclusive start offset within the dump */
  start: number;
  /** exclusive end offset within the dump */
  end: number;
  /** the UI element this range belongs to (e.g. "h1.path", "h2.pseudo.method") */
  elementId: string;
  /** which visual palette slot to use */
  concept: ConceptKind;
  /** human label shown in the hex dump legend / tooltip */
  label: string;
}

export interface HexDump {
  bytes: Uint8Array;
  ranges: ByteRange[];
}

// ───────────────────────── HTTP/1.1 ─────────────────────────

export interface HeaderKV {
  id: string;
  name: string;
  value: string;
}

export interface Http1State {
  method: string;
  path: string;
  host: string;
  version: "HTTP/1.1";
  headers: HeaderKV[];
  body: string;
}

// ───────────────────────── HTTP/2 ─────────────────────────

/**
 * HTTP/2 frame types (subset we visualize).
 *  0x0 DATA     0x1 HEADERS     0x4 SETTINGS     ...
 * https://datatracker.ietf.org/doc/html/rfc7540#section-6
 */
export type H2FrameType = 0x0 | 0x1;

export interface H2PseudoHeaders {
  method: string;
  scheme: string;
  authority: string;
  path: string;
}

export interface Http2State {
  streamId: number;
  pseudo: H2PseudoHeaders;
  headers: HeaderKV[];
  body: string;
  /** END_HEADERS (0x4) / END_STREAM (0x1) flags — combined */
  endHeaders: boolean;
  endStream: boolean;
}

// ───────────────────────── HTTP/3 ─────────────────────────

/**
 * HTTP/3 frame types over QUIC streams:
 *  0x0 DATA     0x1 HEADERS (QPACK-encoded)     0x4 SETTINGS     ...
 * Frame header is { varint Type | varint Length } instead of H2's fixed 9-byte form.
 */
export type H3FrameType = 0x0 | 0x1;

export interface Http3State {
  pseudo: H2PseudoHeaders;
  headers: HeaderKV[];
  body: string;
}

// ───────────────────────── Hover state ─────────────────────────

export interface HoverState {
  /** The element currently hovered (from either side of the link). Null = nothing. */
  elementId: string | null;
}
