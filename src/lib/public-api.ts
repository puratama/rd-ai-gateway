import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { validateServerKey } from "@/lib/db/api-keys";
import { prisma } from "@/lib/db";
export { apiError, corsOptions, withPublicCors } from "./public-api-contract";

export function getApiToken(request: NextRequest): string | null {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();
  const authorization = request.headers.get("authorization");
  return authorization?.replace(/^Bearer\s+/i, "").trim() || null;
}

export async function resolvePublicUser(request: NextRequest, allowSession = true) {
  const token = getApiToken(request);
  if (token) {
    const apiKey = await validateServerKey(token);
    if (!apiKey) return null;
    return { user: apiKey.user, apiKey };
  }

  if (!allowSession) return null;
  const session = await getSession();
  if (!session?.sub) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { wallet: true } });
  return user ? { user, apiKey: null } : null;
}

