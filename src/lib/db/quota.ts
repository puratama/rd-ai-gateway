import { prisma } from "../db";
import { getPlan } from "./plans";
import type { MembershipPlan } from "./plans";

// ====== Rate Limit ======

export async function checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; reason?: string; plan?: MembershipPlan }> {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return { allowed: false, reason: "API key not found" };

  // Block if email not verified
  const user = await prisma.user.findUnique({
    where: { id: apiKey.userId },
    select: { emailVerified: true },
  });
  if (user && !user.emailVerified) {
    return { allowed: false, reason: "Email belum diverifikasi. Cek email Anda." };
  }

  // PAYG user — no subscription gating. Wallet handles billing, soft rate limits only.
  const freePlan = await getPlan("free");
  const maxDailyTokens = freePlan?.features?.maxTokensPerMonth || 1000000;

  // Check daily token limit
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTokens = await prisma.usageRecord.aggregate({
    where: { userId: apiKey.userId, createdAt: { gte: today } },
    _sum: { totalTokens: true },
  });
  if ((todayTokens._sum.totalTokens || 0) >= maxDailyTokens) {
    return { allowed: false, reason: `Daily token limit reached (${maxDailyTokens} tokens)`, plan: freePlan ?? undefined };
  }

  return { allowed: true, plan: freePlan ?? undefined };
}

// ====== Model Access ======

export async function checkModelAccess(apiKeyId: string, modelId: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return false;

  const plan = await resolveUserPlan(apiKey.userId);
  if (!plan) return true;

  const id = modelId.toLowerCase();

  // allowedModels: allModels=true → semua; false → wajib list non-empty, partial match
  if (plan.allModels === false) {
    if (plan.allowedModels.length === 0) return false;
    const allowedModel = plan.allowedModels.some((m: string) =>
      id.includes(m.toLowerCase())
    );
    if (!allowedModel) return false;
  }

  // allowedProviders: allProviders=true → semua diizinkan;
  // false → wajib list non-empty, partial match
  if (plan.allProviders === false) {
    if (plan.allowedProviders.length === 0) return false;
    // Derive provider from model ID (e.g. "claude" → "anthropic", "gpt" → "openai")
    const provider = deriveProvider(id);
    const allowedProvider = plan.allowedProviders.some((p: string) =>
      provider.includes(p.toLowerCase())
    );
    if (!allowedProvider) return false;
  }

  return true;
}

async function resolveUserPlan(userId: string): Promise<{ allowedModels: string[]; allModels: boolean; allowedProviders: string[]; allProviders: boolean } | null> {
  const pkg = await prisma.userPackage.findFirst({
    where: { userId, status: "active", expiresAt: { gt: new Date() } },
    select: { plan: { select: { allowedModels: true, allModels: true, allowedProviders: true, allProviders: true } } },
  });
  if (pkg?.plan) return pkg.plan as { allowedModels: string[]; allModels: boolean; allowedProviders: string[]; allProviders: boolean };

  const freePlan = await getPlan("free");
  if (freePlan)
    return {
      allowedModels: freePlan.features.allowedModels,
      allModels: freePlan.features.allModels,
      allowedProviders: freePlan.features.allowedProviders,
      allProviders: freePlan.features.allProviders,
    };

  return null;
}

function deriveProvider(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes("gpt") || id.includes("o1") || id.includes("o3")) return "openai";
  if (id.includes("claude")) return "anthropic";
  if (id.includes("gemini")) return "google";
  if (id.includes("deepseek")) return "deepseek";
  if (id.includes("llama") || id.includes("meta")) return "meta";
  if (id.includes("mistral") || id.includes("mixtral")) return "mistral";
  if (id.includes("pxuxr") || id.includes("kantor")) return "9router";
  return "unknown";
}

// ====== Pricing & Deduction (PAYG / Token Plan) ======

export interface ModelPricing {
  paygPrompt: number;        // IDR per 1K prompt tokens
  paygCompletion: number;    // IDR per 1K completion tokens
  tokenPlanPrompt: number;   // discounted price
  tokenPlanCompletion: number;
}

