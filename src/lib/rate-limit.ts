// In-memory rate limiter (sliding window).
// Cukup untuk deployment single-instance (Docker gateway ini). Kalau nanti multi-instance,
// pindah ke store bersama (Redis) — ganti implementasi ini tanpa ubah signature.

const buckets = new Map<string, { count: number; resetAt: number }>();

// Bersihkan bucket kedaluwarsa biar map tidak membengkak.
const SWEEP_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}, SWEEP_MS).unref();

// Deployment has exactly one trusted reverse proxy in front (Traefik, see
// docker-compose.yml — app has no published host port, only reachable via
// the proxy network). Traefik appends the real peer IP as the LAST entry of
// X-Forwarded-For; earlier entries can be forged by the client, so trust
// only the last hop instead of the client-controlled first one.
function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  request: Request,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const fullKey = `${key}:${clientIp(request)}`;
  const b = buckets.get(fullKey);

  if (!b || b.resetAt < now) {
    buckets.set(fullKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (b.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count++;
  return { allowed: true, remaining: limit - b.count, retryAfterSec: 0 };
}
