# Hybrid Business Model Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JSON file storage with PostgreSQL, implement dual-track business model (subscription via Puter + one-time packages via aggregator), with superadmin model/pricing management.

**Architecture:** Multi-backend router routes requests to Puter (free/subscription) or Aggregator (packages). User registers on app → auto-registered to Puter transparently. Superadmin controls models, pricing, limits.

**Tech Stack:** Next.js 16, React 19, Prisma ORM, PostgreSQL, Midtrans, Tailwind 4

---

## Phase 1: Database Migration

### Task 1.1: Setup Prisma + PostgreSQL

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json`
- Create: `.env.local` (add DATABASE_URL)

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
npx prisma init
```

- [ ] **Step 2: Write Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  name            String?
  puterUid        String?  @unique
  puterStatus     String   @default("pending")
  apiKey          ApiKey?
  wallet          Wallet?
  subscriptions   Subscription[]
  packages        UserPackage[]
  usageRecords    UsageRecord[]
  billingRecords  BillingRecord[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ApiKey {
  id          String    @id @default(cuid())
  key         String    @unique
  name        String
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id])
  isActive    Boolean   @default(true)
  usageCount  Int       @default(0)
  totalTokens Int       @default(0)
  lastUsed    DateTime?
  createdAt   DateTime  @default(now())
}

model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  balance   Decimal  @default(0)
  updatedAt DateTime @updatedAt
}

