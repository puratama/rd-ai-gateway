import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// List all models
export async function GET() {
  try {
    const models = await prisma.appModel.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(models.map((m) => ({
      id: m.id,
      modelId: m.modelId,
      name: m.name,
      providerModelId: m.providerModelId,
      provider: m.provider,
      sellPricePer1kPrompt: m.sellPricePer1kPrompt ? Number(m.sellPricePer1kPrompt) : null,
      sellPricePer1kCompletion: m.sellPricePer1kCompletion ? Number(m.sellPricePer1kCompletion) : null,
      isActive: m.isActive,
    })));
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Add new model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, name, providerModelId, provider, sellPricePer1kPrompt, sellPricePer1kCompletion } = body;

    if (!modelId || !name || !provider) {
      return NextResponse.json({ error: "modelId, name, provider required" }, { status: 400 });
    }

    const existing = await prisma.appModel.findUnique({ where: { modelId } });
    if (existing) {
      return NextResponse.json({ error: "Model ID already exists" }, { status: 409 });
    }

    const model = await prisma.appModel.create({
      data: {
        modelId,
        name,
        providerModelId: providerModelId || null,
        provider,
        sellPricePer1kPrompt: sellPricePer1kPrompt ?? null,
        sellPricePer1kCompletion: sellPricePer1kCompletion ?? null,
      },
    });

    return NextResponse.json({ id: model.id, modelId: model.modelId, name: model.name }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Update model (toggle active, pricing, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Decimal fields that should be passed as-is to Prisma
    const decimalFields = new Set(["sellPricePer1kPrompt", "sellPricePer1kCompletion"]);
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (decimalFields.has(key) && value !== null) {
        data[key] = value; // Prisma accepts number for Decimal
      } else {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const model = await prisma.appModel.update({ where: { id }, data });
    return NextResponse.json({ id: model.id, modelId: model.modelId, updated: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete model
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    await prisma.appModel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