/** Get pricing for a model. Returns null if model not found or all prices are 0/null (free). */
export async function getModelPricing(modelId: string): Promise<ModelPricing | null> {
  try {
    const m = await prisma.appModel.findUnique({ where: { modelId } });
    if (!m) return null;

    const pp = Number(m.sellPricePer1kPrompt || 0);
    const pc = Number(m.sellPricePer1kCompletion || 0);
    const tp = Number(m.tokenPlanPricePer1kPrompt || 0);
    const tc = Number(m.tokenPlanPricePer1kCompletion || 0);

    // All prices zero/null → free model
    if (pp === 0 && pc === 0 && tp === 0 && tc === 0) return null;

    return {
      paygPrompt: pp,
      paygCompletion: pc,
      tokenPlanPrompt: tp || pp, // fallback to PAYG if token plan not set
      tokenPlanCompletion: tc || pc,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user can afford a request and HOLD/RESERVE the estimated cost.
 * This prevents double-spend during streaming.
 * Returns holding info on success, or error reason.
 */
export async function holdBalanceOrTokens(
  userId: string,
  modelId: string,
  estimatedPromptTokens: number
): Promise<
  | { ok: true; tier: "free" }
  | { ok: true; tier: "package"; packageId: string; pricing: ModelPricing; heldTokens: number }
  | { ok: true; tier: "payg"; pricing: ModelPricing; heldAmount: number }
  | { ok: true; tier: "package_payg"; packageId: string; pricing: ModelPricing; heldTokens: number; heldAmount: number }
  | { ok: false; reason: string }
> {
  const pricing = await getModelPricing(modelId);
  if (!pricing) return { ok: true, tier: "free" };

  // 1. Try Token Plan (Package)
  const activePackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      status: "active",
      expiresAt: { gt: new Date() },
      tokensRemaining: { gt: 0 },
    },
    orderBy: [{ expiresAt: "asc" }, { tokensRemaining: "desc" }],
  });

  const estimatedTotalTokens = Math.max(100, estimatedPromptTokens * 3);

  if (activePackage) {
    const packageTokens = Number(activePackage.tokensRemaining);

    if (packageTokens >= estimatedTotalTokens) {
      // Full request covered by package
      const updated = await prisma.userPackage.updateMany({
        where: {
          id: activePackage.id,
          userId,
          status: "active",
          tokensRemaining: { gte: estimatedTotalTokens },
        },
        data: { tokensRemaining: { decrement: estimatedTotalTokens } },
      });

      if (updated.count === 1) {
        return {
          ok: true,
          tier: "package",
          packageId: activePackage.id,
          pricing,
          heldTokens: estimatedTotalTokens,
        };
      }
    } else {
      // Package covers what it has; wallet covers the rest (one request, two sources)
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      const walletTokens = estimatedTotalTokens - packageTokens;
      const estCost = Math.ceil((walletTokens / 1000) * Math.max(pricing.paygPrompt, pricing.paygCompletion));
      const balance = wallet ? Number(wallet.balance) : 0;

      if (balance < estCost) {
        const minTopup = Math.ceil(estCost / 10000) * 10000;
        return {
          ok: false,
          reason: `Saldo tidak cukup. Butuh ~Rp${estCost.toLocaleString()}, saldo Rp${balance.toLocaleString()}. Minimal topup Rp${minTopup.toLocaleString()}.`,
        };
      }

      const [pkgUpdated, walletUpdated] = await prisma.$transaction([
        prisma.userPackage.updateMany({
          where: { id: activePackage.id, userId, status: "active", tokensRemaining: { gte: packageTokens } },
          data: { tokensRemaining: { decrement: packageTokens } },
        }),
        prisma.wallet.updateMany({
          where: { userId, balance: { gte: estCost } },
          data: { balance: { decrement: estCost } },
        }),
      ]);

      if (pkgUpdated.count === 1 && walletUpdated.count === 1) {
        return {
          ok: true,
          tier: "package_payg",
          packageId: activePackage.id,
          pricing,
          heldTokens: packageTokens,
          heldAmount: estCost,
        };
      }
    }
  }

  // 2. Try PAYG Wallet
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const estCost = Math.ceil((estimatedTotalTokens / 1000) * Math.max(pricing.paygPrompt, pricing.paygCompletion));
  const balance = wallet ? Number(wallet.balance) : 0;

  if (balance < estCost) {
    const minTopup = Math.ceil(estCost / 10000) * 10000;
    return {
      ok: false,
      reason: `Saldo tidak cukup. Butuh ~Rp${estCost.toLocaleString()}, saldo Rp${balance.toLocaleString()}. Minimal topup Rp${minTopup.toLocaleString()}.`,
    };
  }

  const updated = await prisma.wallet.updateMany({
    where: { userId, balance: { gte: estCost } },
    data: { balance: { decrement: estCost } },
  });

  if (updated.count === 1) {
    return {
      ok: true,
      tier: "payg",
      pricing,
      heldAmount: estCost,
    };
  }

  return { ok: false, reason: "Gagal menahan saldo transaksi. Silakan coba lagi." };
}

export async function releaseUsageHold(
  userId: string,
  holdInfo: {
    tier: "payg" | "package" | "package_payg";
    packageId?: string;
    pricing: ModelPricing;
    heldTokens?: number;
    heldAmount?: number;
  }
): Promise<void> {
  await settleUsage(userId, "", 0, 0, holdInfo);
}

/**
 * Release the hold and deduct the actual usage cost.
 * Calculates refund/charge difference and settles balance atomically.
 * Returns the actual cost in IDR for usage recording.
 */