model Plan {
  id                 String   @id @default(cuid())
  name               String
  description        String?
  type               String
  backend            String
  billingPeriod      String
  price              Decimal
  maxTokensPerPeriod Int
  maxRequestsPerDay  Int
  allowedModels      String[]
  allowedProviders   String[]
  streaming          Boolean  @default(true)
  imageGeneration    Boolean  @default(false)
  apiAccess          Boolean  @default(true)
  priority           String   @default("normal")
  isActive           Boolean  @default(true)
  sortOrder          Int      @default(0)
  subscriptions      Subscription[]
  packages           UserPackage[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  planId    String
  plan      Plan     @relation(fields: [planId], references: [id])
  status    String   @default("active")
  tokensUsed Int     @default(0)
  startDate DateTime @default(now())
  endDate   DateTime
  autoRenew Boolean  @default(false)
  createdAt DateTime @default(now())
}

model UserPackage {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  planId          String
  plan            Plan     @relation(fields: [planId], references: [id])
  status          String   @default("active")
  tokensRemaining Int
  tokensTotal     Int
  expiresAt       DateTime
  billingId       String?
  createdAt       DateTime @default(now())
}

model UsageRecord {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  model            String
  provider         String?
  source           String
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  totalTokens      Int      @default(0)
  cost             Decimal?
  endpoint         String
  createdAt        DateTime @default(now())
}

model BillingRecord {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  type            String
  amount          Decimal
  status          String    @default("pending")
  midtransOrderId String?   @unique
  midtransToken   String?
  midtransUrl     String?
  planId          String?
  description     String?
  paidAt          DateTime?
  createdAt       DateTime  @default(now())
}

model AppModel {
  id                       String   @id @default(cuid())
  modelId                  String
  name                     String
  provider                 String
  source                   String
  category                 String
  contextWindow            Int      @default(0)
  costPer1kPrompt          Decimal?
  costPer1kCompletion      Decimal?
  markupPercent            Decimal  @default(0)
  sellPricePer1kPrompt     Decimal?
  sellPricePer1kCompletion Decimal?
  isActive                 Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}

model AggregatorConfig {
  id        String   @id @default(cuid())
  name      String
  baseUrl   String
  apiKeyEnc String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PuterLimit {
  id                   String   @id @default(cuid())
  freeRequestsPerMonth Int
  freeTokensPerMonth   Int
  appMaxRequestsPerDay Int
  appMaxTokensPerMonth Int
  updatedAt            DateTime @updatedAt
}
```

- [ ] **Step 3: Add DATABASE_URL to .env.local**

```
DATABASE_URL="[REDACTED-DATABASE_CONNECTION_STRING]"
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 5: Create Prisma client singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts .env.local package.json package-lock.json
git commit -m "feat: setup Prisma + PostgreSQL with full schema"
```

---

### Task 1.2: Migrate Existing Data to PostgreSQL

**Files:**
- Create: `scripts/migrate-json-to-pg.ts`

- [ ] **Step 1: Write migration script**

```typescript
// scripts/migrate-json-to-pg.ts
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data");

function readJSON(file: string): unknown[] {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

async function main() {
  console.log("Starting migration...");

  // Migrate plans
  const plans = readJSON("membership-plans.json") as Record<string, unknown>[];
  for (const p of plans) {
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
        maxTokensPerPeriod: ((p.features as Record<string, unknown>)?.maxTokensPerMonth as number) || 0,
        maxRequestsPerDay: ((p.features as Record<string, unknown>)?.maxRequestsPerDay as number) || 0,
        allowedModels: ((p.features as Record<string, unknown>)?.allowedModels as string[]) || [],
        allowedProviders: ((p.features as Record<string, unknown>)?.allowedProviders as string[]) || [],
        streaming: ((p.features as Record<string, unknown>)?.streaming as boolean) ?? true,
        imageGeneration: ((p.features as Record<string, unknown>)?.imageGeneration as boolean) ?? false,
        apiAccess: ((p.features as Record<string, unknown>)?.apiAccess as boolean) ?? true,
        priority: ((p.features as Record<string, unknown>)?.priority as string) || "normal",
        isActive: (p.isActive as boolean) ?? true,
        sortOrder: (p.sortOrder as number) || 0,
      },
    });
  }
  console.log(`Migrated ${plans.length} plans`);

  // Migrate API keys (create user + apiKey for each)
  const keys = readJSON("api-keys.json") as Record<string, unknown>[];
  for (const k of keys) {
    const userId = k.id as string;
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${k.name || "user"}-${userId.slice(0, 8)}@migrated.local`,
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
  const usage = readJSON("usage-records.json") as Record<string, unknown>[];
  for (const u of usage) {
    try {
      await prisma.usageRecord.create({
        data: {
          userId: u.apiKeyId as string,
          model: (u.model as string) || "unknown",
          provider: (u.provider as string) || null,
          source: "puter",
          promptTokens: (u.promptTokens as number) || 0,
          completionTokens: (u.completionTokens as number) || 0,
          totalTokens: (u.totalTokens as number) || 0,
          endpoint: (u.endpoint as string) || "/api/v1/chat/completions",
          createdAt: u.timestamp ? new Date(u.timestamp as number) : new Date(),
        },
      });
    } catch {
      // Skip records with missing user
    }
  }
  console.log(`Migrated ${usage.length} usage records`);

  // Seed default Puter limits
  await prisma.puterLimit.create({
    data: {
      freeRequestsPerMonth: 1000,
      freeTokensPerMonth: 500000,
      appMaxRequestsPerDay: 100,
      appMaxTokensPerMonth: 100000,
    },
  });
  console.log("Seeded Puter limits");

  console.log("Migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run migration script**

```bash
npx tsx scripts/migrate-json-to-pg.ts
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-json-to-pg.ts
git commit -m "feat: add JSON to PostgreSQL migration script"
```

---

### Task 1.3: Replace server-store.ts with Prisma

**Files:**
- Modify: `src/lib/server-store.ts`

- [ ] **Step 1: Rewrite server-store.ts to use Prisma**

Replace all `readJSON`/`writeJSON` calls with Prisma queries. Keep same function signatures so callers don't break.

```typescript
// src/lib/server-store.ts
import { prisma } from "./db";

export type BillingPeriod = "daily" | "weekly" | "monthly" | "yearly";

// ====== API Keys ======

export async function loadServerKeys() {
  return prisma.apiKey.findMany({ include: { user: true } });
}

export async function validateServerKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    include: { user: true },
  });
  return apiKey;
}

