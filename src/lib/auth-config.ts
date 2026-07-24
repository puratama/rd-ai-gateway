// Edge-safe auth configuration (no Node.js dependency)
import { type JWTPayload } from "jose";

// Guard: production requires explicit SECRET + SALT
const salt = process.env.AUTH_SALT;
if (!salt) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_SALT environment variable is required in production");
  }
  console.warn("WARNING: AUTH_SALT is missing. Using insecure fallback 'xperimne-salt'.");
}
const secretKey = process.env.AUTH_SECRET;
if (!secretKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_SECRET environment variable is required in production");
  }
  console.warn("WARNING: AUTH_SECRET is missing. Using insecure fallback 'xperimne-secret-fallback'.");
}

export const SECRET = new TextEncoder().encode(secretKey || salt || "xperimne-secret-fallback");
export const COOKIE_NAME = "xpgw_session";
export const EXPIRY = "7d";

export interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
  role: "user" | "superadmin";
}
