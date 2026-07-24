import { Prisma } from "@prisma/client";
import { prisma } from "../db";

// ====== Types ======

export type BillingPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  backend: string;
  billingPeriod: string;
  price: number;
  features: {
    maxRequestsPerDay: number;
    maxTokensPerMonth: number;
    allowedModels: string[];
    allowedProviders: string[];
    streaming: boolean;
    imageGeneration: boolean;
    apiAccess: boolean;
    priority: "low" | "normal" | "high";
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
  type: string;
  backend: string;
  billingPeriod: string;
  price: unknown;
  maxTokensPerPeriod: number;
  maxRequestsPerDay: number;
  allowedModels: string[];
  allowedProviders: string[];
  streaming: boolean;
  imageGeneration: boolean;
  apiAccess: boolean;
  priority: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    type: p.type,
    backend: p.backend,
    billingPeriod: p.billingPeriod,
    price: Number(p.price),
    features: {
      maxRequestsPerDay: p.maxRequestsPerDay,
      maxTokensPerMonth: p.maxTokensPerPeriod,
      allowedModels: p.allowedModels,
      allowedProviders: p.allowedProviders,
      streaming: p.streaming,
      imageGeneration: p.imageGeneration,
      apiAccess: p.apiAccess,
      priority: p.priority as "low" | "normal" | "high",
    },
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.getTime(),
    updatedAt: p.updatedAt.getTime(),
  };
}

// ====== Plans ======

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
  type: string;
  backend: string;
  billingPeriod: string;
  price: number;
  maxTokensPerPeriod: number;
  maxRequestsPerDay: number;
  allowedModels?: string[];
  allowedProviders?: string[];
  streaming?: boolean;
  imageGeneration?: boolean;
  apiAccess?: boolean;
  priority?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.plan.create({ data });
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  try {
    return await prisma.plan.update({ where: { id }, data });
  } catch {
    return null;
  }
}

export async function deletePlan(id: string) {
  try {
    await prisma.plan.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new Error("Cannot delete: plan has active subscriptions or packages");
    }
    return false;
  }
}
