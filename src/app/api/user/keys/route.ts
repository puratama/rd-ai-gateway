import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateApiKey(): string {
  return `xpgw_${randomBytes(32).toString("hex")}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.sub },
    select: {
      id: true,
      key: true,
      name: true,
      createdAt: true,
      lastUsed: true,
      isActive: true,
      usageCount: true,
      totalTokens: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, regenerateId } = body as { name?: string; regenerateId?: string };

  if (regenerateId) {
    // Regenerate specific key — revoke old, create new with same name
    const old = await prisma.apiKey.findFirst({
      where: { id: regenerateId, userId: session.sub },
    });
    if (!old) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }
    await prisma.apiKey.update({
      where: { id: regenerateId },
      data: { isActive: false },
    });
    const newKey = await prisma.apiKey.create({
      data: {
        key: generateApiKey(),
        name: name || old.name,
        userId: session.sub,
      },
    });
    return NextResponse.json({ key: newKey }, { status: 201 });
  }

  // Create new key
  const newKey = await prisma.apiKey.create({
    data: {
      key: generateApiKey(),
      name: name || "Default Key",
      userId: session.sub,
    },
  });

  return NextResponse.json({ key: newKey }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, isActive } = body as { id: string; name?: string; isActive?: boolean };

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.sub },
  });
  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;

  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    select: {
      id: true,
      key: true,
      name: true,
      createdAt: true,
      lastUsed: true,
      isActive: true,
      usageCount: true,
      totalTokens: true,
    },
  });

  return NextResponse.json({ key: updated });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.sub },
  });
  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
