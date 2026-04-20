import { HexBuilder, utf8 } from "@/lib/bytes";
import type { HexDump, Http1State } from "@/types/protocol";

/**
 * Render an HTTP/1.1 request as bytes with byte-range metadata.
 *
 * Structure (per RFC 7230):
 *   Method SP Request-URI SP Version CRLF
 *   (Header-Name ": " Header-Value CRLF)*
 *   CRLF                       ← the empty line separating headers and body
 *   [ body ]
 *
 * Every CRLF is emitted as its own ByteRange so the UI can render it as [CRLF]
 * both in the plaintext preview and in the hex dump.
 */
export const renderHttp1 = (s: Http1State): HexDump => {
  const b = new HexBuilder();

  // Start-Line
  b.push(utf8(s.method), {
    elementId: "h1.method",
    concept: "method",
    label: "Method",
  });
  b.push(utf8(" "), {
    elementId: "h1.sl.sp1",
    concept: "header-sep",
    label: "SP",
  });
  b.push(utf8(s.path || "/"), {
    elementId: "h1.path",
    concept: "path",
    label: "Request-Target",
  });
  b.push(utf8(" "), {
    elementId: "h1.sl.sp2",
    concept: "header-sep",
    label: "SP",
  });
  b.push(utf8(s.version), {
    elementId: "h1.version",
    concept: "version",
    label: "HTTP-Version",
  });
  b.push([0x0d, 0x0a], {
    elementId: "h1.sl.crlf",
    concept: "crlf",
    label: "CRLF",
  });

  // Header fields
  for (const h of s.headers) {
    if (!h.name) continue; // incomplete lines are skipped silently
    b.push(utf8(h.name), {
      elementId: `h1.header.${h.id}.name`,
      concept: "header-name",
      label: `Header-Name "${h.name}"`,
    });
    b.push(utf8(": "), {
      elementId: `h1.header.${h.id}.sep`,
      concept: "header-sep",
      label: "\": \"",
    });
    b.push(utf8(h.value), {
      elementId: `h1.header.${h.id}.value`,
      concept: "header-value",
      label: `Header-Value "${h.value}"`,
    });
    b.push([0x0d, 0x0a], {
      elementId: `h1.header.${h.id}.crlf`,
      concept: "crlf",
      label: "CRLF",
    });
  }

  // Mandatory empty CRLF that separates header section from body.
  b.push([0x0d, 0x0a], {
    elementId: "h1.sep.crlf",
    concept: "crlf",
    label: "CRLF (empty line — header/body separator)",
  });

  if (s.body) {
    b.push(utf8(s.body), {
      elementId: "h1.body",
      concept: "body",
      label: "Message Body",
    });
  }

  return b.build();
};
