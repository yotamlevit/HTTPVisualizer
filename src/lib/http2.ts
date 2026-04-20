import { HexBuilder, u24be, u32be, utf8 } from "@/lib/bytes";
import { encodeHeader } from "@/lib/hpack";
import type { ByteRange, HeaderKV, HexDump, Http2State } from "@/types/protocol";

/**
 * HTTP/2 frame types we visualize.
 * RFC 7540 §6:  0x0 DATA  |  0x1 HEADERS
 */
export const FRAME_TYPE = { DATA: 0x0, HEADERS: 0x1 } as const;

/**
 * HTTP/2 flags we visualize.
 * For HEADERS: END_STREAM 0x1, END_HEADERS 0x4.
 * For DATA:    END_STREAM 0x1.
 */
export const buildFlags = (endStream: boolean, endHeaders: boolean): number =>
  (endStream ? 0x1 : 0) | (endHeaders ? 0x4 : 0);

/**
 * Emit a complete HTTP/2 frame into a HexBuilder, back-patching the length
 * field after the payload is known.
 *
 * Format: 24-bit Length | 8-bit Type | 8-bit Flags | 1-bit R + 31-bit Stream ID | Payload
 */
export const appendFrame = (
  b: HexBuilder,
  opts: {
    idPrefix: string;
    type: number;
    typeLabel: string;
    flags: number;
    streamId: number;
    writePayload: (bb: HexBuilder) => void;
  },
): void => {
  const { idPrefix } = opts;

  // Reserve 3 bytes for length — patched later.
  const lengthOffset = b.length;
  b.push([0, 0, 0], {
    elementId: `${idPrefix}.frame.length`,
    concept: "frame-length",
    label: "Frame Length (24-bit)",
  });

  b.push(opts.type, {
    elementId: `${idPrefix}.frame.type`,
    concept: "frame-type",
    label: `Type = 0x${opts.type.toString(16).padStart(2, "0")} (${opts.typeLabel})`,
  });

  b.push(opts.flags, {
    elementId: `${idPrefix}.frame.flags`,
    concept: "frame-flags",
    label: `Flags = 0x${opts.flags.toString(16).padStart(2, "0")}`,
  });

  // Stream ID: top bit is the reserved "R" bit, always 0 for senders.
  const sid = opts.streamId & 0x7fffffff;
  b.push(u32be(sid), {
    elementId: `${idPrefix}.frame.streamid`,
    concept: "frame-streamid",
    label: `Stream ID = ${sid}`,
  });

  const payloadStart = b.length;
  opts.writePayload(b);
  const payloadLen = b.length - payloadStart;

  b.patch(lengthOffset, [...u24be(payloadLen)]);
};

/** Append one HPACK-encoded header with sub-ranges that map to input ids. */
const appendHpackHeader = (
  b: HexBuilder,
  name: string,
  value: string,
  idBase: string,
  concept: "pseudo-header" | "standard-header",
  label: string,
): void => {
  const enc = encodeHeader(name, value);
  const start = b.length;

  for (const part of enc.parts) {
    const subLabel =
      part.role === "index"
        ? "HPACK indexed reference"
        : part.role === "prefix"
          ? "HPACK literal prefix"
          : part.role === "name-len"
            ? "name length"
            : part.role === "value-len"
              ? "value length"
              : part.role === "name"
                ? "name literal"
                : "value literal";
    b.push(part.bytes, {
      elementId: `${idBase}.${part.role}`,
      concept,
      label: `${label} — ${subLabel}`,
    });
  }

  // An outer coarse-grained range for the whole field (used when hovering the row,
  // not an individual sub-part). We do not push bytes here — instead re-register an
  // umbrella range by post-editing the builder's range list.
  (b.ranges as ByteRange[]).push({
    start,
    end: b.length,
    elementId: idBase,
    concept,
    label: `${label} — "${name}: ${value}"`,
  });
};

