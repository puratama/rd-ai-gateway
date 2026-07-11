import { v4 as uuidv4 } from "uuid";
import type { ApiKey } from "@/types";

const KEYS_STORAGE = "ai-gateway-api-keys";
const USAGE_STORAGE = "ai-gateway-usage-records";

// ====== API Key Management ======

export function loadApiKeys(): ApiKey[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(KEYS_STORAGE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveApiKeys(keys: ApiKey[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
  } catch {
    // Storage full
  }
}

export function generateApiKey(name: string): ApiKey {
  const apiKey: ApiKey = {
    id: uuidv4(),
    key: `xpgw_${uuidv4().replace(/-/g, "")}${uuidv4().replace(/-/g, "").slice(0, 16)}`,
    name,
    createdAt: Date.now(),
    lastUsed: null,
    isActive: true,
    usageCount: 0,
    totalTokens: 0,
  };
  return apiKey;
}

export function createApiKey(name: string): ApiKey {
  const keys = loadApiKeys();
  const newKey = generateApiKey(name);
  keys.push(newKey);
  saveApiKeys(keys);
  return newKey;
}

export function revokeApiKey(id: string): boolean {
  const keys = loadApiKeys();
  const index = keys.findIndex((k) => k.id === id);
  if (index === -1) return false;
  keys[index].isActive = false;
  saveApiKeys(keys);
  return true;
}

export function deleteApiKey(id: string): boolean {
  const keys = loadApiKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  saveApiKeys(filtered);
  return true;
}

export function validateApiKey(key: string): ApiKey | null {
  const keys = loadApiKeys();
  const found = keys.find((k) => k.key === key);
  if (!found || !found.isActive) return null;
  return found;
}

export function updateKeyUsage(keyId: string, tokens: number) {
  const keys = loadApiKeys();
  const index = keys.findIndex((k) => k.id === keyId);
  if (index === -1) return;
  keys[index].usageCount++;
  keys[index].totalTokens += tokens;
  keys[index].lastUsed = Date.now();
  saveApiKeys(keys);
}

// ====== Usage Records ======

export function loadUsageRecords(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(USAGE_STORAGE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addUsageRecord(record: Record<string, unknown>) {
  const records = loadUsageRecords();
  records.push(record);
  // Keep max 10000 records
  if (records.length > 10000) {
    records.splice(0, records.length - 10000);
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(USAGE_STORAGE, JSON.stringify(records));
    } catch {
      // Storage full, prune
      records.splice(0, 5000);
      try {
        localStorage.setItem(USAGE_STORAGE, JSON.stringify(records));
      } catch {}
    }
  }
}

export function getUsageSummary(apiKeyId: string) {
  const records = loadUsageRecords().filter((r) => (r.apiKeyId as string) === apiKeyId);
  const modelBreakdown: Record<string, number> = {};
  const dailyUsage: Record<string, number> = {};

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const record of records) {
    modelBreakdown[record.model as string] = (modelBreakdown[record.model as string] || 0) + (record.totalTokens as number || 0);
    const date = new Date(record.timestamp as number).toISOString().slice(0, 10);
    dailyUsage[date] = (dailyUsage[date] || 0) + (record.totalTokens as number || 0);
    totalPromptTokens += (record.promptTokens as number) || 0;
    totalCompletionTokens += (record.completionTokens as number) || 0;
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
