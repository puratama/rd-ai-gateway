import type { AnalyticsData } from "@/types";

interface ServerUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  modelBreakdown: Record<string, number>;
  dailyUsage: Record<string, number>;
  apiKeyId: string;
}

export async function fetchAnalyticsFromAPI(): Promise<AnalyticsData | null> {
  const apiKey = localStorage.getItem("xperimne-api-key");
  if (!apiKey) return null;

  try {
    const res = await fetch("/api/v1/usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;

    const data: ServerUsageSummary = await res.json();

    // Map server data to AnalyticsData shape
    const modelUsage: Record<string, { count: number; provider: string }> = {};
    for (const [model, count] of Object.entries(data.modelBreakdown)) {
      modelUsage[model] = { count, provider: inferProvider(model) };
    }

    // Convert dailyUsage keys (YYYY-MM-DD) to timestamp-based dailyActivity
    const dailyActivity: Record<string, number> = {};
    for (const [dateStr, count] of Object.entries(data.dailyUsage)) {
      const ts = new Date(dateStr).getTime();
      dailyActivity[String(ts)] = count;
    }

    // Derive hourlyActivity from dailyActivity (approximate — no server-side hourly data)
    const hourlyActivity: Record<string, number> = {};

    // Model daily activity — aggregate into single bucket since server doesn't track per-model-per-day
    const modelDailyActivity: Record<string, Record<string, number>> = {};

    const totalUserMessages = Math.ceil(data.totalRequests * 0.5);
    const totalAssistantMessages = data.totalRequests - totalUserMessages;

    return {
      totalConversations: data.totalRequests,
      totalConversationsDeleted: 0,
      totalUserMessages,
      totalAssistantMessages,
      modelUsage,
      dailyActivity,
      modelDailyActivity,
      averageResponseLength: data.totalCompletionTokens / Math.max(data.totalRequests, 1),
      totalResponseLength: data.totalCompletionTokens,
      responseCount: data.totalRequests,
      firstActive: 0,
      lastActive: Date.now(),
      streakDays: Object.keys(data.dailyUsage).length,
      peakHour: 0,
      hourlyActivity,
      events: [],
    };
  } catch {
    return null;
  }
}

function inferProvider(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3")) return "OpenAI";
  if (id.startsWith("claude")) return "Anthropic";
  if (id.startsWith("gemini")) return "Google";
  if (id.startsWith("deepseek")) return "DeepSeek";
  if (id.startsWith("llama") || id.startsWith("meta")) return "Meta";
  if (id.startsWith("mistral")) return "Mistral";
  return "Unknown";
}
