// Provider health check — periodic ping to detect down providers
// ponytail: simple HTTP HEAD /health per provider on interval
// Upgrade path: add deep health (test completion endpoint), Slack/PagerDuty alerting

import type { ProviderConfig } from "./providers";

interface HealthState {
  provider: string;
  healthy: boolean;
  lastCheck: number;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  latencyMs: number;
  error?: string;
}

// ─── State ─────────────────────────────────────────────────────────────────

const states = new Map<string, HealthState>();
const CHECK_INTERVAL_MS = 60_000; // check every 60s
const CONSECUTIVE_FAIL_LIMIT = 3; // mark unhealthy after N failures
let intervalHandle: ReturnType<typeof setInterval> | null = null;

// ─── Public API ────────────────────────────────────────────────────────────

/** Start periodic health checks. Safe to call multiple times (no-ops if running). */
export function startHealthChecks(providers: () => ProviderConfig[]): void {
  if (intervalHandle) return;

  // Immediate first check, then periodic
  runAllChecks(providers);
  intervalHandle = setInterval(() => runAllChecks(providers), CHECK_INTERVAL_MS);
}

/** Stop periodic health checks. */
export function stopHealthChecks(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

/** Check if a provider is healthy. Defaults to true if unknown (optimistic). */
export function isHealthy(provider: string): boolean {
  const state = states.get(provider);
  if (!state) return true; // optimistic — assume healthy until proven
  return state.healthy;
}

/** Get health state for all providers. */
export function getAllHealthStates(): HealthState[] {
  return Array.from(states.values());
}

/** Force a health check for a specific provider immediately. */
export async function checkProviderHealth(provider: ProviderConfig): Promise<HealthState> {
  const start = Date.now();
  let healthy = false;
  let errorMsg: string | undefined;

  try {
    const url = provider.baseUrl.replace(/\/+$/, "");
    const res = await fetch(`${url}/health`, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    healthy = res.ok;
  } catch (err) {
    // Fallback: try GET /models or GET / (some providers don't have /health)
    try {
      const url = provider.baseUrl.replace(/\/+$/, "");
      await fetch(`${url}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
      healthy = true;
    } catch (err2) {
      healthy = false;
      errorMsg = err2 instanceof Error ? err2.message : String(err2);
    }
  }

  const latency = Date.now() - start;
  const prev = states.get(provider.name);

  const consecutiveFailures = healthy ? 0 : (prev?.consecutiveFailures || 0) + 1;
  const state: HealthState = {
    provider: provider.name,
    healthy: consecutiveFailures < CONSECUTIVE_FAIL_LIMIT,
    lastCheck: Date.now(),
    lastSuccess: healthy ? Date.now() : (prev?.lastSuccess || 0),
    lastFailure: healthy ? (prev?.lastFailure || 0) : Date.now(),
    consecutiveFailures,
    latencyMs: latency,
    error: errorMsg,
  };

  states.set(provider.name, state);
  return state;
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function runAllChecks(providers: () => ProviderConfig[]): Promise<void> {
  const all = providers();
  const results = await Promise.allSettled(
    all.map((p) => checkProviderHealth(p))
  );
  const healthy = results.filter(
    (r) => r.status === "fulfilled" && r.value.healthy
  ).length;
  const total = results.length;
  if (total > 0 && healthy < total) {
    console.log(`[HealthCheck] ${healthy}/${total} providers healthy`);
  }
}
