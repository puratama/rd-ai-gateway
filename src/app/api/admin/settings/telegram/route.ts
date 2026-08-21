import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { startTelegramPolling } from "@/lib/telegram";

const CONFIG_ID = "telegram"; // singleton row

export async function GET() {
  const authError = await requireSuperadmin();
  if (authError) return authError;

  try {
    const cfg = await prisma.telegramConfig.findUnique({ where: { id: CONFIG_ID } });
    return NextResponse.json({
      hasToken: Boolean(cfg?.botTokenEnc),
      adminChatIds: cfg?.adminChatIds ?? [],
      isEnabled: cfg?.isEnabled ?? false,
    });
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
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.botToken === "string") {
      const token = body.botToken.trim();
      if (token) data.botTokenEnc = token;
    }
    if (Array.isArray(body.adminChatIds)) {
      data.adminChatIds = body.adminChatIds
        .map((s: unknown) => String(s).trim())
        .filter((s: string) => s.length > 0);
    }
    if (typeof body.isEnabled === "boolean") {
      data.isEnabled = body.isEnabled;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const cfg = await prisma.telegramConfig.upsert({
      where: { id: CONFIG_ID },
      update: data,
      create: { id: CONFIG_ID, ...data },
    });

    // Apply config changes without a server restart (no-op when already polling)
    await startTelegramPolling();

    return NextResponse.json({
      success: true,
      hasToken: Boolean(cfg.botTokenEnc),
      adminChatIds: cfg.adminChatIds,
      isEnabled: cfg.isEnabled,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}