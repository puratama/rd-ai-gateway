import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const aggregators = await prisma.aggregatorConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(aggregators.map((a) => ({
      id: a.id,
      name: a.name,
      baseUrl: a.baseUrl,
      hasApiKey: Boolean(a.apiKeyEnc),
      isActive: a.isActive,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })));
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = await request.json();
    const { name, baseUrl, apiKey, isActive = true } = body;

    if (!name || !baseUrl || !apiKey) {
      return NextResponse.json({ error: "name, baseUrl, apiKey required" }, { status: 400 });
    }

    const aggregator = await prisma.aggregatorConfig.create({
      data: {
        name,
        baseUrl,
        // ponytail: plaintext DB storage kept until proper KMS/encryption added.
        apiKeyEnc: apiKey,
        isActive,
      },
    });

    return NextResponse.json({ id: aggregator.id, name: aggregator.name, created: true }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = await request.json();
    const { id, name, baseUrl, apiKey, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (baseUrl !== undefined) data.baseUrl = baseUrl;
    if (apiKey !== undefined) data.apiKeyEnc = apiKey;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const aggregator = await prisma.aggregatorConfig.update({ where: { id }, data });
    return NextResponse.json({ id: aggregator.id, updated: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete aggregator
export async function DELETE(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.aggregatorConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
