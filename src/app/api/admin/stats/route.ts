import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    const internalKey = process.env.INTERNAL_API_KEY || "";
    const publicKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || "";
    
    if (auth !== internalKey && auth !== publicKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getAdminStats } = await import("@/lib/server-store");
    const stats = getAdminStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
