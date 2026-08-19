import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const model = await prisma.appModel.findUnique({ where: { id } });
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const providerName = model.provider.toLowerCase().replace(/\s+/g, "-");
    const aggregators = await prisma.aggregatorConfig.findMany({
      where: { isActive: true },
    });
    const aggregator = aggregators.find(
      (item) => item.name.toLowerCase().replace(/\s+/g, "-") === providerName
    );

    if (!aggregator?.apiKeyEnc) {
      return NextResponse.json({
        ok: false,
        status: 0,
        latency: 0,
        error: `Provider "${model.provider}" tidak ditemukan atau API key belum dikonfigurasi`,
      });
    }

    const startTime = Date.now();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (providerName === "anthropic") {
      headers["x-api-key"] = aggregator.apiKeyEnc;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${aggregator.apiKeyEnc}`;
    }

    try {
      const response = await fetch(
        `${aggregator.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model.providerModelId || model.modelId,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1,
            stream: false,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const latency = Date.now() - startTime;

      if (response.ok) {
        return NextResponse.json({ ok: true, status: response.status, latency });
      }

      const errorBody = await response.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        status: response.status,
        latency,
        error: errorBody.slice(0, 240) || response.statusText,
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        status: 0,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Connection failed",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
