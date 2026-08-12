import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "./db";
import { reviewBillingPayment, ReviewError } from "./payment-review";

const TELEGRAM_API = "https://api.telegram.org";
const POLL_TIMEOUT_MS = 30_000;
const RETRY_MS = 3_000;
const JSON_HEADERS = { "Content-Type": "application/json" };

let pollingRunning = false;

type TelegramUpdate = {
  update_id: number;
  message?: { chat?: { id: number }; text?: string };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat?: { id: number }; message_id?: number };
  };
};

type BillingLike = {
  id: string;
  userId: string;
  type: string;
  amount: unknown;
  midtransOrderId: string | null;
  proofNote: string | null;
  proofImage: string | null;
};

export async function getTelegramConfig() {
  return prisma.telegramConfig.findFirst();
}

async function tg(token: string, method: string, body?: BodyInit, headers?: Record<string, string>) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, { method: "POST", body, headers });
  return res.json().catch(() => ({}));
}

function fmtIDR(n: number | string | unknown): string {
  return "Rp " + Number(n ?? 0).toLocaleString("id-ID");
}

async function buildBillingCaption(billing: BillingLike): Promise<string> {
  const user = await prisma.user
    .findUnique({ where: { id: billing.userId }, select: { email: true, name: true } })
    .catch(() => null);
  const typeLabel =
    billing.type === "topup"
      ? "Top-up Wallet"
      : billing.type === "package_purchase"
      ? "Purchase Paket"
      : billing.type;
  return [
    "🔔 Pembayaran Baru Menunggu Verifikasi",
    "",
    `Jumlah: ${fmtIDR(billing.amount)}`,
    `Tipe: ${typeLabel}`,
    billing.midtransOrderId ? `Order: ${billing.midtransOrderId}` : `ID: ${billing.id}`,
    user ? `User: ${user.name || user.email}` : null,
    billing.proofNote ? `Catatan: ${billing.proofNote}` : null,
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");
}

function paymentKeyboard(billingId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Setujui", callback_data: `pay:approve:${billingId}` },
        { text: "❌ Tolak", callback_data: `pay:reject:${billingId}` },
      ],
    ],
  };
}

/**
 * Send a pending payment notification (with proof photo when available) to
 * all registered admin chats. Never throws — bot failure must not break the
 * user's top-up flow.
 */
export async function notifyPaymentPending(billing: BillingLike): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg?.botTokenEnc || !cfg.isEnabled) return;
  const token = cfg.botTokenEnc;

  let firstChatId: string | null = null;
  let firstMessageId: number | null = null;

  const caption = await buildBillingCaption(billing);
  for (const chatId of cfg.adminChatIds) {
    try {
      const replyMarkup = paymentKeyboard(billing.id);
      let result: { ok?: boolean; result?: { message_id?: number } } = {};
      if (billing.proofImage) {
        const buf = await readFile(join(process.cwd(), "public", billing.proofImage)).catch(() => null);
        if (buf) {
          const fd = new FormData();
          const ext = (billing.proofImage.match(/\.(\w+)$/)?.[1] ?? "").toLowerCase();
          const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
          fd.append("chat_id", chatId);
          fd.append("photo", new Blob([buf], { type: mime }), billing.proofImage.split("/").pop() ?? "proof");
          fd.append("caption", caption);
          fd.append("reply_markup", JSON.stringify(replyMarkup));
          result = await tg(token, "sendPhoto", fd);
        }
      }
      if (!result.ok) {
        result = await tg(token, "sendMessage", JSON.stringify({ chat_id: chatId, text: caption, reply_markup: replyMarkup }), JSON_HEADERS);
      }
      if (!firstChatId && result.ok && typeof result.result?.message_id === "number") {
        firstChatId = chatId;
        firstMessageId = result.result.message_id;
      }
    } catch (err) {
      console.warn("[telegram] notifyPaymentPending failed:", err);
    }
  }

  if (firstChatId && firstMessageId) {
    await prisma.billingRecord
      .update({
        where: { id: billing.id },
        data: { telegramChatId: firstChatId, telegramMessageId: firstMessageId },
      })
      .catch(() => {});
  }
}

async function sendTestMessage(token: string, chatId: string): Promise<boolean> {
  const res = await tg(
    token,
    "sendMessage",
    JSON.stringify({ chat_id: chatId, text: "🔔 Test notifikasi Telegram — konfigurasi berhasil." }),
    JSON_HEADERS
  );
  return res.ok === true;
}

export async function sendTestToAdmins(): Promise<{ ok: boolean; message: string }> {
  const cfg = await getTelegramConfig();
  if (!cfg?.botTokenEnc) return { ok: false, message: "Bot token belum diisi" };
  if (cfg.adminChatIds.length === 0) return { ok: false, message: "Belum ada Chat ID admin" };
  let sent = 0;
  for (const chatId of cfg.adminChatIds) {
    if (await sendTestMessage(cfg.botTokenEnc, chatId)) sent++;
  }
  return { ok: true, message: `Test terkirim ke ${sent}/${cfg.adminChatIds.length} chat` };
}

