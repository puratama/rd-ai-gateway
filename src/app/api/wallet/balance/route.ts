import { NextRequest, NextResponse } from "next/server";
import { apiError, corsOptions, resolvePublicUser, withPublicCors } from "@/lib/public-api";

export async function GET(request: NextRequest) {
  try {
    const identity = await resolvePublicUser(request);
    if (!identity) return apiError("Unauthorized", 401, "invalid_api_key");

    const wallet = identity.user.wallet;
    return withPublicCors(NextResponse.json({
      balance: wallet ? Number(wallet.balance) : 0,
      currency: "IDR",
    }));
  } catch (error: unknown) {
    return apiError(error instanceof Error ? error.message : "Internal server error", 500, "internal_error", "server_error");
  }
}

export function OPTIONS() {
  return corsOptions();
}
