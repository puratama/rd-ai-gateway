// QRIS EMVCo string manipulation: static → "masked" dynamic with amount.
// Bank Indonesia QRIS is an EMVCo-compliant TLV payload ("000201...").
// maskQris() keeps all merchant fields intact, only overrides:
//   - tag 01 Point of Initiation Method → "12" (dynamic)
//   - tag 54 Amount → requested nominal
// then recomputes tag 63 CRC16-CCITT so the QR stays valid.
//
// Caveat: rewriting a static merchant QRIS is NOT guaranteed to be
// accepted by all banks/e-wallets on scan. Admin UI warns about this.
// Also: a static-masked QRIS is NOT registered with the bank backend, so
// there is no webhook — payment status comes from manual confirm.

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

  // Maintain original order as much as possible while inserting/updating tag 01 and tag 54.
  // Tag 01: Point of Initiation Method -> "12" (dynamic)
  const tag01 = entries.find((t) => t.tag === "01");
  if (tag01) {
    tag01.value = "12";
  } else {
    // Insert tag 01 after tag 00 if present
    const idx00 = entries.findIndex((t) => t.tag === "00");
    if (idx00 !== -1) {
      entries.splice(idx00 + 1, 0, { tag: "01", value: "12" });
    } else {
      entries.unshift({ tag: "01", value: "12" });
    }
  }

  // Tag 54: Transaction Amount
  const amountStr = String(amount);
  const tag54 = entries.find((t) => t.tag === "54");
  if (tag54) {
    tag54.value = amountStr;
  } else {
    // Insert tag 54 before tag 58, 59, 60 or 63 according to EMVCo spec order if missing
    const targetIdx = entries.findIndex((t) => ["55", "56", "57", "58", "59", "60", "61", "62", "63"].includes(t.tag));
    if (targetIdx !== -1) {
      entries.splice(targetIdx, 0, { tag: "54", value: amountStr });
    } else {
      entries.push({ tag: "54", value: amountStr });
    }
  }

  // Strip tag 63 (CRC), recompute, and append at the end
  const stripped = entries.filter((t) => t.tag !== "63");
  const body = buildQris(stripped) + "6304";
  return body + crc16ccitt(body).toString(16).toUpperCase().padStart(4, "0");
}

/** Render a QRIS payload into a PNG data URL (server-side via qrcode). */
export async function qrisToDataUrl(payload: string, size = 320): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(payload, { width: size, margin: 2, errorCorrectionLevel: "H" });
}

/**
 * Create a masked QRIS payment for the active "qris" merchant gateway.
 * Loads the static merchant payload from PaymentGatewayConfig (provider "qris").
 */
export async function createQrisPayment(
  orderId: string,
  amount: number
): Promise<{ qrDataUrl: string; maskedPayload: string; merchantName?: string }> {
  const { getPaymentConfig } = await import("./payment-config");
  const config = await getPaymentConfig("qris");
  if (!config?.qrisPayload) {
    throw new Error(
      "No active QRIS Merchant gateway configured. Go to Admin > Settings > Payment Gateway."
    );
  }
  const maskedPayload = maskQris(config.qrisPayload, amount);
  const merchantName = parseQris(maskedPayload).find((t) => t.tag === "59")?.value;
  const qrDataUrl = await qrisToDataUrl(maskedPayload);
  return { qrDataUrl, maskedPayload, merchantName };
}