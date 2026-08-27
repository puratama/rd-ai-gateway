// Edge-safe auth configuration (no Node.js dependency)
import { type JWTPayload } from "jose";

// Lazy guard: production requires explicit SECRET + SALT.
// Validasi di fungsi (bukan module scope) supaya `next build` tidak gagal
// saat env build belum tersedia; guard tetap aktif saat dipakai runtime.
export function getSecret(): Uint8Array {
  const secretKey = process.env.AUTH_SECRET || process.env.AUTH_SALT;
  if (!secretKey) {
    throw new Error("FATAL: AUTH_SECRET (or AUTH_SALT) environment variable is required");
  }
  return new TextEncoder().encode(secretKey);
}
export const COOKIE_NAME = "xpgw_session";
export const EXPIRY = "7d";

export interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
  role: "user" | "superadmin";
  status: "active" | "suspended" | "banned";
}
