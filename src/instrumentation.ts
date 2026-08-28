/**
 * Runs once at server startup. Starts the Telegram bot long-polling loop.
 * Reference: node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startTelegramPolling } = await import("./lib/telegram");
    // No-op when not configured/disabled; polling loop re-reads config each turn.
    await startTelegramPolling();
  } catch (err) {
    // Boot-time DB blip must not crash the server (which flips it unhealthy).
    console.error("[instrumentation] startTelegramPolling failed (continuing):", err);
  }
}