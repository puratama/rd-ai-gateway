import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const KEYS_FILE = path.join(DATA_DIR, "api-keys.json");
const USAGE_FILE = path.join(DATA_DIR, "usage-records.json");
const PLANS_FILE = path.join(DATA_DIR, "membership-plans.json");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");
const BILLING_FILE = path.join(DATA_DIR, "billing-records.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath: string): unknown[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(filePath: string, data: unknown[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write", filePath, e);
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ====== API Keys ======

export interface ServerApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
}

export function loadServerKeys(): ServerApiKey[] {
  return readJSON(KEYS_FILE);
}

export function saveServerKeys(keys: ServerApiKey[]) {
  writeJSON(KEYS_FILE, keys);
}

export function validateServerKey(key: string): ServerApiKey | null {
  const keys = loadServerKeys();
  const found = keys.find((k) => k.key === key);
  if (!found || !found.isActive) return null;
  return found;
}

export function createServerKey(name: string): ServerApiKey {
  const keys = loadServerKeys();
  const newKey: ServerApiKey = {
    id: generateId(),
    key: `xpgw_${generateId()}${generateId().slice(0, 16)}`,
    name,
    createdAt: Date.now(),
    lastUsed: null,
    isActive: true,
    usageCount: 0,
    totalTokens: 0,
  };
  keys.push(newKey);
  saveServerKeys(keys);
  return newKey;
}

export function revokeServerKey(id: string): boolean {
  const keys = loadServerKeys();
  const index = keys.findIndex((k) => k.id === id);
  if (index === -1) return false;
  keys[index].isActive = false;
  saveServerKeys(keys);
  return true;
}

export function deleteServerKey(id: string): boolean {
  const keys = loadServerKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  saveServerKeys(filtered);
  return true;
}

export function updateServerKeyUsage(keyId: string, tokens: number) {
  const keys = loadServerKeys();
  const index = keys.findIndex((k) => k.id === keyId);
  if (index === -1) return;
  keys[index].usageCount++;
  keys[index].totalTokens += tokens;
  keys[index].lastUsed = Date.now();
  saveServerKeys(keys);
}

// ====== Usage Records ======

export interface ServerUsageRecord {
  id: string;
  apiKeyId: string;
  model: string;
  provider?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  endpoint: string;
}

export function loadServerUsageRecords(): ServerUsageRecord[] {
  return readJSON(USAGE_FILE);
}

export function addServerUsageRecord(record: ServerUsageRecord) {
  const records = loadServerUsageRecords();
  records.push(record);
  if (records.length > 10000) {
    records.splice(0, records.length - 10000);
  }
  writeJSON(USAGE_FILE, records);
}

export function getServerUsageSummary(apiKeyId: string) {
  const records = loadServerUsageRecords().filter((r) => r.apiKeyId === apiKeyId);
  const modelBreakdown: Record<string, number> = {};
  const dailyUsage: Record<string, number> = {};

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const record of records) {
    modelBreakdown[record.model] = (modelBreakdown[record.model] || 0) + record.totalTokens;
    const date = new Date(record.timestamp).toISOString().slice(0, 10);
    dailyUsage[date] = (dailyUsage[date] || 0) + record.totalTokens;
    totalPromptTokens += record.promptTokens || 0;
    totalCompletionTokens += record.completionTokens || 0;
  }

  return {
    totalRequests: records.length,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    totalPromptTokens,
    totalCompletionTokens,
    modelBreakdown,
    dailyUsage,
    apiKeyId,
  };
}

// ====== Membership Plans ======

