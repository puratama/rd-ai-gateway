export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

// Pricing types
export interface ModelPricing {
  id: string;
  name: string;
  provider: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  speed: "fast" | "balanced" | "slow";
  quality: string;
  available: boolean;
}

// Backend API types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
}

export interface UsageRecord {
  id: string;
  apiKeyId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  endpoint: string;
}

export interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  modelBreakdown: Record<string, number>;
  dailyUsage: Record<string, number>;
  apiKeyId: string;
}
