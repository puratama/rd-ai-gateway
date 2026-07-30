import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const models = await prisma.appModel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        modelId: true,
        name: true,
        provider: true,
        isActive: true,
      },
    });
    return NextResponse.json(models);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