export async function createServerKey(name: string, email?: string) {
  const user = await prisma.user.create({
    data: {
      email: email || `${name}-${Date.now()}@generated.local`,
      passwordHash: "generated",
      name,
      wallet: { create: { balance: 0 } },
      apiKey: {
        create: {
          key: `xpgw_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
          name,
        },
      },
    },
    include: { apiKey: true },
  });
  return user.apiKey!;
}

export async function revokeServerKey(id: string) {
  const result = await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });
  return !!result;
}

export async function deleteServerKey(id: string) {
  try {
    await prisma.apiKey.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function updateServerKeyUsage(keyId: string, tokens: number) {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      usageCount: { increment: 1 },
      totalTokens: { increment: tokens },
      lastUsed: new Date(),
    },
  });
}

// ====== Usage Records ======

export async function loadServerUsageRecords() {
  return prisma.usageRecord.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
}

export async function addServerUsageRecord(record: {
  userId: string;
  model: string;
  provider?: string;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  endpoint: string;
}) {
  return prisma.usageRecord.create({ data: record });
}

export async function getServerUsageSummary(userId: string) {
  const records = await prisma.usageRecord.findMany({ where: { userId } });
  const modelBreakdown: Record<string, number> = {};
  const dailyUsage: Record<string, number> = {};
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const record of records) {
    modelBreakdown[record.model] = (modelBreakdown[record.model] || 0) + record.totalTokens;
    const date = record.createdAt.toISOString().slice(0, 10);
    dailyUsage[date] = (dailyUsage[date] || 0) + record.totalTokens;
    totalPromptTokens += record.promptTokens;
    totalCompletionTokens += record.completionTokens;
  }

  return {
    totalRequests: records.length,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    totalPromptTokens,
    totalCompletionTokens,
    modelBreakdown,
    dailyUsage,
    userId,
  };
}

// ====== Plans ======

export async function loadPlans() {
  return prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getPlan(id: string) {
  return prisma.plan.findUnique({ where: { id } });
}

export async function createPlan(data: Parameters<typeof prisma.plan.create>[0]["data"]) {
  return prisma.plan.create({ data });
}

export async function updatePlan(id: string, data: Parameters<typeof prisma.plan.update>[0]["data"]) {
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
  } catch {
    return false;
  }
}

// ====== Subscriptions ======

export async function getSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "active", endDate: { gt: new Date() } },
    include: { plan: true },
  });
}

export async function createSubscription(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const endDate = new Date();
  switch (plan.billingPeriod) {
    case "daily": endDate.setDate(endDate.getDate() + 1); break;
    case "weekly": endDate.setDate(endDate.getDate() + 7); break;
    case "monthly": endDate.setMonth(endDate.getMonth() + 1); break;
    case "yearly": endDate.setFullYear(endDate.getFullYear() + 1); break;
  }

  return prisma.subscription.create({
    data: { userId, planId, endDate },
    include: { plan: true },
  });
}

// ====== User Packages ======

export async function getActivePackages(userId: string) {
  return prisma.userPackage.findMany({
    where: { userId, status: "active", expiresAt: { gt: new Date() }, tokensRemaining: { gt: 0 } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUserPackage(userId: string, planId: string, billingId?: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const expiresAt = new Date();
  switch (plan.billingPeriod) {
    case "daily": expiresAt.setDate(expiresAt.getDate() + 1); break;
    case "weekly": expiresAt.setDate(expiresAt.getDate() + 7); break;
    case "monthly": expiresAt.setMonth(expiresAt.getMonth() + 1); break;
  }

  return prisma.userPackage.create({
    data: {
      userId,
      planId,
      tokensRemaining: plan.maxTokensPerPeriod,
      tokensTotal: plan.maxTokensPerPeriod,
      expiresAt,
      billingId,
    },
    include: { plan: true },
  });
}

export async function decrementPackageTokens(packageId: string, tokens: number) {
  return prisma.userPackage.update({
    where: { id: packageId },
    data: { tokensRemaining: { decrement: tokens } },
  });
}

// ====== Wallet ======

export async function getWallet(userId: string) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function topupWallet(userId: string, amount: number) {
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });
}

export async function deductWallet(userId: string, amount: number) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || Number(wallet.balance) < amount) return null;
  return prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
}

// ====== Billing ======

export async function createBillingRecord(data: {
  userId: string;
  type: string;
  amount: number;
  midtransOrderId?: string;
  planId?: string;
  description?: string;
}) {
  return prisma.billingRecord.create({ data });
}

export async function updateBillingStatus(orderId: string, status: string) {
  return prisma.billingRecord.update({
    where: { midtransOrderId: orderId },
    data: { status, paidAt: status === "paid" ? new Date() : undefined },
  });
}

export async function getBillingByOrderId(orderId: string) {
  return prisma.billingRecord.findUnique({ where: { midtransOrderId: orderId } });
}

// ====== App Models ======

export async function loadAppModels() {
  return prisma.appModel.findMany({ orderBy: [{ provider: "asc" }, { name: "asc" }] });
}

export async function updateAppModel(id: string, data: Parameters<typeof prisma.appModel.update>[0]["data"]) {
  return prisma.appModel.update({ where: { id }, data });
}

export async function upsertAppModel(modelId: string, data: Parameters<typeof prisma.appModel.upsert>[0]["create"]) {
  return prisma.appModel.upsert({
    where: { modelId },
    create: data,
    update: data,
  });
}

// ====== Aggregator Config ======

export async function getAggregatorConfig() {
  return prisma.aggregatorConfig.findFirst({ where: { isActive: true } });
}

export async function updateAggregatorConfig(data: Parameters<typeof prisma.aggregatorConfig.upsert>[0]["create"]) {
  const existing = await prisma.aggregatorConfig.findFirst({ where: { isActive: true } });
  if (existing) {
    return prisma.aggregatorConfig.update({ where: { id: existing.id }, data });
  }
  return prisma.aggregatorConfig.create({ data });
}

// ====== Puter Limits ======

export async function getPuterLimits() {
  return prisma.puterLimit.findFirst({ orderBy: { updatedAt: "desc" } });
}

export async function updatePuterLimits(data: Parameters<typeof prisma.puterLimit.upsert>[0]["create"]) {
  const existing = await prisma.puterLimit.findFirst();
  if (existing) {
    return prisma.puterLimit.update({ where: { id: existing.id }, data });
  }
  return prisma.puterLimit.create({ data });
}

// ====== Helpers ======

export function generateId() {
  return Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
}
```

- [ ] **Step 2: Update all API route callers to use async**

All routes that call server-store functions need `await` since they're now async. Scan and update:
- `src/app/api/admin/plans/route.ts`
- `src/app/api/admin/stats/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/v1/billing/topup/route.ts`
- `src/app/api/v1/billing/webhook/route.ts`
- `src/app/api/v1/chat/completions/route.ts`
- `src/app/api/v1/keys/route.ts`
- `src/app/api/v1/membership/route.ts`
- `src/app/api/v1/models/route.ts`
- `src/app/api/v1/usage/route.ts`

- [ ] **Step 3: Update api-keys.ts to use Prisma**

```typescript
// src/lib/api-keys.ts (browser-side, calls API routes — no changes needed)
// This file uses localStorage and fetch — stays as-is for client-side
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/server-store.ts src/lib/db.ts src/app/api/
git commit -m "refactor: replace JSON storage with Prisma queries"
```

---

## Phase 2: Core Infrastructure

### Task 2.1: User Registration + Auto-Register to Puter

**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/puter.ts`

- [ ] **Step 1: Create registration API**

```typescript
// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password (use bcrypt or similar)
    const { hash } = await import("bcryptjs");
    const passwordHash = await hash(password, 10);

    // Create user + wallet + default API key
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        puterStatus: "pending",
        wallet: { create: { balance: 0 } },
        apiKey: {
          create: {
            key: `xpgw_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
            name: "Default Key",
          },
        },
      },
      include: { apiKey: true, wallet: true },
    });

    // Auto-register to Puter (async, non-blocking)
    registerToPuter(user.id, email).catch((err) => {
      console.error("Puter registration failed:", err);
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: user.apiKey?.key,
      wallet: { balance: user.wallet?.balance },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

async function registerToPuter(userId: string, email: string) {
  try {
    // Call Puter API to create account
    // This is a placeholder — implement based on Puter's actual API
    const puterUid = `puter_${userId.slice(0, 12)}`;

    await prisma.user.update({
      where: { id: userId },
      data: { puterUid, puterStatus: "active" },
    });
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: { puterStatus: "pending" },
    });
    throw new Error("Puter registration failed, will retry");
  }
}
```

- [ ] **Step 2: Add background retry cron**

```typescript
// src/app/api/cron/retry-puter/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const pendingUsers = await prisma.user.findMany({
    where: { puterStatus: "pending" },
    take: 10,
  });

  let fixed = 0;
  for (const user of pendingUsers) {
    try {
      // Retry Puter registration
      const puterUid = `puter_${user.id.slice(0, 12)}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { puterUid, puterStatus: "active" },
      });
      fixed++;
    } catch {
      // Stay pending
    }
  }

  return NextResponse.json({ checked: pendingUsers.length, fixed });
}
```

- [ ] **Step 3: Install bcryptjs**

```bash
npm install bcryptjs @types/bcryptjs
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts src/app/api/cron/retry-puter/route.ts
git commit -m "feat: user registration with lazy Puter auto-registration"
```

---

### Task 2.2: Wallet System

**Files:**
- Create: `src/app/api/v1/wallet/route.ts`
- Create: `src/app/api/v1/wallet/topup/route.ts`

- [ ] **Step 1: Create wallet API**

```typescript
// src/app/api/v1/wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateServerKey, getWallet } from "@/lib/server-store";

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = await validateServerKey(auth);
    if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const wallet = await getWallet(apiKey.userId);
    return NextResponse.json({ balance: wallet?.balance || 0 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create topup API**

```typescript
// src/app/api/v1/wallet/topup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateServerKey, createBillingRecord, generateId } from "@/lib/server-store";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = await validateServerKey(auth);
    if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const { amount } = await request.json();
    if (!amount || amount < 10000) {
      return NextResponse.json({ error: "Minimum topup Rp 10.000" }, { status: 400 });
    }

    const orderId = `TOPUP-${generateId()}-${Date.now()}`;
    const billing = await createBillingRecord({
      userId: apiKey.userId,
      type: "topup",
      amount,
      midtransOrderId: orderId,
      description: `Topup saldo Rp ${amount.toLocaleString("id-ID")}`,
    });

    // Create Midtrans transaction
    const { createTransaction } = await import("@/lib/midtrans");
    const transaction = await createTransaction(orderId, amount);

    return NextResponse.json({
      billing,
      transaction: { token: transaction.token, redirectUrl: transaction.redirect_url },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update Midtrans webhook to handle topup**

Modify existing webhook to detect `TOPUP-` prefix in order ID and credit wallet.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/wallet/
git commit -m "feat: wallet system with topup via Midtrans"
```

---

### Task 2.3: Multi-Backend Router

**Files:**
- Modify: `src/lib/llm-router.ts`
- Create: `src/lib/aggregator.ts`

- [ ] **Step 1: Create aggregator client**

```typescript
// src/lib/aggregator.ts
export interface AggregatorRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface AggregatorResponse {
  id: string;
  choices: { message: { content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export async function callAggregator(
  baseUrl: string,
  apiKey: string,
  request: AggregatorRequest,
  signal?: AbortSignal
): Promise<AggregatorResponse> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Aggregator error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function streamAggregator(
  baseUrl: string,
  apiKey: string,
  request: AggregatorRequest,
  callbacks: {
    onToken: (token: string) => void;
    onDone: (fullText: string) => void;
    onError: (error: Error) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Aggregator error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") {
        callbacks.onDone(fullText);
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content || "";
        if (token) {
          fullText += token;
          callbacks.onToken(token);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  callbacks.onDone(fullText);
}
```

- [ ] **Step 2: Update llm-router to support multi-backend routing**

Add routing logic that checks user's active plan and routes accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/aggregator.ts src/lib/llm-router.ts
git commit -m "feat: multi-backend router with aggregator support"
```

---

## Phase 3: Plans & Packages

### Task 3.1: Package Purchase API

**Files:**
- Create: `src/app/api/v1/packages/route.ts`
- Create: `src/app/api/v1/packages/activate/route.ts`

- [ ] **Step 1: Create packages list API**

```typescript
// src/app/api/v1/packages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: { type: "package", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ packages: plans });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { validateServerKey, createUserPackage, deductWallet, createBillingRecord, generateId } = await import("@/lib/server-store");
    const apiKey = await validateServerKey(auth);
    if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    const { planId, paymentMethod } = await request.json();
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!plan || plan.type !== "package") {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    if (paymentMethod === "wallet") {
      // Deduct from wallet
      const result = await deductWallet(apiKey.userId, Number(plan.price));
      if (!result) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
      }

      const userPackage = await createUserPackage(apiKey.userId, planId);
      return NextResponse.json({ package: userPackage });
    } else {
      // Direct payment via Midtrans
      const orderId = `PKG-${generateId()}-${Date.now()}`;
      const billing = await createBillingRecord({
        userId: apiKey.userId,
        type: "package_purchase",
        amount: Number(plan.price),
        midtransOrderId: orderId,
        planId,
        description: `${plan.name} - ${plan.billingPeriod}`,
      });

      const { createTransaction } = await import("@/lib/midtrans");
      const transaction = await createTransaction(orderId, Number(plan.price));

      return NextResponse.json({
        billing,
        transaction: { token: transaction.token, redirectUrl: transaction.redirect_url },
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update webhook to handle package activation**

When payment succeeds for `PKG-` order, call `createUserPackage`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/packages/
git commit -m "feat: package purchase API with wallet and Midtrans payment"
```

---

### Task 3.2: Quota Enforcement in Chat Route

**Files:**
- Modify: `src/app/api/v1/chat/completions/route.ts`

- [ ] **Step 1: Add quota check before processing request**

Insert quota check logic at the start of the chat handler:
1. Get user's active package or subscription
2. Check tokens remaining / tokens used
3. Check if model is allowed in plan
4. Return 429 if quota exhausted
5. After request succeeds, decrement quota

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/chat/completions/route.ts
git commit -m "feat: quota enforcement for packages and subscriptions"
```

---

## Phase 4: Model Management

### Task 4.1: Model Management API

**Files:**
- Create: `src/app/api/admin/models/route.ts`

- [ ] **Step 1: Create model management API**

```typescript
// src/app/api/admin/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  return auth === process.env.INTERNAL_API_KEY || auth === process.env.NEXT_PUBLIC_INTERNAL_KEY;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const models = await prisma.appModel.findMany({ orderBy: [{ provider: "asc" }, { name: "asc" }] });
  return NextResponse.json({ models });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isActive, markupPercent, sellPricePer1kPrompt, sellPricePer1kCompletion } = await request.json();

  const model = await prisma.appModel.update({
    where: { id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(markupPercent !== undefined && { markupPercent }),
      ...(sellPricePer1kPrompt !== undefined && { sellPricePer1kPrompt }),
      ...(sellPricePer1kCompletion !== undefined && { sellPricePer1kCompletion }),
    },
  });

  return NextResponse.json({ model });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();

  if (action === "sync_puter") {
    // Fetch models from Puter and upsert
    const { getModels } = await import("@/lib/puter");
    const puterModels = await getModels();
    let synced = 0;
    for (const m of puterModels) {
      await prisma.appModel.upsert({
        where: { modelId: m.id },
        create: {
          modelId: m.id,
          name: m.name || m.id,
          provider: m.provider || "unknown",
          source: "puter",
          category: "chat",
          contextWindow: m.context || 0,
          isActive: false,
        },
        update: { name: m.name || m.id, provider: m.provider || "unknown" },
      });
      synced++;
    }
    return NextResponse.json({ synced, source: "puter" });
  }

  if (action === "bulk_markup") {
    const { percent } = await request.json();
    const models = await prisma.appModel.findMany();
    for (const m of models) {
      if (m.costPer1kPrompt) {
        await prisma.appModel.update({
          where: { id: m.id },
          data: {
            markupPercent: percent,
            sellPricePer1kPrompt: Number(m.costPer1kPrompt) * (1 + percent / 100),
            sellPricePer1kCompletion: m.costPer1kCompletion ? Number(m.costPer1kCompletion) * (1 + percent / 100) : null,
          },
        });
      }
    }
    return NextResponse.json({ updated: models.length, markupPercent: percent });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/models/route.ts
git commit -m "feat: model management API with Puter sync and bulk markup"
```

---

### Task 4.2: Aggregator Config API

**Files:**
- Create: `src/app/api/admin/aggregator/route.ts`

- [ ] **Step 1: Create aggregator config API**

```typescript
// src/app/api/admin/aggregator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  return auth === process.env.INTERNAL_API_KEY || auth === process.env.NEXT_PUBLIC_INTERNAL_KEY;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.aggregatorConfig.findFirst({ where: { isActive: true } });
  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, baseUrl, apiKey } = await request.json();
  const existing = await prisma.aggregatorConfig.findFirst({ where: { isActive: true } });

  // Encrypt API key before storing
  const { encrypt } = await import("@/lib/crypto");
  const apiKeyEnc = await encrypt(apiKey);

  if (existing) {
    const updated = await prisma.aggregatorConfig.update({
      where: { id: existing.id },
      data: { name, baseUrl, apiKeyEnc },
    });
    return NextResponse.json({ config: updated });
  }

  const created = await prisma.aggregatorConfig.create({
    data: { name, baseUrl, apiKeyEnc },
  });
  return NextResponse.json({ config: created });
}
```

- [ ] **Step 2: Create crypto utility**

```typescript
// src/lib/crypto.ts
const ALGORITHM = "AES-GCM";
const KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production";

export async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(KEY.slice(0, 32)), ALGORITHM, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoder.encode(text));
  return Buffer.from([...iv, ...new Uint8Array(encrypted)]).toString("base64");
}

export async function decrypt(encoded: string): Promise<string> {
  const data = Buffer.from(encoded, "base64");
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(KEY.slice(0, 32)), ALGORITHM, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/aggregator/route.ts src/lib/crypto.ts
git commit -m "feat: aggregator config API with encrypted key storage"
```

---

## Phase 5: Superadmin Dashboard

### Task 5.1: Extend Admin Page with New Tabs

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add tabs for Models, Aggregator, Puter Limits**

Add tab navigation to existing admin page:
- Plans (existing)
- Models (new)
- Aggregator (new)
- Puter Limits (new)

- [ ] **Step 2: Implement Models tab**

- Table: model name, provider, source, cost, markup, selling price, status
- Toggle active/inactive per model
- Sync from Puter button
- Bulk markup input

- [ ] **Step 3: Implement Aggregator tab**

- Form: name, base URL, API key
- Test connection button
- Status indicator

- [ ] **Step 4: Implement Puter Limits tab**

- Display current Puter limits
- Input app limits (with validation ≤ Puter limit)
- Warning if exceeds Puter limit

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: superadmin dashboard with models, aggregator, puter limits tabs"
```

---

## Phase 6: Polish & Error Handling

### Task 6.1: Generic Error Messages

**Files:**
- Modify: All API routes

- [ ] **Step 1: Audit all error messages**

Ensure no user-facing error mentions: Puter, backend, aggregator, provider. Replace with generic messages:
- "Layanan sedang sibuk. Coba lagi."
- "Gagal memproses. Tim kami sedang menangani."

- [ ] **Step 2: Commit**

```bash
git add src/app/api/
git commit -m "fix: generic error messages, no backend references"
```

---

### Task 6.2: User Dashboard

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add wallet balance display**

Show current balance in sidebar or header.

- [ ] **Step 2: Add active packages display**

Show active packages with remaining tokens and expiry.

- [ ] **Step 3: Add buy package button**

Link to packages page or inline package selector.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: user dashboard with wallet, packages, and purchase"
```

---

## Commit Strategy

Each task produces a working, testable increment. After each commit:
1. Run `npm run build` to verify no build errors
2. Run `npm run lint` to check for issues
3. Test affected API endpoints manually

## Final Verification

```bash
npm run build
npm run lint
# Test all API endpoints
# Verify admin dashboard works
# Test package purchase flow
# Test subscription flow
# Verify no Puter references in user-facing messages
```
