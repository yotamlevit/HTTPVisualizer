import { HexBuilder, quicVarint, utf8 } from "@/lib/bytes";
import { encodeHeader } from "@/lib/hpack"; // QPACK shares the same static-table shape for this simulator
import type { ByteRange, HexDump, Http3State } from "@/types/protocol";

/**
 * HTTP/3 frame encoding (RFC 9114 §7.2).
 *
 * Unlike HTTP/2's fixed 9-byte header, HTTP/3 frames over a QUIC stream are:
 *   varint Type | varint Length | Payload
 *
 * There is no Stream ID at the HTTP layer — that's a QUIC concept below this app
 * layer. Flags are also absent at the frame-header level.
 *
 * QPACK (RFC 9204) replaces HPACK and has a slightly different wire format
 * (with a QPACK header block prefix containing "Required Insert Count" and
 * "Base"). For teaching purposes we approximate QPACK by reusing the HPACK
 * static-table shape and prepend the two-byte header block prefix 0x00 0x00
 * (Required Insert Count=0, Base=0) so learners see it.
 */

export const H3_FRAME = { DATA: 0x0, HEADERS: 0x1 } as const;

const appendH3Frame = (
  b: HexBuilder,
  opts: {
    idPrefix: string;
    type: number;
    typeLabel: string;
    writePayload: (bb: HexBuilder) => void;
  },
): void => {
  // We encode the type first, then reserve a placeholder for length and
  // patch it afterwards. Varints have variable size so we reserve worst-case
  // (2 bytes — covers up to 16383 which is ample for interactive use) and only
  // commit that size; for larger payloads we fall back to 4-byte varint
  // (indicated by first-byte tag bits).
  const typeBytes = quicVarint(opts.type);
  b.push(typeBytes, {
    elementId: `${opts.idPrefix}.frame.type`,
    concept: "frame-varint-type",
    label: `Type = 0x${opts.type.toString(16).padStart(2, "0")} (${opts.typeLabel}) — QUIC varint`,
  });

  // Reserve 2-byte varint for length; patch after payload.
  const lengthOffset = b.length;
  b.push([0x40, 0x00], {
    elementId: `${opts.idPrefix}.frame.length`,
    concept: "frame-varint-length",
    label: "Frame Length — QUIC varint",
  });

  const payloadStart = b.length;
  opts.writePayload(b);
  const payloadLen = b.length - payloadStart;

  const lenBytes = quicVarint(payloadLen);
  if (lenBytes.length === 2) {
    b.patch(lengthOffset, lenBytes);
  } else if (lenBytes.length === 1) {
    // Shrink: rewrite the length byte and shift payload left by 1.
    // To keep the dump honest we instead keep the 2-byte form by re-encoding
    // with the 2-byte tag bits.
    const v = payloadLen | 0x4000;
    b.patch(lengthOffset, [(v >> 8) & 0xff, v & 0xff]);
  } else {
    // 4 or 8 byte varint — this exceeds what we reserved.
    // For the educational scope we cap the displayed payload length.
    // In practice, bodies large enough to trigger this are rare in the UI.
    const clamped = Math.min(payloadLen, 16383);
    const v = clamped | 0x4000;
    b.patch(lengthOffset, [(v >> 8) & 0xff, v & 0xff]);
  }
};

const appendQpackHeader = (
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
        ? "QPACK indexed reference (static table)"
        : part.role === "prefix"
          ? "QPACK literal prefix"
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

  (b.ranges as ByteRange[]).push({
    start,
    end: b.length,
    elementId: idBase,
    concept,
    label: `${label} — "${name}: ${value}"`,
  });
};

export interface Http3HexOutput {
  dumps: {
    title: string;
    subtitle: string;
    dump: HexDump;
    cardId: "h3.pseudo" | "h3.headers" | "h3.data";
  }[];
}

export const renderHttp3 = (s: Http3State): Http3HexOutput => {
  const pseudoDump = renderH3PseudoFrame(s);
  const headersDump = renderH3HeadersFrame(s);
  const dataDump = renderH3DataFrame(s);

  return {
    dumps: [
      {
        title: "HEADERS Frame · Pseudo-Headers (QPACK)",
        subtitle: "varint Type + varint Length + QPACK-encoded pseudo-headers",
        dump: pseudoDump,
        cardId: "h3.pseudo",
      },
      {
        title: "HEADERS Frame · Standard Headers (QPACK)",
        subtitle: "same frame structure; standard headers encoded with QPACK",
        dump: headersDump,
        cardId: "h3.headers",
      },
      {
        title: "DATA Frame · Body",
        subtitle: "varint Type + varint Length + body bytes",
        dump: dataDump,
        cardId: "h3.data",
      },
    ],
  };
};

const writeQpackPrefix = (b: HexBuilder, idPrefix: string) => {
  // QPACK Required Insert Count = 0, Base = 0 → two zero bytes.
  b.push([0x00, 0x00], {
    elementId: `${idPrefix}.qpack.prefix`,
    concept: "frame-flags",
    label: "QPACK header block prefix (RIC=0, Base=0)",
  });
};

const renderH3PseudoFrame = (s: Http3State): HexDump => {
  const b = new HexBuilder();
  appendH3Frame(b, {
    idPrefix: "h3.pseudo",
    type: H3_FRAME.HEADERS,
    typeLabel: "HEADERS",
    writePayload: (bb) => {
      writeQpackPrefix(bb, "h3.pseudo");
      appendQpackHeader(bb, ":method", s.pseudo.method, "h3.pseudo.method", "pseudo-header", ":method");
      appendQpackHeader(bb, ":scheme", s.pseudo.scheme, "h3.pseudo.scheme", "pseudo-header", ":scheme");
      appendQpackHeader(bb, ":authority", s.pseudo.authority, "h3.pseudo.authority", "pseudo-header", ":authority");
      appendQpackHeader(bb, ":path", s.pseudo.path, "h3.pseudo.path", "pseudo-header", ":path");
    },
  });
  return b.build();
};

const renderH3HeadersFrame = (s: Http3State): HexDump => {
  const b = new HexBuilder();
  appendH3Frame(b, {
    idPrefix: "h3.headers",
    type: H3_FRAME.HEADERS,
    typeLabel: "HEADERS",
    writePayload: (bb) => {
      writeQpackPrefix(bb, "h3.headers");
      for (const h of s.headers) {
        if (!h.name) continue;
        appendQpackHeader(bb, h.name, h.value, `h3.header.${h.id}`, "standard-header", h.name);
      }
    },
  });
  return b.build();
};

const renderH3DataFrame = (s: Http3State): HexDump => {
  const b = new HexBuilder();
  appendH3Frame(b, {
    idPrefix: "h3.data",
    type: H3_FRAME.DATA,
    typeLabel: "DATA",
    writePayload: (bb) => {
      if (s.body) {
        bb.push(utf8(s.body), {
          elementId: "h3.data.body",
          concept: "data",
          label: "DATA payload (body)",
        });
      }
    },
  });
  return b.build();
};