/**
 * Build the 3 HTTP/2 frames as a single hex dump:
 *   Frame 1 — HEADERS (pseudo-headers only)
 *   Frame 2 — HEADERS (standard headers only, CONTINUATION-style but kept as HEADERS for simplicity)
 *   Frame 3 — DATA
 *
 * In real HTTP/2 these would typically be a single HEADERS frame (optionally
 * followed by CONTINUATION) plus a DATA frame. Splitting pseudo/standard across
 * two cards is a pedagogical choice the spec accommodates via CONTINUATION.
 */
export interface Http2HexOutput {
  dumps: {
    title: string;
    subtitle: string;
    dump: HexDump;
    cardId: "h2.pseudo" | "h2.headers" | "h2.data";
  }[];
}

export const renderHttp2 = (s: Http2State): Http2HexOutput => {
  const pseudoDump = renderH2PseudoFrame(s);
  const headersDump = renderH2HeadersFrame(s);
  const dataDump = renderH2DataFrame(s);

  return {
    dumps: [
      {
        title: "HEADERS Frame · Pseudo-Headers",
        subtitle: "9-byte frame header + HPACK-encoded :method :scheme :authority :path",
        dump: pseudoDump,
        cardId: "h2.pseudo",
      },
      {
        title: "HEADERS Frame · Standard Headers",
        subtitle: "Continuation of the header block — custom name/value pairs",
        dump: headersDump,
        cardId: "h2.headers",
      },
      {
        title: "DATA Frame · Body",
        subtitle: "9-byte frame header + request body bytes",
        dump: dataDump,
        cardId: "h2.data",
      },
    ],
  };
};

const renderH2PseudoFrame = (s: Http2State): HexDump => {
  const b = new HexBuilder();
  appendFrame(b, {
    idPrefix: "h2.pseudo",
    type: FRAME_TYPE.HEADERS,
    typeLabel: "HEADERS",
    flags: 0x00, // END_HEADERS set on the *second* HEADERS frame via CONTINUATION-like flow
    streamId: s.streamId,
    writePayload: (bb) => {
      appendHpackHeader(bb, ":method", s.pseudo.method, "h2.pseudo.method", "pseudo-header", ":method");
      appendHpackHeader(bb, ":scheme", s.pseudo.scheme, "h2.pseudo.scheme", "pseudo-header", ":scheme");
      appendHpackHeader(bb, ":authority", s.pseudo.authority, "h2.pseudo.authority", "pseudo-header", ":authority");
      appendHpackHeader(bb, ":path", s.pseudo.path, "h2.pseudo.path", "pseudo-header", ":path");
    },
  });
  return b.build();
};

const renderH2HeadersFrame = (s: Http2State): HexDump => {
  const b = new HexBuilder();
  const nonEmpty = s.headers.filter((h) => h.name);
  appendFrame(b, {
    idPrefix: "h2.headers",
    type: FRAME_TYPE.HEADERS,
    typeLabel: "HEADERS (cont.)",
    flags: buildFlags(false, s.endHeaders),
    streamId: s.streamId,
    writePayload: (bb) => {
      for (const h of nonEmpty) {
        appendHpackHeader(
          bb,
          h.name,
          h.value,
          `h2.header.${h.id}`,
          "standard-header",
          h.name,
        );
      }
    },
  });
  return b.build();
};

const renderH2DataFrame = (s: Http2State): HexDump => {
  const b = new HexBuilder();
  appendFrame(b, {
    idPrefix: "h2.data",
    type: FRAME_TYPE.DATA,
    typeLabel: "DATA",
    flags: buildFlags(s.endStream, false),
    streamId: s.streamId,
    writePayload: (bb) => {
      if (s.body) {
        bb.push(utf8(s.body), {
          elementId: "h2.data.body",
          concept: "data",
          label: "DATA payload (body)",
        });
      }
    },
  });
  return b.build();
};

// Re-export helpers useful in tests / components
export const _internals = {
  u24be,
  u32be,
  buildFlags,
  renderH2PseudoFrame,
  renderH2HeadersFrame,
  renderH2DataFrame,
};

export type H2Headers = HeaderKV[];