function isAdminChat(chatId: number | string, adminChatIds: string[]): boolean {
  return adminChatIds.includes(String(chatId));
}

async function broadcastToAdmins(token: string, adminChatIds: string[], text: string) {
  for (const chatId of adminChatIds) {
    await tg(token, "sendMessage", JSON.stringify({ chat_id: chatId, text }), JSON_HEADERS).catch(() => {});
  }
}

function processUpdate(token: string, adminChatIds: string[], update: TelegramUpdate): Promise<void> {
  return (async () => {
    // /start → show chat ID so admin can register it in Settings > Telegram
    if (typeof update.message?.chat?.id === "number") {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";
      if (text === "/start" || text === "/help") {
        await tg(
          token,
          "sendMessage",
          JSON.stringify({
            chat_id: chatId,
            text:
              "Bot verifikasi pembayaran manual.\n\n" +
              `Chat ID Anda: ${chatId}\n\n` +
              "Masukkan Chat ID ini di Admin → Settings → Telegram agar chat Anda menerima " +
              "notifikasi pembayaran dan dapat approve/reject di sini.",
          }),
          JSON_HEADERS
        );
      }
      return;
    }

    const cb = update.callback_query;
    if (!cb?.data) return;

    if (!isAdminChat(cb.from.id, adminChatIds)) {
      await tg(
        token,
        "answerCallbackQuery",
        JSON.stringify({ callback_query_id: cb.id, text: "Anda tidak berizin", show_alert: true }),
        JSON_HEADERS
      );
      return;
    }

    const m = cb.data.match(/^pay:(approve|reject):(.+)$/);
    if (!m) return;

    const [, decision, billingId] = m;
    try {
      const { status } = await reviewBillingPayment(billingId, decision as "approve" | "reject");
      const approved = status === "paid";
      const label = approved ? "✅ Disetujui" : "❌ Ditolak";
      const billing = await prisma.billingRecord.findUnique({ where: { id: billingId } });
      const order = billing?.midtransOrderId ?? billingId;
      await broadcastToAdmins(
        token,
        adminChatIds,
        `${label}\nOrder: ${order}\nJumlah: ${fmtIDR(billing?.amount)}`
      );
      await tg(
        token,
        "answerCallbackQuery",
        JSON.stringify({ callback_query_id: cb.id, text: approved ? "Pembayaran disetujui" : "Pembayaran ditolak" }),
        JSON_HEADERS
      );
    } catch (err) {
      const msg =
        err instanceof ReviewError && err.status === 409
          ? "Pembayaran sudah diproses"
          : `Gagal memproses: ${err instanceof Error ? err.message : "error"}`;
      await tg(
        token,
        "answerCallbackQuery",
        JSON.stringify({ callback_query_id: cb.id, text: msg, show_alert: true }),
        JSON_HEADERS
      );
    }
  })();
}

async function pollLoop() {
  let offset = 0;
  while (pollingRunning) {
    const cfg = await getTelegramConfig();
    const token = cfg?.botTokenEnc;
    if (!token || !cfg?.isEnabled) {
      pollingRunning = false;
      return;
    }
    try {
      const url = `${TELEGRAM_API}/bot${token}/getUpdates?timeout=${Math.floor(POLL_TIMEOUT_MS / 1000)}&offset=${offset}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(POLL_TIMEOUT_MS + 4_000) });
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = Math.max(offset, update.update_id + 1);
          try {
            await processUpdate(token, cfg.adminChatIds, update);
          } catch (err) {
            console.warn("[telegram] processUpdate error:", err);
          }
        }
      } else if (data.error_code === 409) {
        // another getUpdates instance / webhook active — stop to avoid fights
        console.warn("[telegram] conflict on getUpdates — polling stopped.");
        pollingRunning = false;
        return;
      } else if (data.error_code === 401) {
        console.error("[telegram] invalid bot token — polling stopped.");
        pollingRunning = false;
        return;
      }
    } catch (err) {
      console.warn("[telegram] getUpdates error:", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, RETRY_MS));
  }
}

/**
 * Start long-polling. No-op when not configured or already running.
 * Re-reads config each iteration so enabling via the admin panel takes effect
 * without a server restart.
 */
export async function startTelegramPolling(): Promise<void> {
  if (pollingRunning) return;
  const cfg = await getTelegramConfig();
  if (!cfg?.botTokenEnc || !cfg.isEnabled) return;
  pollingRunning = true;
  console.log("[telegram] long-polling started.");
  void pollLoop();
}