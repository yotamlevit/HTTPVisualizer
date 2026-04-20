/**
 * Educational HPACK simulator (RFC 7541).
 *
 * This is NOT a conformant encoder. It only emulates the shapes a learner sees:
 *   • Static table indexed by 1-byte reference (e.g. :method GET → 0x82).
 *   • Literal header field with incremental indexing — new name (0x40) using
 *     plain-string (non-Huffman) length-prefixed literals.
 *   • Literal header field, indexed name + literal value (0x40 | idx) when we
 *     can match the name but not the value.
 *
 * Huffman coding is intentionally omitted so the bytes remain readable.
 */

import { utf8 } from "@/lib/bytes";

export interface HpackEncoding {
  bytes: number[];
  /** Semantic chunks so the UI can split this into nested byte ranges. */
  parts: {
    role: "index" | "name-len" | "name" | "value-len" | "value" | "prefix";
    bytes: number[];
  }[];
  /** Human-readable explanation shown under the hex. */
  explain: string;
}

/**
 * Minimal subset of the HPACK static table (RFC 7541 Appendix A).
 * Index is 1-based in HPACK; 0 is reserved.
 */
interface StaticEntry {
  index: number;
  name: string;
  value?: string;
}

const STATIC_TABLE: StaticEntry[] = [
  { index: 1, name: ":authority" },
  { index: 2, name: ":method", value: "GET" },
  { index: 3, name: ":method", value: "POST" },
  { index: 4, name: ":path", value: "/" },
  { index: 5, name: ":path", value: "/index.html" },
  { index: 6, name: ":scheme", value: "http" },
  { index: 7, name: ":scheme", value: "https" },
  { index: 8, name: ":status", value: "200" },
  { index: 9, name: ":status", value: "204" },
  { index: 10, name: ":status", value: "206" },
  { index: 11, name: ":status", value: "304" },
  { index: 12, name: ":status", value: "400" },
  { index: 13, name: ":status", value: "404" },
  { index: 14, name: ":status", value: "500" },
  { index: 15, name: "accept-charset" },
  { index: 16, name: "accept-encoding", value: "gzip, deflate" },
  { index: 17, name: "accept-language" },
  { index: 18, name: "accept-ranges" },
  { index: 19, name: "accept" },
  { index: 20, name: "access-control-allow-origin" },
  { index: 21, name: "age" },
  { index: 22, name: "allow" },
  { index: 23, name: "authorization" },
  { index: 24, name: "cache-control" },
  { index: 25, name: "content-disposition" },
  { index: 26, name: "content-encoding" },
  { index: 27, name: "content-language" },
  { index: 28, name: "content-length" },
  { index: 29, name: "content-location" },
  { index: 30, name: "content-range" },
  { index: 31, name: "content-type" },
  { index: 32, name: "cookie" },
  { index: 33, name: "date" },
  { index: 34, name: "etag" },
  { index: 35, name: "expect" },
  { index: 36, name: "expires" },
  { index: 37, name: "from" },
  { index: 38, name: "host" },
  { index: 39, name: "if-match" },
  { index: 40, name: "if-modified-since" },
  { index: 41, name: "if-none-match" },
  { index: 42, name: "if-range" },
  { index: 43, name: "if-unmodified-since" },
  { index: 44, name: "last-modified" },
  { index: 45, name: "link" },
  { index: 46, name: "location" },
  { index: 47, name: "max-forwards" },
  { index: 48, name: "proxy-authenticate" },
  { index: 49, name: "proxy-authorization" },
  { index: 50, name: "range" },
  { index: 51, name: "referer" },
  { index: 52, name: "refresh" },
  { index: 53, name: "retry-after" },
  { index: 54, name: "server" },
  { index: 55, name: "set-cookie" },
  { index: 56, name: "strict-transport-security" },
  { index: 57, name: "transfer-encoding" },
  { index: 58, name: "user-agent" },
  { index: 59, name: "vary" },
  { index: 60, name: "via" },
  { index: 61, name: "www-authenticate" },
];

const normalize = (s: string) => s.toLowerCase();

/** Find a (name,value) match or a name-only match. */
const staticLookup = (name: string, value: string) => {
  const n = normalize(name);
  let nameOnly: StaticEntry | undefined;
  for (const e of STATIC_TABLE) {
    if (e.name === n) {
      if (e.value !== undefined && e.value === value) {
        return { full: e, nameOnly: undefined };
      }
      if (!nameOnly) nameOnly = e;
    }
  }
  return { full: undefined, nameOnly };
};

/**
 * Integer encoding with prefix of N bits (RFC 7541 §5.1).
 * Used for index references and for length fields.
 */
const encodeInt = (value: number, prefixBits: number, flagBits: number): number[] => {
  const max = (1 << prefixBits) - 1;
  if (value < max) {
    return [(flagBits & ~max) | value];
  }
  const out = [(flagBits & ~max) | max];
  let remaining = value - max;
  while (remaining >= 128) {
    out.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }
  out.push(remaining);
  return out;
};

/** Encode a plain (non-Huffman) string literal: length byte + UTF-8 bytes. */
const encodeString = (s: string): { lenBytes: number[]; valueBytes: number[] } => {
  const bytes = Array.from(utf8(s));
  const lenBytes = encodeInt(bytes.length, 7, 0x00); // H=0, 7-bit length
  return { lenBytes, valueBytes: bytes };
};

/**
 * Encode one header field.
 *
 * Cases (ordered by what a teaching tool should show):
 *   1. Full static-table hit → indexed field (1xxxxxxx, 7-bit index).
 *   2. Name-only static hit  → literal-with-name-index (01xxxxxx + value).
 *   3. No match               → literal new-name (01000000 + name + value).
 */
export const encodeHeader = (name: string, value: string): HpackEncoding => {
  const { full, nameOnly } = staticLookup(name, value);

  if (full) {
    const bytes = encodeInt(full.index, 7, 0x80);
    return {
      bytes,
      parts: [{ role: "index", bytes }],
      explain: `Indexed Header Field — static[${full.index}] = ${full.name}${full.value !== undefined ? ": " + full.value : ""}`,
    };
  }

  if (nameOnly) {
    const indexBytes = encodeInt(nameOnly.index, 6, 0x40);
    const v = encodeString(value);
    return {
      bytes: [...indexBytes, ...v.lenBytes, ...v.valueBytes],
      parts: [
        { role: "index", bytes: indexBytes },
        { role: "value-len", bytes: v.lenBytes },
        { role: "value", bytes: v.valueBytes },
      ],
      explain: `Literal Header Field — indexed name static[${nameOnly.index}] (${nameOnly.name}), literal value`,
    };
  }

  const prefix = encodeInt(0, 6, 0x40); // 0x40 — new name, incremental indexing
  const n = encodeString(name);
  const v = encodeString(value);
  return {
    bytes: [...prefix, ...n.lenBytes, ...n.valueBytes, ...v.lenBytes, ...v.valueBytes],
    parts: [
      { role: "prefix", bytes: prefix },
      { role: "name-len", bytes: n.lenBytes },
      { role: "name", bytes: n.valueBytes },
      { role: "value-len", bytes: v.lenBytes },
      { role: "value", bytes: v.valueBytes },
    ],
    explain: `Literal Header Field — new name "${name}" + literal value`,
  };
};
