import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    const {
      getServerUsageSummary,
      loadServerUsageRecords,
      loadServerKeys,
      validateServerKey,
    } = await import("@/lib/server-store");

    const { getInternalKeys } = await import("@/lib/auth");
    const { internalKey } = getInternalKeys();

    if (token === internalKey) {
      // Admin - can see all usage or specific key
      if (keyId) {
        return NextResponse.json(await getServerUsageSummary(keyId));
      }
      const allRecords = await loadServerUsageRecords();
      const allKeys = await loadServerKeys();
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
        return NextResponse.json(await getServerUsageSummary(apiKey.userId));
      }
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
