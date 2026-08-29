import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { corsOptions } from "@/lib/public-api";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { getSiteSettings } = await import("@/lib/site-settings");
    const settings = await getSiteSettings();
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Regular user (own API key): return own key info only
    if (token) {
      const { validateServerKey } = await import("@/lib/server-store");
      const apiKey = await validateServerKey(token);
      if (apiKey) {
        return NextResponse.json({
          keys: [{
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key ? `${apiKey.key.slice(0, 8)}...${apiKey.key.slice(-4)}` : `${settings.apiKeyPrefix}••••••••`,
            createdAt: apiKey.createdAt,
            lastUsed: apiKey.lastUsed,
            isActive: apiKey.isActive,
            usageCount: apiKey.usageCount,
            totalTokens: apiKey.totalTokens,
          }],
        });
      }
    }

    // Admin (list all keys): requires superadmin session, not a shared static key
    const authError = await requireSuperadmin();
    if (authError) return authError;

    const { loadServerKeys, maskApiKey } = await import("@/lib/server-store");
    const keys = await loadServerKeys();
    return NextResponse.json({ keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      key: maskApiKey(key.key, settings.apiKeyPrefix),
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      usageCount: key.usageCount,
      totalTokens: key.totalTokens,
    })) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { createServerKey, maskApiKey } = await import("@/lib/server-store");
    const { getSiteSettings } = await import("@/lib/site-settings");
    const settings = await getSiteSettings();
    const newKey = await createServerKey(name.trim());

    // Explicit field pick — never spread the raw DB row (it contains keyHash).
    // Plaintext secret returned once, here only.
    return NextResponse.json({
      key: {
        id: newKey.id,
        name: newKey.name,
        key: maskApiKey(newKey.key, settings.apiKeyPrefix),
        createdAt: newKey.createdAt,
        lastUsed: newKey.lastUsed,
        isActive: newKey.isActive,
        usageCount: newKey.usageCount,
        totalTokens: newKey.totalTokens,
        secret: newKey.secret,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireSuperadmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action") || "revoke";

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { revokeServerKey, deleteServerKey } = await import("@/lib/server-store");
    const success = action === "delete" ? await deleteServerKey(id) : await revokeServerKey(id);

    if (!success) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
