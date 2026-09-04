import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const s = await getSiteSettings();
    let models: {
      modelId: string;
      name: string;
      provider: string;
      maxOutputTokens: number | null;
      paygPrompt: number | null;
      paygCompletion: number | null;
      planPrompt: number | null;
    }[] = [];
    try {
      const rows = await prisma.appModel.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          modelId: true,
          name: true,
          provider: true,
          maxOutputTokens: true,
          sellPricePer1kPrompt: true,
          sellPricePer1kCompletion: true,
          tokenPlanPricePer1kPrompt: true,
        },
        take: 60,
      });
      const num = (v: unknown) => (v == null ? null : Number(v));
      models = rows.map((m) => ({
        modelId: m.modelId,
        name: m.name,
        provider: m.provider,
        maxOutputTokens: m.maxOutputTokens,
        paygPrompt: num(m.sellPricePer1kPrompt),
        paygCompletion: num(m.sellPricePer1kCompletion),
        planPrompt: num(m.tokenPlanPricePer1kPrompt),
      }));
    } catch {
      // DB unavailable -> empty list, landing hides the ticker & model section
    }
    return NextResponse.json({
      siteName: s.siteName,
      tagline: s.tagline,
      description: s.description,
      logoUrl: s.logoUrl,
      faviconUrl: s.faviconUrl,
      logoMode: s.logoMode,
      baseUrl: s.baseUrl,
      models,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}