/** Byte-manipulation helpers used across HTTP/1.1, HTTP/2 and HTTP/3 generators. */

import type { ByteRange, HexDump } from "@/types/protocol";

const encoder = new TextEncoder();

export const utf8 = (s: string): Uint8Array => encoder.encode(s);

/** Concatenate multiple Uint8Arrays into one. */
export const concat = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

export const toHex = (b: number): string =>
  b.toString(16).padStart(2, "0").toUpperCase();

/** Printable ASCII for the gutter column; dot for anything else. */
export const asciiGlyph = (b: number): string =>
  b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";

/**
 * Small builder that lets generators append bytes while simultaneously tracking
 * which byte ranges belong to which UI element. This is what powers hover-linking.
 */
export class HexBuilder {
  private chunks: number[] = [];
  readonly ranges: ByteRange[] = [];

  get length(): number {
    return this.chunks.length;
  }

  push(
    bytes: Uint8Array | number[] | number,
    meta?: Omit<ByteRange, "start" | "end">,
  ): void {
    const arr =
      typeof bytes === "number"
        ? [bytes]
        : bytes instanceof Uint8Array
          ? Array.from(bytes)
          : bytes;
    const start = this.chunks.length;
    for (const b of arr) this.chunks.push(b & 0xff);
    if (meta) {
      this.ranges.push({ ...meta, start, end: this.chunks.length });
    }
  }

  /** Rewrite bytes at a previously-reserved offset (used for frame-length back-patching). */
  patch(offset: number, bytes: number[]): void {
    for (let i = 0; i < bytes.length; i++) {
      this.chunks[offset + i] = bytes[i] & 0xff;
    }
  }

  build(): HexDump {
    return { bytes: Uint8Array.from(this.chunks), ranges: this.ranges };
  }
}

/** 24-bit big-endian integer. Used for HTTP/2 frame length. */
export const u24be = (n: number): [number, number, number] => [
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

/** 32-bit big-endian integer. Used for HTTP/2 stream id (top bit reserved = 0). */
export const u32be = (n: number): [number, number, number, number] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

/**
 * QUIC variable-length integer encoding (RFC 9000 §16).
 *
 * First 2 bits of the first byte indicate the length: 1, 2, 4, or 8 bytes.
 * Max values per length:
 *   00 →       63  (1B)
 *   01 →    16383  (2B)
 *   10 → 2^30 - 1  (4B)
 *   11 → 2^62 - 1  (8B)
 *
 * We only support up to 2^32 here (fits the app's scale) and fall back to 8-byte form.
 */
export const quicVarint = (n: number): number[] => {
  if (n < 0) throw new Error("quicVarint: negative");
  if (n <= 63) return [n & 0x3f]; // 00xxxxxx
  if (n <= 16383) {
    const v = n | 0x4000;
    return [(v >> 8) & 0xff, v & 0xff];
  }
  if (n <= 0x3fffffff) {
    const v = n | 0x80000000;
    return [
      (v >>> 24) & 0xff,
      (v >>> 16) & 0xff,
      (v >>> 8) & 0xff,
      v & 0xff,
    ];
  }
  // 8-byte form: top two bits = 11
  const bytes = [0xc0, 0, 0, 0, 0, 0, 0, 0];
  // JS bit ops are 32-bit — split into hi/lo
  const hi = Math.floor(n / 2 ** 32);
  const lo = n >>> 0;
  bytes[0] |= (hi >>> 24) & 0x3f;
  bytes[1] = (hi >>> 16) & 0xff;
  bytes[2] = (hi >>> 8) & 0xff;
  bytes[3] = hi & 0xff;
  bytes[4] = (lo >>> 24) & 0xff;
  bytes[5] = (lo >>> 16) & 0xff;
  bytes[6] = (lo >>> 8) & 0xff;
  bytes[7] = lo & 0xff;
  return bytes;
};
