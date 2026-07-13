import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/notifications — list notifications for current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

  const where = { userId: session.sub, ...(unreadOnly ? { read: false } : {}) };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId: session.sub, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// PUT /api/notifications — mark all notifications as read for current user
export async function PUT() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.sub, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