export type BillingPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in IDR
  billingPeriod: BillingPeriod;
  features: {
    maxRequestsPerDay: number;
    maxTokensPerMonth: number;
    allowedModels: string[]; // empty = all models
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

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Coba AI Gateway gratis. 100 request per hari, model terbatas.",
    price: 0,
    billingPeriod: "monthly",
    features: {
      maxRequestsPerDay: 100,
      maxTokensPerMonth: 100000,
      allowedModels: ["gpt-4o-mini", "deepseek-chat", "gemini-2.5-flash", "claude-haiku-3.5"],
      allowedProviders: ["puter"],
      streaming: true,
      imageGeneration: false,
      apiAccess: true,
      priority: "low",
    },
    isActive: true,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "pro",
    name: "Pro",
    description: "Untuk power user. 10K request per hari, akses semua model.",
    price: 50000,
    billingPeriod: "monthly",
    features: {
      maxRequestsPerDay: 10000,
      maxTokensPerMonth: 5000000,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: true,
      apiAccess: true,
      priority: "normal",
    },
    isActive: true,
    sortOrder: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited requests, all models, priority support.",
    price: 500000,
    billingPeriod: "monthly",
    features: {
      maxRequestsPerDay: 100000,
      maxTokensPerMonth: 50000000,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: true,
      apiAccess: true,
      priority: "high",
    },
    isActive: true,
    sortOrder: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

let plansInitialized = false;

export function loadPlans(): MembershipPlan[] {
  const plans = readJSON(PLANS_FILE) as MembershipPlan[];
  if (plans.length === 0 && !plansInitialized) {
    plansInitialized = true;
    writeJSON(PLANS_FILE, DEFAULT_PLANS);
    return DEFAULT_PLANS;
  }
  return plans;
}

export function savePlans(plans: MembershipPlan[]) {
  writeJSON(PLANS_FILE, plans);
}

export function getPlan(id: string): MembershipPlan | null {
  return loadPlans().find((p) => p.id === id) || null;
}

export function createPlan(plan: Omit<MembershipPlan, "id" | "createdAt" | "updatedAt">): MembershipPlan {
  const plans = loadPlans();
  const newPlan: MembershipPlan = {
    ...plan,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as MembershipPlan;
  plans.push(newPlan);
  savePlans(plans);
  return newPlan;
}

export function updatePlan(id: string, updates: Partial<MembershipPlan>): MembershipPlan | null {
  const plans = loadPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return null;
  plans[index] = { ...plans[index], ...updates, updatedAt: Date.now() };
  savePlans(plans);
  return plans[index];
}

export function deletePlan(id: string): boolean {
  const plans = loadPlans();
  const filtered = plans.filter((p) => p.id !== id);
  if (filtered.length === plans.length) return false;
  savePlans(filtered);
  return true;
}

// ====== Subscriptions ======

export interface Subscription {
  id: string;
  apiKeyId: string;
  planId: string;
  status: "active" | "expired" | "cancelled" | "trial";
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  // Usage tracking for current period
  requestsToday: number;
  tokensThisPeriod: number;
  lastResetDate: number;
  createdAt: number;
}

export function loadSubscriptions(): Subscription[] {
  return readJSON(SUBS_FILE);
}

export function saveSubscriptions(subs: Subscription[]) {
  writeJSON(SUBS_FILE, subs);
}

export function getSubscriptionByKey(apiKeyId: string): Subscription | null {
  const subs = loadSubscriptions();
  const sub = subs.find((s) => s.apiKeyId === apiKeyId);
  if (!sub) return null;

  // Check if expired
  if (sub.status === "active" && sub.endDate < Date.now()) {
    sub.status = "expired";
    saveSubscriptions(subs);
  }

  // Reset daily counter if new day
  const today = new Date().setHours(0, 0, 0, 0);
  if (sub.lastResetDate < today) {
    sub.requestsToday = 0;
    sub.lastResetDate = today;
    saveSubscriptions(subs);
  }

  return sub;
}

export function createSubscription(apiKeyId: string, planId: string, trialDays = 0): Subscription {
  const subs = loadSubscriptions();
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plan not found");

  const now = Date.now();
  let endDate: number;

  if (trialDays > 0) {
    endDate = now + trialDays * 86400000;
  } else {
    endDate = calcEndDate(plan.billingPeriod, now);
  }

  const sub: Subscription = {
    id: generateId(),
    apiKeyId,
    planId,
    status: trialDays > 0 ? "trial" : "active",
    startDate: now,
    endDate,
    autoRenew: true,
    requestsToday: 0,
    tokensThisPeriod: 0,
    lastResetDate: new Date().setHours(0, 0, 0, 0),
    createdAt: now,
  };

  subs.push(sub);
  saveSubscriptions(subs);
  return sub;
}

export function cancelSubscription(id: string): boolean {
  const subs = loadSubscriptions();
  const index = subs.findIndex((s) => s.id === id);
  if (index === -1) return false;
  subs[index].status = "cancelled";
  saveSubscriptions(subs);
  return true;
}

export function extendSubscription(apiKeyId: string, planId: string, period: BillingPeriod): boolean {
  const subs = loadSubscriptions();
  const index = subs.findIndex((s) => s.apiKeyId === apiKeyId && s.planId === planId);
  if (index === -1) return false;
  subs[index].endDate = calcEndDate(period, subs[index].endDate);
  subs[index].status = "active";
  saveSubscriptions(subs);
  return true;
}

function calcEndDate(period: BillingPeriod, from: number): number {
  switch (period) {
    case "daily": return from + 86400000;
    case "weekly": return from + 7 * 86400000;
    case "monthly": return from + 30 * 86400000;
    case "yearly": return from + 365 * 86400000;
  }
}

// Check if an API key can make a request (rate limiting)
export function checkRateLimit(apiKeyId: string): { allowed: boolean; reason?: string; plan?: MembershipPlan } {
  const sub = getSubscriptionByKey(apiKeyId);
  if (!sub) {
    // Default to Free plan
    const freePlan = getPlan("free");
    if (!freePlan) return { allowed: true };
    return { allowed: true, plan: freePlan };
  }

  const plan = getPlan(sub.planId);
  if (!plan) return { allowed: false, reason: "Plan not found" };

  if (sub.status !== "active" && sub.status !== "trial") {
    return { allowed: false, reason: `Subscription ${sub.status}`, plan };
  }

  if (sub.requestsToday >= plan.features.maxRequestsPerDay) {
    return { allowed: false, reason: `Daily limit reached (${plan.features.maxRequestsPerDay})`, plan };
  }

  return { allowed: true, plan };
}

// Check if model is allowed for this key
export function checkModelAccess(apiKeyId: string, modelId: string): boolean {
  const sub = getSubscriptionByKey(apiKeyId);
  if (!sub) {
    const freePlan = getPlan("free");
    if (!freePlan) return true;
    return freePlan.features.allowedModels.length === 0 || freePlan.features.allowedModels.includes(modelId);
  }

  const plan = getPlan(sub.planId);
  if (!plan) return false;
  if (plan.features.allowedModels.length === 0) return true; // All models allowed
  return plan.features.allowedModels.includes(modelId);
}

// ====== Billing Records ======

export interface BillingRecord {
  id: string;
  apiKeyId: string;
  planId: string;
  amount: number; // in IDR
  currency: "IDR";
  status: "pending" | "completed" | "failed" | "refunded";
  midtransOrderId: string;
  billingPeriod: BillingPeriod;
  description: string;
  createdAt: number;
  paidAt?: number;
}

export function loadBillingRecords(): BillingRecord[] {
  return readJSON(BILLING_FILE);
}

export function saveBillingRecords(records: BillingRecord[]) {
  writeJSON(BILLING_FILE, records);
}

export function createBillingRecord(record: Omit<BillingRecord, "id" | "createdAt">): BillingRecord {
  const records = loadBillingRecords();
  const newRecord: BillingRecord = {
    ...record,
    id: generateId(),
    createdAt: Date.now(),
  };
  records.push(newRecord);
  saveBillingRecords(records);
  return newRecord;
}

export function updateBillingStatus(midtransOrderId: string, status: BillingRecord["status"], paidAt?: number): boolean {
  const records = loadBillingRecords();
  const index = records.findIndex((r) => r.midtransOrderId === midtransOrderId);
  if (index === -1) return false;
  records[index].status = status;
  if (paidAt) records[index].paidAt = paidAt;
  saveBillingRecords(records);
  return true;
}

export function getBillingRecord(midtransOrderId: string): BillingRecord | null {
  return loadBillingRecords().find((r) => r.midtransOrderId === midtransOrderId) || null;
}

// ====== Admin Stats ======

export function getAdminStats() {
  const keys = loadServerKeys();
  const records = loadServerUsageRecords();
  const subs = loadSubscriptions();
  const plans = loadPlans();
  const billing = loadBillingRecords();

  // Active users (keys with usage)
  const activeKeys = keys.filter((k) => k.isActive);
  const usedKeys = activeKeys.filter((k) => k.usageCount > 0);

  // Revenue
  const completedPayments = billing.filter((b) => b.status === "completed");
  const totalRevenue = completedPayments.reduce((sum, b) => sum + b.amount, 0);
  const pendingRevenue = billing
    .filter((b) => b.status === "pending")
    .reduce((sum, b) => sum + b.amount, 0);

  // Usage stats
  const totalTokens = records.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayTokens = records
    .filter((r) => new Date(r.timestamp).toISOString().slice(0, 10) === today)
    .reduce((sum, r) => sum + (r.totalTokens || 0), 0);

  // Provider breakdown
  const providerUsage: Record<string, number> = {};
  records.forEach((r) => {
    if (r.provider) {
      providerUsage[r.provider] = (providerUsage[r.provider] || 0) + r.totalTokens;
    }
  });

  // Daily usage for chart (last 30 days)
  const dailyUsage: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyUsage[d] = 0;
  }
  records.forEach((r) => {
    const d = new Date(r.timestamp).toISOString().slice(0, 10);
    if (dailyUsage[d] !== undefined) {
      dailyUsage[d] += r.totalTokens;
    }
  });

  // Subscription stats
  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trial");
  const subsByPlan: Record<string, number> = {};
  activeSubs.forEach((s) => {
    subsByPlan[s.planId] = (subsByPlan[s.planId] || 0) + 1;
  });

  return {
    overview: {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      usedKeys: usedKeys.length,
      totalRequests: records.length,
      totalTokens,
      todayTokens,
      todayRequests: records.filter(
        (r) => new Date(r.timestamp).toISOString().slice(0, 10) === today
      ).length,
    },
    revenue: {
      totalRevenue,
      pendingRevenue,
      completedPayments: completedPayments.length,
      pendingPayments: billing.filter((b) => b.status === "pending").length,
      totalBillingRecords: billing.length,
    },
    subscriptions: {
      total: subs.length,
      active: activeSubs.length,
      byPlan: subsByPlan,
    },
    providers: providerUsage,
    dailyUsage,
    plans,
  };
}
