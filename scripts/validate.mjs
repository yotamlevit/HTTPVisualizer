/**
 * Headless validation of the pure TS protocol generators.
 * Runs via tsx so we can import the TS sources directly.
 *
 *   npx tsx scripts/validate.mjs
 */
import { renderHttp1 } from "../src/lib/http1.ts";
import { renderHttp2 } from "../src/lib/http2.ts";
import { renderHttp3 } from "../src/lib/http3.ts";
import { encodeHeader } from "../src/lib/hpack.ts";
import { quicVarint } from "../src/lib/bytes.ts";

let passed = 0;
let failed = 0;

const eq = (label, actual, expected) => {
  const a = Array.isArray(actual) ? actual.join(",") : String(actual);
  const e = Array.isArray(expected) ? expected.join(",") : String(expected);
  if (a === e) {
    passed++;
    console.log(`  \u2713 ${label}`);
  } else {
    failed++;
    console.log(`  \u2717 ${label}\n      expected: ${e}\n      actual:   ${a}`);
  }
};

const toHexStr = (u8) =>
  [...u8]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")
    .toUpperCase();

// ─────────────────── HTTP/1.1 ───────────────────
console.log("\nHTTP/1.1");
{
  const dump = renderHttp1({
    method: "GET",
    path: "/index.html",
    host: "example.com",
    version: "HTTP/1.1",
    headers: [{ id: "a", name: "Host", value: "example.com" }],
    body: "",
  });

  const asText = Buffer.from(dump.bytes).toString("utf8");
  const expected =
    "GET /index.html HTTP/1.1\r\n" + "Host: example.com\r\n" + "\r\n";
  eq("exact wire bytes", asText, expected);

  // CRLF ranges present — should be 3 (start-line, header, empty separator)
  const crlfRanges = dump.ranges.filter((r) => r.concept === "crlf");
  eq("three CRLF ranges", crlfRanges.length, 3);

  // Every CRLF range spans exactly 2 bytes (0x0D 0x0A)
  const allTwoBytes = crlfRanges.every((r) => r.end - r.start === 2);
  eq("each CRLF is 2 bytes", allTwoBytes, true);

  // The empty-line CRLF separator must be the last 2 bytes when there is no body
  const sep = dump.ranges.find((r) => r.elementId === "h1.sep.crlf");
  eq(
    "empty-line CRLF sits at end",
    sep && sep.end === dump.bytes.length,
    true,
  );

  // Method range covers bytes 0..3 (GET)
  const methodRange = dump.ranges.find((r) => r.elementId === "h1.method");
  eq("method range [0,3)", [methodRange.start, methodRange.end], [0, 3]);
}

// ─────────────────── HPACK static-table hits ───────────────────
console.log("\nHPACK static table (expected well-known bytes)");
{
  // :method GET → 0x82  (static index 2, indexed-field form sets top bit → 0x80 | 2)
  eq(":method GET → 0x82", encodeHeader(":method", "GET").bytes, [0x82]);
  // :scheme https → 0x87 (index 7)
  eq(":scheme https → 0x87", encodeHeader(":scheme", "https").bytes, [0x87]);
  // :path /index.html → 0x85 (index 5)
  eq(":path /index.html → 0x85", encodeHeader(":path", "/index.html").bytes, [0x85]);
  // :path / → 0x84 (index 4)
  eq(":path / → 0x84", encodeHeader(":path", "/").bytes, [0x84]);

  // :authority example.com — index 1 is name-only, so literal w/ indexed name.
  // 0x41 (01 000001) + 0x0B (len 11) + "example.com"
  const authBytes = encodeHeader(":authority", "example.com").bytes;
  const expectedAuth = [
    0x41,
    0x0b,
    ...Buffer.from("example.com", "utf8"),
  ];
  eq(":authority literal w/ indexed name", authBytes, expectedAuth);
}

