import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

// List all models
export async function GET() {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const models = await prisma.appModel.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return NextResponse.json(models.map((m) => ({
      id: m.id,
      modelId: m.modelId,
      name: m.name,
      providerModelId: m.providerModelId,
      provider: m.provider,
      maxOutputTokens: m.maxOutputTokens,
      isActive: m.isActive,
    })));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add new model
export async function POST(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = await request.json();
    const {
      modelId,
      name,
      providerModelId,
      provider,
      maxOutputTokens,
      sellPricePer1kPrompt,
      sellPricePer1kCompletion,
    } = body;

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
        maxOutputTokens: maxOutputTokens ?? null,
        costPer1kPrompt: 0,
        costPer1kCompletion: 0,
        markupPercent: 0,
        sellPricePer1kPrompt: sellPricePer1kPrompt ?? 0,
        sellPricePer1kCompletion: sellPricePer1kCompletion ?? 0,
        tokenPlanPricePer1kPrompt: 0,
        tokenPlanPricePer1kCompletion: 0,
      },
    });

    return NextResponse.json({ id: model.id, modelId: model.modelId, name: model.name }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Model ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update model (toggle active, pricing, etc.)
export async function PUT(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    const allowedFields = [
      "modelId",
      "name",
      "provider",
      "providerModelId",
      "maxOutputTokens",
      "isActive",
    ] as const;
    for (const key of allowedFields) {
      if (updates[key] !== undefined) data[key] = updates[key];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const model = await prisma.appModel.update({ where: { id }, data });
    return NextResponse.json({ id: model.id, modelId: model.modelId, updated: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2002") return NextResponse.json({ error: "Model ID already exists" }, { status: 409 });
      if (code === "P2025") return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete model
export async function DELETE(request: NextRequest) {
  const authError = await requireSuperadmin();
  if (authError) return authError;
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    await prisma.appModel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
