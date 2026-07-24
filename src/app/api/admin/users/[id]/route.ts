import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROLES = ["user", "superadmin"] as const;
const STATUSES = ["active", "suspended", "banned"] as const;

type Role = (typeof ROLES)[number];
type Status = (typeof STATUSES)[number];

type UpdateUserBody = {
  role?: unknown;
  status?: unknown;
  verifyEmail?: unknown;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

async function requireSuperadmin() {
  const session = await getSession();
  return session?.role === "superadmin";
}

async function findUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      apiKeys: true,
      wallet: true,
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      packages: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      usageRecords: { orderBy: { createdAt: "desc" }, take: 50 },
      billingRecords: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const data: {
      role?: Role;
      status?: Status;
      emailVerified?: Date | null;
      verifyToken?: string | null;
      verifyExpiresAt?: Date | null;
    } = {};

    if (body.role !== undefined) {
      if (!isRole(body.role)) {
        return NextResponse.json({ error: "role must be user or superadmin" }, { status: 400 });
      }
      data.role = body.role;
    }

    if (body.status !== undefined) {
      if (!isStatus(body.status)) {
        return NextResponse.json({ error: "status must be active, suspended, or banned" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (body.verifyEmail === true) {
      data.emailVerified = new Date();
      data.verifyToken = null;
      data.verifyExpiresAt = null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireSuperadmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
