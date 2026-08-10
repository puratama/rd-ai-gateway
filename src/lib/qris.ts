// QRIS EMVCo string manipulation: static → "masked" dynamic with amount.
// Bank Indonesia QRIS is an EMVCo-compliant TLV payload ("000201...").
// maskQris() keeps all merchant fields intact, only overrides:
//   - tag 01 Point of Initiation Method → "12" (dynamic)
//   - tag 54 Amount → requested nominal
// then recomputes tag 63 CRC16-CCITT so the QR stays valid.
//
// Caveat: rewriting a static merchant QRIS is NOT guaranteed to be
// accepted by all banks/e-wallets on scan. Admin UI warns about this.

export interface QrisTlv {
  tag: string;
  value: string;
}

/** Parse an EMVCo QR string into its TLV list. Throws on malformed input. */
export function parseQris(payload: string): QrisTlv[] {
  const src = payload.trim();
  if (src.length < 4 || !/^\d{4}/.test(src)) {
    throw new Error("Invalid QRIS payload: not an EMV string");
  }

  const out: QrisTlv[] = [];
  let i = 0;
  while (i < src.length) {
    if (i + 4 > src.length) throw new Error("Invalid QR payload: truncated TLV");
    const tag = src.slice(i, i + 2);
    const len = Number(src.slice(i + 2, i + 4));
    if (!Number.isInteger(len)) throw new Error(`Invalid QR payload: bad length near tag ${tag}`);
    i += 4;
    if (i + len > src.length) throw new Error(`Invalid QR payload: value overflow for tag ${tag}`);
    out.push({ tag, value: src.slice(i, i + len) });
    i += len;
  }
  return out;
}

/** Re-encode a TLV list back into an EMV string. */
export function buildQris(entries: QrisTlv[]): string {
  return entries
    .map(({ tag, value }) => `${tag}${String(value.length).padStart(2, "0")}${value}`)
    .join("");
}

/** CRC16-CCITT (init 0xFFFF, poly 0x1021) over an ASCII string. */
export function crc16ccitt(data: string): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** Validate a QRIS payload string. Returns an error message, or null when OK. */
export function validateQrisPayload(payload: string): string | null {
  try {
    const entries = parseQris(payload);
    if (!entries.some((t) => t.tag === "00" && t.value === "01")) {
      return "Bukan QRIS: tag 00 (payload format) bukan '01'";
    }
    if (!entries.some((t) => t.tag === "26" || t.tag === "51")) {
      return "Bukan QRIS: tag merchant account (26/51) tidak ditemukan";
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "QR payload tidak valid";
  }
}

/**
 * Build a masked (dynamic) QRIS string for a given nominal.
 * Errors if the static payload cannot mask.
 */
export function maskQris(payload: string, amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid QRIS amount");
  }

  const entries = parseQris(payload);

  const setTag = (tag: string, value: string) => {
    const existing = entries.find((t) => t.tag === tag);
    if (existing) existing.value = value;
    else entries.push({ tag, value });
  };

  setTag("01", "12"); // dynamic point of initiation
  setTag("54", String(amount)); // amount, no decimals/leading zeros

  // strip old CRC, recompute
  const stripped = entries.filter((t) => t.tag !== "63");
  const body = buildQris(stripped);
  return body + `6304${crc16ccitt(body).toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Render a QRIS payload into a PNG data URL (server-side via qrcode). */
export async function qrisToDataUrl(payload: string, size = 320): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(payload, { width: size, margin: 1, errorCorrectionLevel: "M" });
}