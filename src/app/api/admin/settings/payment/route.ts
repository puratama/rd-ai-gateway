import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const gateways = await prisma.paymentGatewayConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      gateways.map((g) => ({
        id: g.id,
        provider: g.provider,
        name: g.name,
        hasServerKey: Boolean(g.serverKeyEnc),
        hasClientKey: Boolean(g.clientKeyEnc),
        environment: g.environment,
        isActive: g.isActive,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }))
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, name, serverKey, clientKey, environment, isActive } = body;

    if (!provider || !name || !serverKey || !clientKey) {
      return NextResponse.json(
        { error: "provider, name, serverKey, clientKey required" },
        { status: 400 }
      );
    }

    const existing = await prisma.paymentGatewayConfig.findFirst({
      where: { provider },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Gateway for "${provider}" already exists. Edit it instead.` },
        { status: 409 }
      );
    }

    const gateway = await prisma.paymentGatewayConfig.create({
      data: {
        provider,
        name,
        serverKeyEnc: serverKey,
        clientKeyEnc: clientKey,
        environment: environment || "sandbox",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { id: gateway.id, provider: gateway.provider, created: true },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, provider, name, serverKey, clientKey, environment, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (provider !== undefined) data.provider = provider;
    if (name !== undefined) data.name = name;
    if (serverKey !== undefined) data.serverKeyEnc = serverKey;
    if (clientKey !== undefined) data.clientKeyEnc = clientKey;
    if (environment !== undefined) data.environment = environment;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await prisma.paymentGatewayConfig.update({ where: { id }, data });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.paymentGatewayConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
