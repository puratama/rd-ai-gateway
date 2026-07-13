import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROLES = ["user", "superadmin"] as const;
const PUTER_STATUSES = ["pending", "active", "failed"] as const;

type Role = (typeof ROLES)[number];
type PuterStatus = (typeof PUTER_STATUSES)[number];

type UpdateUserBody = {
  role?: unknown;
  puterStatus?: unknown;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

function isPuterStatus(value: unknown): value is PuterStatus {
  return typeof value === "string" && PUTER_STATUSES.includes(value as PuterStatus);
}

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

async function findUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      apiKey: true,
      wallet: true,
      subscriptions: { include: { plan: true } },
      packages: { include: { plan: true } },
      usageRecords: { orderBy: { createdAt: "desc" }, take: 50 },
      billingRecords: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await findUser(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateUserBody;
    const data: { role?: Role; puterStatus?: PuterStatus } = {};

    if (body.role !== undefined) {
      if (!isRole(body.role)) {
        return NextResponse.json({ error: "role must be user or superadmin" }, { status: 400 });
      }
      data.role = body.role;
    }

    if (body.puterStatus !== undefined) {
      if (!isPuterStatus(body.puterStatus)) {
        return NextResponse.json({ error: "puterStatus must be pending, active, or failed" }, { status: 400 });
      }
      data.puterStatus = body.puterStatus;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
