import test from "node:test";
import assert from "node:assert/strict";
import {
  parseQris,
  buildQris,
  crc16ccitt,
  maskQris,
  validateQrisPayload,
} from "../src/lib/qris";

// QRIS static payload (structurally valid, amount is absent → static scan):
//  00=01 | 01=11 | 26(GUID ID.CO.QRIS.WWW + merchant PAN) | 53=360 | 58=ID | 59=TOKO123 | 60=JAKARTA
const STATIC_PAYLOAD =
  "00020101021126370014ID.CO.QRIS.WWW011592384756103947553033605802ID5907TOKO1236007JAKARTA";

test("crc16ccitt known check value (CCITT-FALSE, '123456789' => 0x29B1)", () => {
  assert.equal(crc16ccitt("123456789").toString(16), "29b1");
});

test("parseQris round-trips through buildQris", () => {
  const entries = parseQris(STATIC_PAYLOAD);
  assert.equal(buildQris(entries), STATIC_PAYLOAD);
});

test("parseQris rejects malformed payload", () => {
  assert.throws(() => parseQris("zip"), /Invalid/);
});

test("maskQris forces dynamic point-of-initiation and embeds the amount", () => {
  const masked = maskQris(STATIC_PAYLOAD, 25000);
  const table = Object.fromEntries(parseQris(masked).map((t) => [t.tag, t.value]));
  assert.equal(table["01"], "12"); // static("11") → dynamic
  assert.equal(table["54"], "25000"); // no leading zeros
  assert.equal(table["59"], "TOKO123"); // merchant fields untouched
});

test("maskQris recomputes CRC16 and output ends with 6304", () => {
  const masked = maskQris(STATIC_PAYLOAD, 25000);
  assert.match(masked, /6304[0-9A-F]{4}$/);
  const body = masked.slice(0, -8); // "6304" + 4 hex CRC chars
  assert.equal(masked.slice(-4), crc16ccitt(body).toString(16).toUpperCase().padStart(4, "0"));
});

test("maskQris rejects invalid amounts", () => {
  assert.throws(() => maskQris(STATIC_PAYLOAD, 0), /amount/);
  assert.throws(() => maskQris(STATIC_PAYLOAD, -5), /amount/);
});

test("validateQrisPayload accepts valid QRIS, rejects garbage", () => {
  assert.equal(validateQrisPayload(STATIC_PAYLOAD), null);
  assert.notEqual(validateQrisPayload("hello"), null);
  assert.notEqual(validateQrisPayload("1234"), null);
});