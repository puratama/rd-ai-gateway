import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const models = await prisma.appModel.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      modelId: true,
      name: true,
      provider: true,
      sellPricePer1kPrompt: true,
      sellPricePer1kCompletion: true,
      isActive: true,
    },
  });

  return NextResponse.json(models.map((model) => ({
    modelId: model.modelId,
    name: model.name,
    provider: model.provider,
    sellPricePer1kPrompt: model.sellPricePer1kPrompt ? Number(model.sellPricePer1kPrompt) : null,
    sellPricePer1kCompletion: model.sellPricePer1kCompletion ? Number(model.sellPricePer1kCompletion) : null,
    isActive: model.isActive,
  })));
}
