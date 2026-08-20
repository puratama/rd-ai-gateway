import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { getSiteSettings } = await import("@/lib/site-settings");
    const settings = await getSiteSettings();
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Only master admin key can list all keys
    const { getInternalKeys } = await import("@/lib/auth");
    const { internalKey, publicKey } = getInternalKeys();
    if (token !== internalKey && token !== publicKey) {
      // Regular user can only see their own key info
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { getInternalKeys } = await import("@/lib/auth");
    const { internalKey, publicKey } = getInternalKeys();
    if (token !== internalKey && token !== publicKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { createServerKey } = await import("@/lib/server-store");
    const newKey = await createServerKey(name.trim());

    return NextResponse.json({ key: { ...newKey, key: newKey.secret, secret: newKey.secret } }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { getInternalKeys } = await import("@/lib/auth");
    const { internalKey, publicKey } = getInternalKeys();
    if (token !== internalKey && token !== publicKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
