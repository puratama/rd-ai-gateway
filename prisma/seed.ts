import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  return createHash("sha256")
    .update(password + (process.env.AUTH_SALT || "xperimne-salt"))
    .digest("hex");
}

function generateApiKey(): string {
  return `xpgw_${randomBytes(32).toString("hex")}`;
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.billingRecord.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.userPackage.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.appModel.deleteMany();
  await prisma.aggregatorConfig.deleteMany();
  await prisma.puterLimit.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // ====== Users ======
  const superadmin = await prisma.user.create({
    data: {
      email: "admin@xperimne.com",
      passwordHash: hashPassword("admin123"),
      name: "Super Admin",
      role: "superadmin",
      puterUid: "puter_admin_001",
      puterStatus: "active",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: "user@example.com",
      passwordHash: hashPassword("user123"),
      name: "Test User",
      role: "user",
      puterUid: "puter_user_001",
      puterStatus: "active",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "demo@xperimne.com",
      passwordHash: hashPassword("demo123"),
      name: "Demo User",
      role: "user",
      puterUid: "puter_user_002",
      puterStatus: "active",
    },
  });

  console.log("Created users:", superadmin.email, user1.email, user2.email);

  // ====== API Keys ======
  const apiKey1 = await prisma.apiKey.create({
    data: {
      key: generateApiKey(),
      name: "Default Key",
      userId: user1.id,
      isActive: true,
    },
  });

  const apiKey2 = await prisma.apiKey.create({
    data: {
      key: generateApiKey(),
      name: "Default Key",
      userId: user2.id,
      isActive: true,
    },
  });

  console.log("Created API keys for users");

  // ====== Wallets ======
  await prisma.wallet.create({
    data: { userId: user1.id, balance: 50000 },
  });

  await prisma.wallet.create({
    data: { userId: user2.id, balance: 150000 },
  });

  console.log("Created wallets");

  // ====== Plans ======
  const starterPlan = await prisma.plan.create({
    data: {
      name: "Starter",
      description: "Basic plan for individuals",
      type: "subscription",
      backend: "puter",
      billingPeriod: "monthly",
      price: 49000,
      maxTokensPerPeriod: 500000,
      maxRequestsPerDay: 100,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: false,
      apiAccess: true,
      priority: "normal",
      isActive: true,
      sortOrder: 1,
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: "Pro",
      description: "Advanced plan for power users",
      type: "subscription",
      backend: "aggregator",
      billingPeriod: "monthly",
      price: 149000,
      maxTokensPerPeriod: 2000000,
      maxRequestsPerDay: 500,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: true,
      apiAccess: true,
      priority: "high",
      isActive: true,
      sortOrder: 2,
    },
  });

  const dailyPackage = await prisma.plan.create({
    data: {
      name: "Daily Pass",
      description: "One-day access package",
      type: "package",
      backend: "aggregator",
      billingPeriod: "daily",
      price: 9000,
      maxTokensPerPeriod: 100000,
      maxRequestsPerDay: 50,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: false,
      apiAccess: true,
      priority: "normal",
      isActive: true,
      sortOrder: 3,
    },
  });

  const weeklyPackage = await prisma.plan.create({
    data: {
      name: "Weekly Pack",
      description: "One-week access package",
      type: "package",
      backend: "aggregator",
      billingPeriod: "weekly",
      price: 39000,
      maxTokensPerPeriod: 500000,
      maxRequestsPerDay: 200,
      allowedModels: [],
      allowedProviders: [],
      streaming: true,
      imageGeneration: true,
      apiAccess: true,
      priority: "normal",
      isActive: true,
      sortOrder: 4,
    },
  });

  console.log("Created plans:", starterPlan.name, proPlan.name, dailyPackage.name, weeklyPackage.name);

  // ====== Subscriptions ======
  await prisma.subscription.create({
    data: {
      userId: user1.id,
      planId: starterPlan.id,
      status: "active",
      tokensUsed: 125000,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: user2.id,
      planId: proPlan.id,
      status: "active",
      tokensUsed: 450000,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    },
  });

  console.log("Created subscriptions");

  // ====== User Packages ======
  await prisma.userPackage.create({
    data: {
      userId: user1.id,
      planId: dailyPackage.id,
      status: "active",
      tokensRemaining: 80000,
      tokensTotal: 100000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log("Created user packages");

  // ====== App Models ======
  const models = [
    {
      modelId: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      source: "aggregator",
      category: "chat",
      contextWindow: 128000,
      costPer1kPrompt: 0.0025,
      costPer1kCompletion: 0.01,
      markupPercent: 50,
      sellPricePer1kPrompt: 0.00375,
      sellPricePer1kCompletion: 0.015,
    },
    {
      modelId: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      source: "aggregator",
      category: "fast",
      contextWindow: 128000,
      costPer1kPrompt: 0.00015,
      costPer1kCompletion: 0.0006,
      markupPercent: 50,
      sellPricePer1kPrompt: 0.000225,
      sellPricePer1kCompletion: 0.0009,
    },
    {
      modelId: "claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      source: "aggregator",
      category: "chat",
      contextWindow: 200000,
      costPer1kPrompt: 0.003,
      costPer1kCompletion: 0.015,
      markupPercent: 40,
      sellPricePer1kPrompt: 0.0042,
      sellPricePer1kCompletion: 0.021,
    },
    {
      modelId: "claude-3-haiku",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      source: "aggregator",
      category: "fast",
      contextWindow: 200000,
      costPer1kPrompt: 0.00025,
      costPer1kCompletion: 0.00125,
      markupPercent: 40,
      sellPricePer1kPrompt: 0.00035,
      sellPricePer1kCompletion: 0.00175,
    },
    {
      modelId: "deepseek-chat",
      name: "DeepSeek V3",
      provider: "deepseek",
      source: "aggregator",
      category: "chat",
      contextWindow: 64000,
      costPer1kPrompt: 0.00014,
      costPer1kCompletion: 0.00028,
      markupPercent: 100,
      sellPricePer1kPrompt: 0.00028,
      sellPricePer1kCompletion: 0.00056,
    },
    {
      modelId: "deepseek-reasoner",
      name: "DeepSeek R1",
      provider: "deepseek",
      source: "aggregator",
      category: "reasoning",
      contextWindow: 64000,
      costPer1kPrompt: 0.00055,
      costPer1kCompletion: 0.00219,
      markupPercent: 80,
      sellPricePer1kPrompt: 0.00099,
      sellPricePer1kCompletion: 0.00394,
    },
    {
      modelId: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "google",
      source: "aggregator",
      category: "fast",
      contextWindow: 1048576,
      costPer1kPrompt: 0.0001,
      costPer1kCompletion: 0.0004,
      markupPercent: 60,
      sellPricePer1kPrompt: 0.00016,
      sellPricePer1kCompletion: 0.00064,
    },
    {
      modelId: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "google",
      source: "aggregator",
      category: "reasoning",
      contextWindow: 1048576,
      costPer1kPrompt: 0.00125,
      costPer1kCompletion: 0.01,
      markupPercent: 50,
      sellPricePer1kPrompt: 0.001875,
      sellPricePer1kCompletion: 0.015,
    },
    {
      modelId: "llama-3.3-70b",
      name: "Llama 3.3 70B",
      provider: "meta",
      source: "puter",
      category: "chat",
      contextWindow: 128000,
      costPer1kPrompt: null,
      costPer1kCompletion: null,
      markupPercent: 0,
      sellPricePer1kPrompt: null,
      sellPricePer1kCompletion: null,
    },
    {
      modelId: "mistral-large",
      name: "Mistral Large",
      provider: "mistral",
      source: "aggregator",
      category: "coding",
      contextWindow: 128000,
      costPer1kPrompt: 0.002,
      costPer1kCompletion: 0.006,
      markupPercent: 50,
      sellPricePer1kPrompt: 0.003,
      sellPricePer1kCompletion: 0.009,
    },
  ];

  for (const model of models) {
    await prisma.appModel.create({ data: model });
  }

  console.log(`Created ${models.length} app models`);

  // ====== Aggregator Config ======
  await prisma.aggregatorConfig.create({
    data: {
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnc: "sk-or-placeholder-replace-with-real-key",
      isActive: true,
    },
  });

  await prisma.aggregatorConfig.create({
    data: {
      name: "Together AI",
      baseUrl: "https://api.together.xyz/v1",
      apiKeyEnc: "tg-placeholder-replace-with-real-key",
      isActive: false,
    },
  });

  console.log("Created aggregator configs");

  // ====== Puter Limits ======
  await prisma.puterLimit.create({
    data: {
      freeRequestsPerMonth: 100,
      freeTokensPerMonth: 50000,
      appMaxRequestsPerDay: 1000,
      appMaxTokensPerMonth: 10000000,
    },
  });

  console.log("Created puter limits");

  // ====== Sample Usage Records ======
  const now = Date.now();
  const usageRecords = [
    { userId: user1.id, model: "gpt-4o-mini", provider: "openai", source: "aggregator", promptTokens: 150, completionTokens: 300, totalTokens: 450, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000) },
    { userId: user1.id, model: "gpt-4o", provider: "openai", source: "aggregator", promptTokens: 500, completionTokens: 1200, totalTokens: 1700, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
    { userId: user1.id, model: "claude-3.5-sonnet", provider: "anthropic", source: "aggregator", promptTokens: 800, completionTokens: 2000, totalTokens: 2800, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000) },
    { userId: user1.id, model: "deepseek-chat", provider: "deepseek", source: "aggregator", promptTokens: 200, completionTokens: 600, totalTokens: 800, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
    { userId: user1.id, model: "gpt-4o-mini", provider: "openai", source: "aggregator", promptTokens: 100, completionTokens: 250, totalTokens: 350, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000) },
    { userId: user2.id, model: "gpt-4o", provider: "openai", source: "aggregator", promptTokens: 1000, completionTokens: 3000, totalTokens: 4000, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
    { userId: user2.id, model: "claude-3.5-sonnet", provider: "anthropic", source: "aggregator", promptTokens: 600, completionTokens: 1800, totalTokens: 2400, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
    { userId: user2.id, model: "gemini-2.5-pro", provider: "google", source: "aggregator", promptTokens: 400, completionTokens: 1500, totalTokens: 1900, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000) },
    { userId: user2.id, model: "deepseek-reasoner", provider: "deepseek", source: "aggregator", promptTokens: 300, completionTokens: 2500, totalTokens: 2800, endpoint: "/api/v1/chat/completions", createdAt: new Date(now - 12 * 60 * 60 * 1000) },
  ];

  for (const record of usageRecords) {
    await prisma.usageRecord.create({ data: record });
  }

  console.log(`Created ${usageRecords.length} usage records`);

  // ====== Billing Records ======
  await prisma.billingRecord.create({
    data: {
      userId: user1.id,
      type: "topup",
      amount: 50000,
      status: "paid",
      description: "Initial top-up",
      paidAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.billingRecord.create({
    data: {
      userId: user2.id,
      type: "topup",
      amount: 150000,
      status: "paid",
      description: "Initial top-up",
      paidAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.billingRecord.create({
    data: {
      userId: user1.id,
      type: "subscription",
      amount: 49000,
      status: "paid",
      planId: starterPlan.id,
      description: "Starter plan subscription",
      paidAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.billingRecord.create({
    data: {
      userId: user2.id,
      type: "subscription",
      amount: 149000,
      status: "paid",
      planId: proPlan.id,
      description: "Pro plan subscription",
      paidAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.billingRecord.create({
    data: {
      userId: user1.id,
      type: "package_purchase",
      amount: 9000,
      status: "paid",
      planId: dailyPackage.id,
      description: "Daily Pass purchase",
      paidAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Created billing records");

  console.log("\n=== Seed Summary ===");
  console.log("Users:");
  console.log(`  Superadmin: ${superadmin.email} / admin123`);
  console.log(`  User 1:     ${user1.email} / user123`);
  console.log(`  User 2:     ${user2.email} / demo123`);
  console.log(`API Keys:`);
  console.log(`  ${user1.email}: ${apiKey1.key}`);
  console.log(`  ${user2.email}: ${apiKey2.key}`);
  console.log("Plans:", starterPlan.name, proPlan.name, dailyPackage.name, weeklyPackage.name);
  console.log("Models:", models.length);
  console.log("Aggregators: OpenRouter, Together AI");
  console.log("===================\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
