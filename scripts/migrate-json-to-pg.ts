import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = path.join(process.cwd(), "data");

function readJSON(file: string): Record<string, unknown>[] {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

async function main() {
  console.log("Starting migration...");

  // Migrate plans
  const plans = readJSON("membership-plans.json");
  for (const p of plans) {
    const features = (p.features as Record<string, unknown>) || {};
    await prisma.plan.upsert({
      where: { id: p.id as string },
      update: {},
      create: {
        id: p.id as string,
        name: p.name as string,
        description: (p.description as string) || null,
        type: "subscription",
        backend: "puter",
        billingPeriod: (p.billingPeriod as string) || "monthly",
        price: (p.price as number) || 0,
        maxTokensPerPeriod: (features.maxTokensPerMonth as number) || 0,
        maxRequestsPerDay: (features.maxRequestsPerDay as number) || 0,
        allowedModels: (features.allowedModels as string[]) || [],
        allowedProviders: (features.allowedProviders as string[]) || [],
        streaming: (features.streaming as boolean) ?? true,
        imageGeneration: (features.imageGeneration as boolean) ?? false,
        apiAccess: (features.apiAccess as boolean) ?? true,
        priority: (features.priority as string) || "normal",
        isActive: (p.isActive as boolean) ?? true,
        sortOrder: (p.sortOrder as number) || 0,
      },
    });
  }
  console.log(`Migrated ${plans.length} plans`);

  // Migrate API keys (create user + apiKey for each)
  const keys = readJSON("api-keys.json");
  for (const k of keys) {
    const userId = k.id as string;
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${(k.name as string) || "user"}-${userId.slice(0, 8)}@migrated.local`,
        passwordHash: "migrated-no-password",
        name: (k.name as string) || null,
        puterStatus: "pending",
        apiKey: {
          create: {
            key: k.key as string,
            name: (k.name as string) || "Migrated Key",
            isActive: (k.isActive as boolean) ?? true,
            usageCount: (k.usageCount as number) || 0,
            totalTokens: (k.totalTokens as number) || 0,
            lastUsed: k.lastUsed ? new Date(k.lastUsed as number) : null,
          },
        },
        wallet: { create: { balance: 0 } },
      },
    });
  }
  console.log(`Migrated ${keys.length} API keys`);

  // Migrate usage records
  const usage = readJSON("usage-records.json");
  let usageCount = 0;
  for (const u of usage) {
    try {
      await prisma.usageRecord.create({
        data: {
          userId: u.apiKeyId as string,
          model: (u.model as string) || "unknown",
          source: "puter",
          promptTokens: (u.promptTokens as number) || 0,
          completionTokens: (u.completionTokens as number) || 0,
          totalTokens: (u.totalTokens as number) || 0,
          endpoint: (u.endpoint as string) || "/v1/chat/completions",
          createdAt: u.timestamp ? new Date(u.timestamp as number) : new Date(),
        },
      });
      usageCount++;
    } catch (e: unknown) {
      console.log(`Skip usage record: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  console.log(`Migrated ${usageCount}/${usage.length} usage records`);

  // Seed default Puter limits
  const existingLimits = await prisma.puterLimit.findFirst();
  if (!existingLimits) {
    await prisma.puterLimit.create({
      data: {
        freeRequestsPerMonth: 1000,
        freeTokensPerMonth: 500000,
        appMaxRequestsPerDay: 100,
        appMaxTokensPerMonth: 100000,
      },
    });
    console.log("Seeded Puter limits");
  }

  console.log("Migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
