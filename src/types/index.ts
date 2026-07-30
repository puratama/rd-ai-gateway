export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context?: number;
  description?: string;
}

// Analytics types
export interface AnalyticsEvent {
  type: "message_sent" | "message_received" | "conversation_created" | "conversation_deleted" | "model_switched" | "image_generated";
  timestamp: number;
  model?: string;
  messageLength?: number;
  conversationId?: string;
  provider?: string;
}

export interface AnalyticsData {
  totalConversations: number;
  totalConversationsDeleted: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  modelUsage: Record<string, { count: number; provider: string }>;
  dailyActivity: Record<string, number>;
  modelDailyActivity: Record<string, Record<string, number>>;
  averageResponseLength: number;
  totalResponseLength: number;
  responseCount: number;
  firstActive: number;
  lastActive: number;
  streakDays: number;
  peakHour: number;
  hourlyActivity: Record<string, number>;
  events: AnalyticsEvent[];
}

export interface DailyStats {
  date: string;
  label: string;
  count: number;
  isToday: boolean;
}

// Pricing types
export interface ModelPricing {
  id: string;
  name: string;
  provider: string;
  context: number;
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
