import { NextRequest, NextResponse } from "next/server";
import { corsOptions, withPublicCors } from "@/lib/public-api";
import { requireSuperadmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    const token = apiKeyHeader || authHeader?.replace(/^Bearer\s+/i, "").trim();
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    const {
      getServerUsageSummary,
      loadServerUsageRecords,
      loadServerKeys,
      validateServerKey,
    } = await import("@/lib/server-store");

    const isAdmin = !(await requireSuperadmin());

    if (isAdmin) {
      // Admin - can see all usage or specific key
      const allKeys = await loadServerKeys();
      if (keyId) {
        const key = allKeys.find((item) => item.id === keyId);
        if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });
        return withPublicCors(NextResponse.json(await getServerUsageSummary(key.userId, keyId)));
      }
      const allRecords = await loadServerUsageRecords();
      return NextResponse.json({
        totalRequests: allRecords.length,
        totalTokens: allRecords.reduce((sum, r) => sum + (r.totalTokens || 0), 0),
        apiKeys: allKeys.length,
        activeKeys: allKeys.filter((k) => k.isActive).length,
        recentRecords: allRecords.slice(-100).reverse(),
        keys: allKeys.map((k) => ({
          id: k.id,
          name: k.name,
          usageCount: k.usageCount,
          totalTokens: k.totalTokens,
          isActive: k.isActive,
        })),
      });
    }

    if (token) {
      const apiKey = await validateServerKey(token);
      if (apiKey) {
        return withPublicCors(NextResponse.json(await getServerUsageSummary(apiKey.userId, apiKey.id)));
      }
    }

    return withPublicCors(NextResponse.json({ error: { message: "Unauthorized", type: "authentication_error", param: null, code: "invalid_api_key" } }, { status: 401 }));
  } catch (error: unknown) {
    return withPublicCors(NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Internal server error", type: "server_error", param: null, code: "internal_error" } },
      { status: 500 }
    ));
  }
}

export function OPTIONS() {
  return corsOptions();
}
