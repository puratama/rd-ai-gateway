import type { ModelPricing } from "@/types";

// Data harga model berdasarkan harga pasar (OpenRouter & provider langsung)
// Puter menggunakan user-pays model — biaya ditanggung end user via akun Puter
// Harga ini sebagai referensi transparansi
export const pricingData: ModelPricing[] = [
  // ===== OpenAI =====
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    category: "chat",
    context: 128000,
    pricing: { prompt: 2.50, completion: 10.00 },
    speed: "fast",
    quality: "Excellent",
    available: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    category: "fast",
    context: 128000,
    pricing: { prompt: 0.15, completion: 0.60 },
    speed: "fast",
    quality: "Good",
    available: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    category: "chat",
    context: 128000,
    pricing: { prompt: 10.00, completion: 30.00 },
    speed: "balanced",
    quality: "Excellent",
    available: true,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenAI",
    category: "chat",
    context: 8192,
    pricing: { prompt: 30.00, completion: 60.00 },
    speed: "slow",
    quality: "Excellent",
    available: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    category: "fast",
    context: 16385,
    pricing: { prompt: 0.50, completion: 1.50 },
    speed: "fast",
    quality: "Average",
    available: true,
  },
  {
    id: "o1",
    name: "o1",
    provider: "OpenAI",
    category: "reasoning",
    context: 200000,
    pricing: { prompt: 15.00, completion: 60.00 },
    speed: "slow",
    quality: "Excellent",
    available: true,
  },
  {
    id: "o1-mini",
    name: "o1 Mini",
    provider: "OpenAI",
    category: "reasoning",
    context: 128000,
    pricing: { prompt: 1.10, completion: 4.40 },
    speed: "balanced",
    quality: "Good",
    available: true,
  },
  {
    id: "o3-mini",
    name: "o3 Mini",
    provider: "OpenAI",
    category: "reasoning",
    context: 200000,
    pricing: { prompt: 1.10, completion: 4.40 },
    speed: "balanced",
    quality: "Good",
    available: true,
  },

  // ===== Anthropic =====
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    category: "chat",
    context: 200000,
    pricing: { prompt: 3.00, completion: 15.00 },
    speed: "fast",
    quality: "Excellent",
    available: true,
  },
  {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    category: "chat",
    context: 200000,
    pricing: { prompt: 15.00, completion: 75.00 },
    speed: "balanced",
    quality: "Best",
    available: true,
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "coding",
    context: 200000,
    pricing: { prompt: 3.00, completion: 15.00 },
    speed: "balanced",
    quality: "Excellent",
    available: true,
  },
  {
    id: "claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    category: "fast",
    context: 200000,
    pricing: { prompt: 0.80, completion: 4.00 },
    speed: "fast",
    quality: "Good",
    available: true,
  },

  // ===== Google =====
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    category: "reasoning",
    context: 1048576,
    pricing: { prompt: 1.25, completion: 10.00 },
    speed: "balanced",
    quality: "Excellent",
    available: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    category: "fast",
    context: 1048576,
    pricing: { prompt: 0.15, completion: 0.60 },
    speed: "fast",
    quality: "Good",
    available: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    category: "fast",
    context: 1048576,
    pricing: { prompt: 0.10, completion: 0.40 },
    speed: "fast",
    quality: "Good",
    available: true,
  },

  // ===== DeepSeek =====
  {
    id: "deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    category: "chat",
    context: 65536,
    pricing: { prompt: 0.27, completion: 1.10 },
    speed: "fast",
    quality: "Excellent",
    available: true,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    category: "reasoning",
    context: 65536,
    pricing: { prompt: 0.55, completion: 2.19 },
    speed: "slow",
    quality: "Excellent",
    available: true,
  },

  // ===== Meta (Llama) =====
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "Meta",
    category: "open-source",
    context: 131072,
    pricing: { prompt: 0.20, completion: 0.20 },
    speed: "fast",
    quality: "Good",
    available: true,
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    provider: "Meta",
    category: "open-source",
    context: 131072,
    pricing: { prompt: 0.10, completion: 0.10 },
    speed: "fast",
    quality: "Average",
    available: true,
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    category: "open-source",
    context: 131072,
    pricing: { prompt: 0.15, completion: 0.15 },
    speed: "balanced",
    quality: "Good",
    available: true,
  },

  // ===== Mistral =====
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    category: "chat",
    context: 128000,
    pricing: { prompt: 2.00, completion: 6.00 },
    speed: "balanced",
    quality: "Excellent",
    available: true,
  },
  {
    id: "mistral-small",
    name: "Mistral Small",
    provider: "Mistral",
    category: "fast",
    context: 32000,
    pricing: { prompt: 0.20, completion: 0.60 },
    speed: "fast",
    quality: "Good",
    available: true,
  },

  // ===== xAI =====
  {
    id: "grok-2",
    name: "Grok 2",
    provider: "xAI",
    category: "chat",
    context: 131072,
    pricing: { prompt: 2.00, completion: 10.00 },
    speed: "fast",
    quality: "Good",
    available: true,
  },
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "xAI",
    category: "chat",
    context: 131072,
    pricing: { prompt: 3.00, completion: 15.00 },
    speed: "fast",
    quality: "Excellent",
    available: true,
  },

  // ===== Image Models =====
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "OpenAI",
    category: "image",
    context: 0,
    pricing: { prompt: 0.040, completion: 0.080 }, // per image
    speed: "slow",
    quality: "Excellent",
    available: true,
  },
  {
    id: "flux-pro",
    name: "Flux Pro",
    provider: "Black Forest",
    category: "image",
    context: 0,
    pricing: { prompt: 0.050, completion: 0.050 },
    speed: "balanced",
    quality: "Excellent",
    available: true,
  },
];

// Helper functions
export function getPricingByProvider(provider: string): ModelPricing[] {
  return pricingData.filter((m) => m.provider === provider);
}

export function getPricingByCategory(category: string): ModelPricing[] {
  return pricingData.filter((m) => m.category === category);
}

export function getProviders(): string[] {
  return [...new Set(pricingData.map((m) => m.provider))];
}

export function getCategories(): { key: string; label: string; icon: string }[] {
  return [
    { key: "chat", label: "Chat", icon: "💬" },
    { key: "reasoning", label: "Reasoning", icon: "🧠" },
    { key: "coding", label: "Coding", icon: "💻" },
    { key: "fast", label: "Fast & Cheap", icon: "⚡" },
    { key: "vision", label: "Vision", icon: "👁️" },
    { key: "image", label: "Image", icon: "🎨" },
    { key: "open-source", label: "Open Source", icon: "🔓" },
  ];
}

export function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(3)}`;
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

export function getMinPrice(models: ModelPricing[]): number {
  return Math.min(...models.map((m) => m.pricing.prompt));
}

export function getMaxPrice(models: ModelPricing[]): number {
  return Math.max(...models.map((m) => m.pricing.completion));
}
