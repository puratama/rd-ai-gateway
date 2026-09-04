import { Prisma } from "@prisma/client";
import { prisma } from "../db";

// ====== Types ======

export type BillingPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  billingPeriod: string;
  price: number;
  features: {
    maxTokensPerMonth: number;
    allowedModels: string[];
    allModels: boolean;
    allowedProviders: string[];
    allProviders: boolean;
    streaming: boolean;
    imageGeneration: boolean;
    highlights: string[];
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

// ====== Plan Mapping ======

function mapPlan(p: {
  id: string;
  name: string;
  description?: string | null;
  billingPeriod: string;
  price: unknown;
  maxTokensPerPeriod: number;
  allowedModels: string[];
  allModels: boolean;
  allowedProviders: string[];
  allProviders: boolean;
  streaming: boolean;
  imageGeneration: boolean;
  highlights: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    billingPeriod: p.billingPeriod,
    price: Number(p.price),
    features: {
      maxTokensPerMonth: p.maxTokensPerPeriod,
      allowedModels: p.allowedModels,
      allModels: p.allModels ?? true,
      allowedProviders: p.allowedProviders,
      allProviders: p.allProviders ?? true,
      streaming: p.streaming,
      imageGeneration: p.imageGeneration,
      highlights: p.highlights ?? [],
    },
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.getTime(),
    updatedAt: p.updatedAt.getTime(),
  };
}

// ====== Plans ======

// Whitelist of writable Plan fields (see prisma/schema.prisma model Plan).
// NOTE: "features" is a mapped/display-only concept, not a DB column.
const PLAN_WRITABLE_FIELDS = new Set([
  "name",
  "description",
  "billingPeriod",
  "price",
  "maxTokensPerPeriod",
  "allowedModels",
  "allModels",
  "allowedProviders",
  "allProviders",
  "streaming",
  "imageGeneration",
  "highlights",
  "isActive",
  "sortOrder",
]);

/**
 * Validate + whitelist a plan payload.
 * Returns { error } with a 400-worthy message, or { data } with only valid fields.
 */
export function validatePlanPayload(
  body: Record<string, unknown>,
  { partial = false }: { partial?: boolean } = {}
): { data?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== "object") return { error: "Invalid payload" };

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PLAN_WRITABLE_FIELDS.has(key)) data[key] = value;
  }

  if (!partial) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return { error: "name is required" };
    }
    if (data.maxTokensPerPeriod === undefined || data.maxTokensPerPeriod === null) {
      return { error: "maxTokensPerPeriod is required" };
    }
    if (data.price === undefined || data.price === null) {
      return { error: "price is required" };
    }
  }

  if (data.price !== undefined) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "price must be a non-negative number" };
    }
    data.price = price;
  }

  if (data.maxTokensPerPeriod !== undefined) {
    const tokens = Number(data.maxTokensPerPeriod);
    if (!Number.isFinite(tokens) || tokens <= 0) {
      return { error: "maxTokensPerPeriod must be a number greater than 0" };
    }
    data.maxTokensPerPeriod = tokens;
  }

  if (Object.keys(data).length === 0) {
    return { error: "No valid fields provided" };
  }

  return { data };
}

export async function loadPlans(): Promise<MembershipPlan[]> {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return plans.map(mapPlan);
}

export async function getPlan(id: string): Promise<MembershipPlan | null> {
  const p = await prisma.plan.findUnique({ where: { id } });
  return p ? mapPlan(p) : null;
}

export async function createPlan(data: {
  name: string;
  description?: string;
  billingPeriod: string;
  price: number;
  maxTokensPerPeriod: number;
  allowedModels?: string[];
  allModels?: boolean;
  allowedProviders?: string[];
  allProviders?: boolean;
  streaming?: boolean;
  imageGeneration?: boolean;
  highlights?: string[];
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.plan.create({ data });
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  try {
    return await prisma.plan.update({ where: { id }, data });
  } catch (e) {
    console.error("[updatePlan] error for id:", id, e);
    return null;
  }
}

export async function deletePlan(id: string) {
  try {
    await prisma.plan.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new Error("Cannot delete: plan has active packages");
    }
    return false;
  }
}

/**
 * Persist urutan plan sesuai array id yang diberikan (indeks = sortOrder baru).
 * Menggunakan transaksi agar urutan atomik dan tidak meninggalkan nilai di tengah.
 */
export async function reorderPlans(ids: string[]): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0) return false;
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.plan.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  return true;
}
