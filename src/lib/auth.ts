// Auth helpers (Node.js full runtime)
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { SECRET, COOKIE_NAME, EXPIRY, type SessionPayload } from "./auth-config";

export { SECRET, COOKIE_NAME, EXPIRY, type SessionPayload };

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Edge-safe JWT verify (for middleware)
export async function verifyTokenEdge(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Central password hashing — AES-style SHA256 with AUTH_SALT.
// For production: use bcrypt/argon2. (YAGNI for now.)
export function hashPassword(password: string): string {
  const currentSalt = process.env.AUTH_SALT || "xperimne-salt";
  return createHash("sha256").update(password + currentSalt).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Cron secret guard — production wajib set CRON_SECRET
export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("FATAL: CRON_SECRET environment variable is required in production");
  }
  return secret || "";
}

export function requireCronAuth(authHeader: string | null): { ok: boolean; message?: string } {
  const secret = getCronSecret();
  if (secret && authHeader !== `Bearer ${secret}`) {
    return { ok: false, message: "Unauthorized" };
  }
  if (!secret && process.env.NODE_ENV !== "production") {
    console.warn("[cron] CRON_SECRET not set — endpoint is unauthenticated. Dev only.");
  }
  return { ok: true };
}

// Internal keys — wajib random di production
export function getInternalKeys(): { internalKey: string; publicKey: string } {
  const internalKey = process.env.INTERNAL_API_KEY || "";
  const publicKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || "";

  if (process.env.NODE_ENV === "production") {
    if (!internalKey || !publicKey) {
      throw new Error("FATAL: INTERNAL_API_KEY and NEXT_PUBLIC_INTERNAL_KEY are required in production");
    }
    if (internalKey === "demo-key-xperimne" || publicKey === "demo-key-xperimne") {
      throw new Error("FATAL: Default demo-key-xperimne cannot be used in production");
    }
  } else {
    if (internalKey === "demo-key-xperimne" || publicKey === "demo-key-xperimne") {
      console.warn("WARNING: Using insecure default demo-key-xperimne for internal routing. Generate random keys for production.");
    }
  }

  return { internalKey, publicKey };
}
