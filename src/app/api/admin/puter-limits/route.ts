import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const limits = await prisma.puterLimit.findMany({ take: 1 });
    return NextResponse.json(limits[0] ?? null);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { freeRequestsPerMonth, freeTokensPerMonth, appMaxRequestsPerDay, appMaxTokensPerMonth } = body;

    const data = {
      freeRequestsPerMonth: Math.max(0, parseInt(String(freeRequestsPerMonth), 10) || 0),
      freeTokensPerMonth: Math.max(0, parseInt(String(freeTokensPerMonth), 10) || 0),
      appMaxRequestsPerDay: Math.max(0, parseInt(String(appMaxRequestsPerDay), 10) || 0),
      appMaxTokensPerMonth: Math.max(0, parseInt(String(appMaxTokensPerMonth), 10) || 0),
    };

    // Validate: app limits must be <= free limits (warn only, don't block)
    const warnings: string[] = [];
    if (data.appMaxRequestsPerDay > data.freeRequestsPerMonth) {
      warnings.push("appMaxRequestsPerDay exceeds freeRequestsPerMonth — user may exhaust free quota early");
    }
    if (data.appMaxTokensPerMonth > data.freeTokensPerMonth) {
      warnings.push("appMaxTokensPerMonth exceeds freeTokensPerMonth — user may exhaust free quota early");
    }

    const existing = await prisma.puterLimit.findMany({ take: 1 });
    let record;
    if (existing.length) {
      record = await prisma.puterLimit.update({ where: { id: existing[0].id }, data });
    } else {
      record = await prisma.puterLimit.create({ data: { id: "default", ...data } });
    }

    return NextResponse.json({ record, warnings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
