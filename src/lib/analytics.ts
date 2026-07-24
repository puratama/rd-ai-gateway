"use client";

import type { AnalyticsData, AnalyticsEvent } from "@/types";

const STORAGE_KEY = "ai-gateway-analytics";
const EVENTS_MAX = 500; // Keep last 500 events for performance

function getDefaultData(): AnalyticsData {
  return {
    totalConversations: 0,
    totalConversationsDeleted: 0,
    totalUserMessages: 0,
    totalAssistantMessages: 0,
    modelUsage: {},
    dailyActivity: {},
    modelDailyActivity: {},
    averageResponseLength: 0,
    totalResponseLength: 0,
    responseCount: 0,
    firstActive: 0,
    lastActive: 0,
    streakDays: 0,
    peakHour: 0,
    hourlyActivity: {},
    events: [],
  };
}

export function loadAnalytics(): AnalyticsData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultData();
  } catch {
    return getDefaultData();
  }
}

function saveAnalytics(data: AnalyticsData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — prune events and retry
    data.events = data.events.slice(-100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Give up
    }
  }
}

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getHour(ts: number): number {
  return new Date(ts).getHours();
}

function getProvider(modelId: string): string {
  if (!modelId) return "unknown";
  const id = modelId.toLowerCase();
  if (id.includes("gpt") || id.includes("openai")) return "OpenAI";
  if (id.includes("claude") || id.includes("anthropic")) return "Anthropic";
  if (id.includes("gemini") || id.includes("google")) return "Google";
  if (id.includes("deepseek")) return "DeepSeek";
  if (id.includes("llama") || id.includes("meta")) return "Meta";
  if (id.includes("mistral") || id.includes("mixtral")) return "Mistral";
  if (id.includes("phi") || id.includes("microsoft")) return "Microsoft";
  if (id.includes("dbrx") || id.includes("databricks")) return "Databricks";
  if (id.includes("cohere")) return "Cohere";
  if (id.includes("palm") || id.includes("bison")) return "Google";
  if (id.includes("command")) return "Cohere";
  if (id.includes("qwen") || id.includes("qwen2")) return "Alibaba";
  if (id.includes("yi-") || id.includes("01-ai")) return "01.AI";
  if (id.includes("flux")) return "Black Forest";
  if (id.includes("stable-diffusion") || id.includes("sd")) return "Stability AI";
  if (id.includes("dall-e")) return "OpenAI";
  return "Other";
}

export function recordEvent(event: AnalyticsEvent) {
  const data = loadAnalytics();
  const dateKey = getDateKey(event.timestamp);

  // Update last active
  if (event.timestamp > data.lastActive) data.lastActive = event.timestamp;
  if (!data.firstActive || event.timestamp < data.firstActive) data.firstActive = event.timestamp;

  switch (event.type) {
    case "conversation_created":
      data.totalConversations++;
      break;

    case "conversation_deleted":
      data.totalConversationsDeleted++;
      break;

    case "message_sent":
      data.totalUserMessages++;
      // Track daily activity
      data.dailyActivity[dateKey] = (data.dailyActivity[dateKey] || 0) + 1;

      // Track model usage
      if (event.model) {
        if (!data.modelUsage[event.model]) {
          data.modelUsage[event.model] = { count: 0, provider: getProvider(event.model) };
        }
        data.modelUsage[event.model].count++;
        data.modelUsage[event.model].provider = getProvider(event.model);

        // Track model daily activity
        if (!data.modelDailyActivity[event.model]) {
          data.modelDailyActivity[event.model] = {};
        }
        data.modelDailyActivity[event.model][dateKey] =
          (data.modelDailyActivity[event.model][dateKey] || 0) + 1;
      }

      // Track peak hour
      const hour = getHour(event.timestamp);
      if (!data.hourlyActivity) {
        data.hourlyActivity = {};
      }
      data.hourlyActivity[hour] = (data.hourlyActivity[hour] || 0) + 1;

      // Calculate peak hour (find hour with highest count)
      let peakHour = 0;
      let maxCount = 0;
      for (let h = 0; h < 24; h++) {
        const count = data.hourlyActivity[h] || 0;
        if (count > maxCount) {
          maxCount = count;
          peakHour = h;
        }
      }
      data.peakHour = peakHour;
      break;

    case "message_received":
      data.totalAssistantMessages++;
      if (event.messageLength) {
        data.totalResponseLength += event.messageLength;
        data.responseCount++;
        data.averageResponseLength = Math.round(
          data.totalResponseLength / data.responseCount
        );
      }
      break;

    case "model_switched":
      // Just log the event
      break;

    case "image_generated":
      // Track image generation separately
      break;
  }

  // Add event to history (keep max EVENTS_MAX)
  data.events.push(event);
  if (data.events.length > EVENTS_MAX) {
    data.events = data.events.slice(-EVENTS_MAX);
  }

  // Calculate streak
  data.streakDays = calculateStreak(data.dailyActivity);

  saveAnalytics(data);
}

function calculateStreak(dailyActivity: Record<string, number>): number {
  const dates = Object.keys(dailyActivity).sort().reverse();

  if (dates.length === 0) return 0;

  // Start from today and count backwards
  let streak = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateKey = getDateKey(current.getTime());
    if (dailyActivity[dateKey]) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      // Allow today to be missing (user might still use it today)
      if (i === 0) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}

// Get top N most used models
export function getTopModels(data: AnalyticsData, limit = 5): { model: string; count: number; provider: string }[] {
  return Object.entries(data.modelUsage)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)
    .map(([model, usage]) => ({
      model,
      count: usage.count,
      provider: usage.provider,
    }));
}

// Get daily activity for last N days
export function getDailyActivity(data: AnalyticsData, days = 14): { date: string; label: string; count: number; isToday: boolean }[] {
  const result: { date: string; label: string; count: number; isToday: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getDateKey(d.getTime());
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    result.push({
      date: dateKey,
      label: i === 0 ? "Today" : i === 1 ? "Yesterday" : dayNames[d.getDay()],
      count: data.dailyActivity[dateKey] || 0,
      isToday: i === 0,
    });
  }

  return result;
}

// Get total messages
export function getTotalMessages(data: AnalyticsData): number {
  return data.totalUserMessages + data.totalAssistantMessages;
}

// Get unique models used
export function getUniqueModelsCount(data: AnalyticsData): number {
  return Object.keys(data.modelUsage).length;
}

// Get usage by provider
export function getUsageByProvider(data: AnalyticsData): { provider: string; count: number }[] {
  const providerMap: Record<string, number> = {};
  for (const [, usage] of Object.entries(data.modelUsage)) {
    providerMap[usage.provider] = (providerMap[usage.provider] || 0) + usage.count;
  }
  return Object.entries(providerMap)
    .sort(([, a], [, b]) => b - a)
    .map(([provider, count]) => ({ provider, count }));
}

// Reset analytics
export function resetAnalytics(): AnalyticsData {
  const fresh = getDefaultData();
  saveAnalytics(fresh);
  return fresh;
}

// Get session duration (days since first active)
export function getSessionDays(data: AnalyticsData): number {
  if (!data.firstActive) return 0;
  return Math.max(1, Math.ceil((Date.now() - data.firstActive) / (1000 * 60 * 60 * 24)));
}
