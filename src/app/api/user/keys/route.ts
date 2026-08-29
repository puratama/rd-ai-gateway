import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey, maskApiKey } from "@/lib/db/api-keys";
import { getSiteSettings } from "@/lib/site-settings";

const publicKeySelect = {
  id: true,
  key: true,
  name: true,
  createdAt: true,
  lastUsed: true,
  isActive: true,
  expiresAt: true,
  allModels: true,
  allowedModels: true,
  usageCount: true,
  totalTokens: true,
} as const;

type PublicKeyRow = {
  id: string; key: string | null; name: string; createdAt: Date; lastUsed: Date | null;
  isActive: boolean; expiresAt: Date | null; allModels: boolean; allowedModels: string[];
  usageCount: number; totalTokens: number;
};

function toPublicKey(key: PublicKeyRow, prefix: string) {
  const maskedKey = maskApiKey(key.key, prefix);
  // Explicit pick — no spread, so sensitive columns (keyHash) can never leak.
  return {
    id: key.id,
    name: key.name,
    key: maskedKey,
    displayKey: maskedKey,
    createdAt: key.createdAt,
    lastUsed: key.lastUsed,
    isActive: key.isActive,
    expiresAt: key.expiresAt,
    allModels: key.allModels,
    allowedModels: key.allowedModels,
    usageCount: key.usageCount,
    totalTokens: key.totalTokens,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.sub },
    select: publicKeySelect,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    keys: keys.map((key) => toPublicKey(key, settings.apiKeyPrefix)),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, isActive, expiresAt, allModels, allowedModels } = body as {
    name?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    allModels?: boolean;
    allowedModels?: string[];
  };

  const settings = await getSiteSettings();
  const secret = generateApiKey(settings.apiKeyPrefix);

  const newKey = await prisma.apiKey.create({
    data: {
      key: null,
      keyHash: hashApiKey(secret),
      name: name || "Default Key",
      isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allModels: allModels ?? true,
      allowedModels: Array.isArray(allowedModels) ? allowedModels : [],
      userId: session.sub,
    },
    select: publicKeySelect,
  });

  return NextResponse.json(
    { key: { ...toPublicKey(newKey, settings.apiKeyPrefix), secret } },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, isActive, expiresAt, allModels, allowedModels } = body as {
    id: string;
    name?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    allModels?: boolean;
    allowedModels?: string[];
  };

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.sub },
  });
  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (allModels !== undefined) data.allModels = allModels;
  if (allowedModels !== undefined) data.allowedModels = allowedModels;

  const settings = await getSiteSettings();
  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    select: publicKeySelect,
  });

  return NextResponse.json({ key: toPublicKey(updated, settings.apiKeyPrefix) });
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