// ─────────────────── HTTP/2 9-byte frame header ───────────────────
console.log("\nHTTP/2 frame layout");
{
  const out = renderHttp2({
    streamId: 1,
    pseudo: {
      method: "GET",
      scheme: "https",
      authority: "example.com",
      path: "/index.html",
    },
    headers: [],
    body: "",
    endHeaders: true,
    endStream: true,
  });

  const pseudo = out.dumps[0].dump; // HEADERS (pseudo-only) frame
  const first9 = Array.from(pseudo.bytes.slice(0, 9));

  // Bytes 0..2: 24-bit length (payload should be 1+1+14+1 = 17 bytes:
  //   0x82 (:method GET) + 0x87 (:scheme https) +
  //   [0x41 0x0B + 11 bytes ":authority example.com"] (13) +
  //   0x85 (:path /index.html) = 1 + 1 + 13 + 1 = 16
  // Compute from the payload slice rather than hardcoding.
  const lengthFromHeader =
    (first9[0] << 16) | (first9[1] << 8) | first9[2];
  const actualPayloadLen = pseudo.bytes.length - 9;
  eq("24-bit length matches payload", lengthFromHeader, actualPayloadLen);

  eq("type=HEADERS (0x01)", first9[3], 0x01);
  // Pseudo frame has flags=0x00 in our generator (END_HEADERS set on the second HEADERS frame)
  eq("flags=0x00 on pseudo frame", first9[4], 0x00);
  // Stream ID, big-endian, 31-bit (top bit reserved = 0)
  const sid =
    ((first9[5] & 0x7f) << 24) |
    (first9[6] << 16) |
    (first9[7] << 8) |
    first9[8];
  eq("stream id = 1", sid, 1);

  // The data-frame (third) with an empty body should yield a 9-byte frame header
  // with length = 0.
  const dataFrame = out.dumps[2].dump;
  eq("empty DATA frame is 9 bytes", dataFrame.bytes.length, 9);
  const dataLen = (dataFrame.bytes[0] << 16) | (dataFrame.bytes[1] << 8) | dataFrame.bytes[2];
  eq("empty DATA length=0", dataLen, 0);
  eq("DATA type=0x00", dataFrame.bytes[3], 0x00);
  // END_STREAM flag should be set (0x1) because endStream: true
  eq("END_STREAM flag set", dataFrame.bytes[4] & 0x01, 0x01);
}

// ─────────────────── QUIC varint ───────────────────
console.log("\nQUIC varint (RFC 9000 \u00a716)");
{
  eq("0 → [0x00]", quicVarint(0), [0x00]);
  eq("63 → [0x3F]", quicVarint(63), [0x3f]);
  eq("64 → 2-byte form [0x40,0x40]", quicVarint(64), [0x40, 0x40]);
  eq("16383 → [0x7F,0xFF]", quicVarint(16383), [0x7f, 0xff]);
  eq("16384 → 4-byte form", quicVarint(16384).length, 4);
}

// ─────────────────── HTTP/3 frame layout ───────────────────
console.log("\nHTTP/3 frame layout");
{
  const out = renderHttp3({
    pseudo: {
      method: "GET",
      scheme: "https",
      authority: "example.com",
      path: "/index.html",
    },
    headers: [],
    body: "",
  });
  const dataFrame = out.dumps[2].dump;
  // Empty DATA: Type=0x00 (1-byte varint) + Length=0 (reserved 2-byte form per our encoder)
  eq("empty H3 DATA frame is 3 bytes", dataFrame.bytes.length, 3);
  eq("H3 DATA type byte = 0x00", dataFrame.bytes[0], 0x00);
  // Reserved-length slot: first nibble tag = 01 (2-byte form), value 0 → 0x40 0x00
  eq("H3 length = 2-byte varint 0", Array.from(dataFrame.bytes.slice(1)), [0x40, 0x00]);

  // Pseudo-headers frame should start with [varint type=0x01][varint length=...]
  const pseudo = out.dumps[0].dump;
  eq("H3 HEADERS type byte = 0x01", pseudo.bytes[0], 0x01);
  // Length is a 2-byte varint with top 2 bits = 01 → first byte's top 2 bits
  eq("H3 length varint is 2-byte form", pseudo.bytes[1] & 0xc0, 0x40);

  const payloadLen = ((pseudo.bytes[1] & 0x3f) << 8) | pseudo.bytes[2];
  const actualPayloadLen = pseudo.bytes.length - 3; // type(1) + len(2)
  eq("H3 payload length matches varint", payloadLen, actualPayloadLen);

  // First two bytes of the payload are the QPACK header block prefix (RIC=0, Base=0).
  eq("QPACK prefix bytes = 0x00 0x00", Array.from(pseudo.bytes.slice(3, 5)), [0x00, 0x00]);
}

// ─────────────────── ByteRange invariants ───────────────────
console.log("\nByteRange invariants");
{
  const out = renderHttp2({
    streamId: 1,
    pseudo: {
      method: "POST",
      scheme: "https",
      authority: "api.example.com",
      path: "/v1/items",
    },
    headers: [
      { id: "h1", name: "content-type", value: "application/json" },
      { id: "h2", name: "x-custom", value: "value" },
    ],
    body: '{"ok":true}',
    endHeaders: true,
    endStream: true,
  });

  for (const card of out.dumps) {
    for (const r of card.dump.ranges) {
      if (r.start < 0 || r.end > card.dump.bytes.length || r.start >= r.end) {
        failed++;
        console.log(`  \u2717 bad range ${JSON.stringify(r)}`);
      }
    }
  }
  eq(
    "all H2 ranges are in-bounds",
    out.dumps.every((c) =>
      c.dump.ranges.every(
        (r) =>
          r.start >= 0 && r.end <= c.dump.bytes.length && r.start < r.end,
      ),
    ),
    true,
  );

  // Sanity: print a 16-byte preview for human eyes
  console.log(
    `     preview h2.pseudo first 16 bytes: ${toHexStr(
      out.dumps[0].dump.bytes.slice(0, 16),
    )}`,
  );
}

// ─────────────────── Summary ───────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