export async function settleUsage(
  userId: string,
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  holdInfo: {
    tier: "payg" | "package" | "package_payg";
    packageId?: string;
    pricing: ModelPricing;
    heldTokens?: number;
    heldAmount?: number;
  }
): Promise<number> {
  const { tier, packageId, pricing, heldTokens = 0, heldAmount = 0 } = holdInfo;

  if (tier === "package" && packageId) {
    const actualTokens = Math.max(0, promptTokens + completionTokens);
    const refund = heldTokens - actualTokens;

    if (refund > 0) {
      // Refund extra held tokens
      await prisma.userPackage.update({
        where: { id: packageId },
        data: { tokensRemaining: { increment: refund } },
      });
    } else if (refund < 0) {
      // Surcharge remaining (if estimation was too low)
      const surcharge = Math.abs(refund);
      await prisma.userPackage.updateMany({
        where: { id: packageId, tokensRemaining: { gte: surcharge } },
        data: { tokensRemaining: { decrement: surcharge } },
      }).then(async (r) => {
        if (r.count === 0) {
          // If package depleted, surcharge wallet as fallback
          const extraCost = Math.ceil((surcharge / 1000) * pricing.tokenPlanCompletion);
          await prisma.wallet.updateMany({
            where: { userId, balance: { gte: extraCost } },
            data: { balance: { decrement: extraCost } },
          });
        }
      });
    }

    // Ensure state clean
    await prisma.userPackage.updateMany({
      where: { id: packageId, tokensRemaining: { lte: 0 } },
      data: { status: "depleted" },
    });

    // Actual cost in IDR based on token-plan pricing
    const pCost = (promptTokens / 1000) * pricing.tokenPlanPrompt;
    const cCost = (completionTokens / 1000) * pricing.tokenPlanCompletion;
    return Math.ceil(pCost + cCost);
  }

  // Mixed: package covers tokens first, wallet covers the rest
  if (tier === "package_payg" && packageId) {
    const actualTokens = Math.max(0, promptTokens + completionTokens);
    const packageCovered = Math.min(heldTokens, actualTokens);
    const walletTokens = actualTokens - packageCovered;

    // Settle package portion
    const refund = heldTokens - packageCovered;
    if (refund > 0) {
      await prisma.userPackage.update({
        where: { id: packageId },
        data: { tokensRemaining: { increment: refund } },
      });
    }
    // No surcharge possible on package here: heldTokens <= remaining, so wallet covers overflow.

    // Ensure state clean
    await prisma.userPackage.updateMany({
      where: { id: packageId, tokensRemaining: { lte: 0 } },
      data: { status: "depleted" },
    });

    // Settle wallet portion (tokens not covered by package)
    const wCost = (walletTokens / 1000) * Math.max(pricing.paygPrompt, pricing.paygCompletion);
    const walletCost = Math.ceil(wCost);
    const diff = heldAmount - walletCost;

    if (diff > 0) {
      await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: diff } },
      });
    } else if (diff < 0) {
      // Guarded surcharge: never drive balance negative; log shortfall for reconciliation
      const surcharge = Math.abs(diff);
      const res = await prisma.wallet.updateMany({
        where: { userId, balance: { gte: surcharge } },
        data: { balance: { decrement: surcharge } },
      });
      if (res.count === 0) {
        console.warn(
          `[settleUsage] package_payg shortfall: user ${userId} owes Rp${surcharge} but balance insufficient — recording actual cost anyway`
        );
      }
    }

    // Report combined actual cost for usage record
    const pCost = (promptTokens / 1000) * pricing.tokenPlanPrompt;
    const cCost = (completionTokens / 1000) * pricing.tokenPlanCompletion;
    return Math.ceil(pCost + cCost);
  }

  // PAYG settle
  const pCost = (promptTokens / 1000) * pricing.paygPrompt;
  const cCost = (completionTokens / 1000) * pricing.paygCompletion;
  const actualCost = Math.ceil(pCost + cCost);

  const diff = heldAmount - actualCost;

  if (diff > 0) {
    // Settle with refund
    await prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: diff } },
    });
  } else if (diff < 0) {
    // Guarded surcharge: never drive balance negative; log shortfall for reconciliation
    const surcharge = Math.abs(diff);
    const res = await prisma.wallet.updateMany({
      where: { userId, balance: { gte: surcharge } },
      data: { balance: { decrement: surcharge } },
    });
    if (res.count === 0) {
      console.warn(
        `[settleUsage] PAYG shortfall: user ${userId} owes Rp${surcharge} but balance insufficient — recording actual cost anyway`
      );
    }
  }

  return actualCost;
}

// ====== App Models ======

export async function loadAppModels() {
  return prisma.appModel.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

/**
 * Persist urutan model sesuai array id yang diberikan (indeks = sortOrder baru).
 * Menggunakan transaksi agar urutan atomik.
 */
export async function reorderAppModels(ids: string[]): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0) return false;
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.appModel.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  return true;
}

export async function updateAppModel(id: string, data: Record<string, unknown>) {
  return prisma.appModel.update({ where: { id }, data });
}

export async function upsertAppModel(modelId: string, data: Record<string, unknown>) {
  return prisma.appModel.upsert({
    where: { modelId },
    create: data as Parameters<typeof prisma.appModel.upsert>[0]["create"],
    update: data,
  });
}
