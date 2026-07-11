# PRD: Hybrid Business Model — AI Gateway

**Date:** [REDACTED-DATE_TIME]
**Status:** Draft — Approved for implementation
**Author:** Kimchi (AI Agent)

---

## 1. Overview

### Problem
Current business model only supports subscription (monthly billing via Puter). Need a flexible dual-track model that supports both subscription and one-time purchase packages, with multi-backend routing (Puter + Aggregator).

### Solution
Implement a hybrid business model:
- **Free Tier** — Powered by Puter free plan (reset monthly, transparent to user)
- **Subscription** — Paid plans via app, app manages Puter account behind the scenes
- **One-Time Packages** — Daily/weekly/monthly packages powered by aggregator API

### Key Principles
1. **Puter is invisible** — User never sees, hears, or knows about Puter
2. **Superadmin controls everything** — Pricing, limits, model selection
3. **Dual backend routing** — Puter for free/subscription, Aggregator for packages
4. **Markup-based pricing** — Superadmin sees cost from backend, sets markup to determine selling price

---

## 2. Data Model

### 2.1 User
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  
  // Puter integration (hidden from user)
  puterUid?: string;
  puterStatus: "pending" | "active" | "failed";
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Plan
```typescript
interface Plan {
  id: string;
  name: string;
  type: "subscription" | "package";
  backend: "puter" | "aggregator";
  billingPeriod: "daily" | "weekly" | "monthly" | "yearly";
  price: number; // IDR
  
  maxTokensPerPeriod: number;
  maxRequestsPerDay: number;
  allowedModels: string[]; // empty = all
  allowedProviders: string[]; // empty = all
  streaming: boolean;
  imageGeneration: boolean;
  apiAccess: boolean;
  priority: "low" | "normal" | "high";
  
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 User Package
```typescript
interface UserPackage {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "depleted";
  tokensRemaining: number;
  tokensTotal: number;
  expiresAt: Date;
  purchasedAt: Date;
  billingId?: string;
}
```

### 2.4 App Model (Models sold in app)
```typescript
interface AppModel {
  id: string;
  modelId: string; // e.g. "gpt-4o"
  name: string;
  provider: string;
  source: "puter" | "aggregator";
  category: "chat" | "reasoning" | "coding" | "fast" | "image";
  contextWindow: number;
  
  // Pricing
  costPer1kPrompt?: number; // cost from aggregator
  costPer1kCompletion?: number;
  markupPercent: number;
  sellPricePer1kPrompt?: number; // selling price
  sellPricePer1kCompletion?: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.5 Aggregator Config
```typescript
interface AggregatorConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnc: string; // encrypted
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.6 Puter Limits
```typescript
interface PuterLimit {
  id: string;
  freeRequestsPerMonth: number;
  freeTokensPerMonth: number;
  appMaxRequestsPerDay: number; // must be ≤ Puter limit
  appMaxTokensPerMonth: number; // must be ≤ Puter limit
  updatedAt: Date;
}
```

---

## 3. Request Flow

### 3.1 Routing Logic

```
User sends request (chat/completions)
    ↓
[1. Auth] → validate API key
    ↓
[2. Plan Check] → check user's active plan:
    - Has active package? → use package
    - Has active subscription? → use subscription
    - Neither? → use free tier (Puter)
    ↓
[3. Quota Check] → check remaining tokens/requests:
    - Package: tokensRemaining > 0?
    - Subscription: tokensUsed < maxTokensPerPeriod?
    - Free: requestsUsed < freeLimit?
    - Quota exhausted? → return 429 + info on available packages
    ↓
[4. Model Check] → check if model is allowed in plan:
    - allowedModels empty = all models allowed
    - Model not allowed? → return 403 + suggest upgrade
    ↓
[5. Route to Backend]
    - plan.backend === "puter" → Puter API (using user's Puter account)
    - plan.backend === "aggregator" → Aggregator API
    ↓
[6. Stream Response] → proxy to user
    ↓
[7. Usage Tracking] → record:
    - Tokens used
    - Decrease quota (package: tokensRemaining--)
    - Log to usage records
```

### 3.2 Fallback Strategy

```
Primary backend fails?
    ↓
[Retry] → try 1 more time
    ↓
Still fails?
    ↓
[Fallback] → try other backend (if plan allows)
    ↓
All fail? → return generic error to user
```

**Note:** Never mention Puter, backend, or aggregator in user-facing messages.

---

## 4. Billing & Purchase Flow

### 4.1 User Registration

```
User registers on app
    ↓
[1. Create App Account] → save user to app DB
    ↓
[2. Auto-Register to Puter] → app creates Puter account behind the scenes
    - Email: generated or from user
    - Password: generated, stored encrypted in DB
    - Puter UID: saved to user record
    - puterStatus: "pending" → "active" on success
    ↓
[3. User Can Use Immediately] → automatically gets Puter Free Plan
    - Quota: based on Puter free tier (resets monthly)
    - User doesn't know about Puter
```

### 4.2 Free Tier Flow

```
User sends request (no package/subscription)
    ↓
[1. Check Puter Free Quota] → app tracks usage internally
    - maxTokensPerMonth: from Puter limits (superadmin sets)
    - maxRequestsPerDay: from Puter limits (superadmin sets)
    ↓
[2. Quota Available?] → route to Puter using user's Puter account
    - Yes → process request
    - No → return 429, suggest buying package/subscription
    ↓
[3. Auto Reset] → every month, free tier quota resets
```

### 4.3 Subscription Flow

```
User selects subscription plan (e.g. "Pro Monthly - Rp 50,000")
    ↓
[1. User Pays to App] → Midtrans transaction
    ↓
[2. Payment Success] → webhook from Midtrans
    ↓
[3. App Upgrades Puter Account] →
    - App logs into Puter using user's account
    - App upgrades to paid plan on Puter
    - OR: app manages quota internally (if Puter doesn't support API upgrade)
    ↓
[4. Activate Subscription] →
    - Create subscription record in DB
    - Set quota per plan (maxTokensPerMonth, etc.)
    - Set expiry date
    ↓
[5. Request Flow] →
    - User sends request
    - App checks subscription active + quota
    - Route to Puter using user's Puter account
    - App decreases internal quota
```

### 4.4 One-Time Package Flow

```
User selects package (e.g. "DeepSeek Daily - Rp 9,900")
    ↓
[1. User Pays to App] → Midtrans or deduct from wallet
    ↓
[2. Activate Package] →
    - Create UserPackage record
    - tokensRemaining = plan.maxTokensPerPeriod
    - expiresAt = now + billingPeriod
    ↓
[3. Request Flow] →
    - User sends request
    - App checks active package + quota
    - Route to Aggregator API (NOT Puter)
    - Decrease tokensRemaining
```

### 4.5 Topup Wallet

```
User selects "Topup Wallet"
    ↓
[1. Select Amount] → input amount (min Rp 10,000)
    ↓
[2. Create Billing] → create billing record in DB
    ↓
[3. Midtrans] → create transaction, return token + redirect URL
    ↓
[4. User Pays] → redirect to Midtrans
    ↓
[5. Webhook] → Midtrans notifies → update billing status
    ↓
[6. Balance Added] → add to user's wallet balance
```

### 4.6 Comparison Table

| Aspect | Free Tier | Subscription | One-Time Package |
|--------|-----------|--------------|------------------|
| Backend | Puter | Puter | Aggregator |
| Billing | Free | Pay to app → app pays Puter | Pay to app → app pays aggregator |
| Quota | Puter free (monthly reset) | App enforces (per period) | App enforces (per package) |
| User knows Puter? | No | No | No |

---

## 5. Error Handling

### 5.1 User-Facing Error Messages

| Scenario | User Sees | Internal Handling |
|----------|-----------|-------------------|
| Quota exhausted | "Quota habis. Beli paket untuk lanjut." | Log: quota depleted |
| Model not allowed | "Model ini tidak tersedia di plan Anda. Upgrade untuk akses." | Log: model not allowed |
| Package expired | "Paket telah berakhir. Beli paket baru." | Auto-expire, revert to free tier |
| Backend error | "Layanan sedang sibuk. Coba lagi." | Retry, log error detail |
| Midtrans failed | "Pembayaran gagal. Coba lagi." | Log: payment failed |
| Insufficient balance | "Saldo tidak cukup. Topup dulu." | Log: insufficient balance |
| Puter registration failed | **No error to user** — see 5.2 | Log: puter_registration_failed |

### 5.2 Puter Registration Failure (Lazy Registration)

```
User registers on app
    ↓
[1. Create App Account] → success, user saved in DB
    ↓
[2. Auto-Register to Puter] → fails!
    ↓
[3. Strategy: Lazy Registration]
    - User does NOT know Puter failed
    - User can still log into app
    - DB flag: puterStatus: "pending"
    ↓
[4. Background Retry]
    - Cron job runs every 5 minutes
    - Checks all users with puterStatus: "pending"
    - Retries Puter registration
    - On success → update puterStatus: "active"
    - On failure → stays pending, retry again
    ↓
[5. User Wants to Use Free Tier?]
    - Check puterStatus
    - If "active" → route to Puter normally
    - If "pending" →:
      - Try Puter registration one more time (sync)
      - If still fails → show: "Layanan sedang sibuk. Coba beberapa saat lagi."
      - User doesn't know about Puter
    ↓
[6. User Buys Package?]
    - Package uses aggregator, NOT Puter
    - Can be used immediately without Puter account
    - Puter registration still retried in background
```

**Why Lazy Registration?**
- User experience not disrupted
- Puter downtime is not a blocker
- User can immediately buy packages (aggregator) without waiting for Puter
- All error messages remain generic, never mentioning Puter

### 5.3 Rate Limiting

```
Free tier:    100 requests/day, 100K tokens/month
Subscription: per plan (e.g. 10K requests/day, 5M tokens/month)
Package:      per plan (e.g. 500 requests/day, 500K tokens/package)
```

---

## 6. Superadmin Dashboard

### 6.1 Model Management (NEW — Priority)
- List all models from:
  - Puter (fetch via Puter API)
  - Aggregator (fetch via aggregator API)
- Superadmin selects which models to sell in app (toggle active/inactive)
- Filter: by provider, by category (chat, reasoning, coding, image)
- Info per model:
  - Name, provider, context window
  - Price from Puter (if available)
  - Price from aggregator (if available)
  - Selling price to user (with markup)
  - Status: active/inactive
- Bulk action: activate/deactivate multiple models
- Search & sort

### 6.2 Plans Management (Extend Existing)
- Tab "Subscription Plans" — CRUD subscription plans
- Tab "Package Plans" — CRUD daily/weekly/monthly packages
- Input: name, price, max tokens, allowed models (from Model Management), allowed providers, duration
- Preview: show market model price vs selling price → auto-calculate margin

### 6.3 Aggregator Config (NEW)
- Setting aggregator base URL
- Setting API key (encrypted)
- Test connection button
- List available models from aggregator

### 6.4 Puter Limits (NEW)
- Display original limits from Puter (free tier limits)
- Superadmin sets app limit (must be ≤ Puter limit)
- Warning if app limit exceeds Puter limit

### 6.5 Pricing Engine (NEW)
- Table of model market prices (from aggregator or manual input)
- Columns: model, provider, cost from aggregator, markup %, selling price
- Bulk update markup (e.g. all models +20%)
- Preview margin per model

### 6.6 User Management (Extend Existing)
- Display: active plan, remaining quota, expiry
- Manual activate/deactivate package
- View usage history

### 6.7 Analytics (Extend Existing)
- Revenue from subscription vs packages
- Cost to aggregator vs Puter
- Profit margin per plan/package
- Top models by usage

---

## 7. Technical Architecture

### 7.1 Stack

```
Frontend:  Next.js 16 + React 19 + Tailwind 4 (existing)
Backend:   Next.js API Routes (existing)
Database:  PostgreSQL (replace JSON file storage)
ORM:       Prisma
Payment:   Midtrans (existing)
Auth:      Custom (app-managed, auto-register to Puter)
```

### 7.2 File Structure (Changes)

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── plans/route.ts        ← extend: support subscription + package
│   │   │   ├── models/route.ts       ← new: model management
│   │   │   ├── aggregator/route.ts   ← new: aggregator config
│   │   │   └── puter-limits/route.ts ← new: puter limits config
│   │   └── v1/
│   │       ├── chat/completions/route.ts ← extend: routing logic
│   │       ├── packages/route.ts     ← new: user buy package
│   │       ├── wallet/route.ts       ← new: topup & check balance
│   │       └── membership/route.ts   ← extend: subscription flow
│   ├── admin/
│   │   └── page.tsx                  ← extend: tabs for models, aggregator, limits
│   └── page.tsx                      ← extend: user dashboard
├── lib/
│   ├── db.ts                         ← new: Prisma client instance
│   ├── puter.ts                      ← extend: auto-register, manage accounts
│   ├── aggregator.ts                 ← new: aggregator API client
│   ├── router.ts                     ← refactor: llm-router → multi-backend router
│   ├── pricing-engine.ts             ← new: calculate price, markup, margin
│   └── wallet.ts                     ← new: balance management
├── prisma/
│   └── schema.prisma                 ← new: database schema
└── types/
    └── index.ts                      ← extend: new types
```

### 7.3 Prisma Schema

```prisma
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
  id              String   @id @default(cuid())
  name            String
  description     String?
  type            String
  backend         String
  billingPeriod   String
  price           Decimal
  maxTokensPerPeriod Int
  maxRequestsPerDay  Int
  allowedModels    String[]
  allowedProviders String[]
  streaming        Boolean  @default(true)
  imageGeneration  Boolean  @default(false)
  apiAccess        Boolean  @default(true)
  priority         String   @default("normal")
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  subscriptions   Subscription[]
  packages        UserPackage[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Subscription {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  planId      String
  plan        Plan      @relation(fields: [planId], references: [id])
  status      String    @default("active")
  tokensUsed  Int       @default(0)
  startDate   DateTime  @default(now())
  endDate     DateTime
  autoRenew   Boolean   @default(false)
  createdAt   DateTime  @default(now())
}

model UserPackage {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  planId          String
  plan            Plan      @relation(fields: [planId], references: [id])
  status          String    @default("active")
  tokensRemaining Int
  tokensTotal     Int
  expiresAt       DateTime
  billingId       String?
  createdAt       DateTime  @default(now())
}

model UsageRecord {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  model             String
  provider          String?
  source            String
  promptTokens      Int      @default(0)
  completionTokens  Int      @default(0)
  totalTokens       Int      @default(0)
  cost              Decimal?
  endpoint          String
  createdAt         DateTime @default(now())
}

model BillingRecord {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  type            String
  amount          Decimal
  status          String   @default("pending")
  midtransOrderId String?  @unique
  midtransToken   String?
  midtransUrl     String?
  planId          String?
  description     String?
  paidAt          DateTime?
  createdAt       DateTime @default(now())
}

model AppModel {
  id                  String   @id @default(cuid())
  modelId             String
  name                String
  provider            String
  source              String
  category            String
  contextWindow       Int      @default(0)
  costPer1kPrompt     Decimal?
  costPer1kCompletion Decimal?
  markupPercent       Decimal  @default(0)
  sellPricePer1kPrompt     Decimal?
  sellPricePer1kCompletion Decimal?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model AggregatorConfig {
  id          String   @id @default(cuid())
  name        String
  baseUrl     String
  apiKeyEnc   String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
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

### 7.4 Migration Path

```
[1] Setup Prisma + PostgreSQL
[2] Create schema, run migration
[3] Migrate data from JSON files → PostgreSQL
[4] Update server-store.ts → Prisma queries
[5] Test existing functionality still works
[6] Continue building new features
```

---

## 8. Implementation Phases

### Phase 1: Database Migration
- Setup Prisma + PostgreSQL
- Migrate existing JSON data to PostgreSQL
- Update all existing API routes to use Prisma
- Verify existing functionality works

### Phase 2: Core Infrastructure
- User registration + auto-register to Puter (lazy registration)
- Wallet system (topup, balance check)
- Multi-backend router (Puter + Aggregator)
- Aggregator config management

### Phase 3: Plans & Packages
- Plan management (subscription + package types)
- One-time package purchase flow
- Subscription flow (app-managed Puter upgrade)
- Quota tracking & enforcement

### Phase 4: Model Management
- Fetch models from Puter + Aggregator
- Superadmin model selection (active/inactive)
- Pricing engine (cost, markup, selling price)

### Phase 5: Superadmin Dashboard
- Model management UI
- Plan management UI (extend existing)
- Aggregator config UI
- Puter limits UI
- Analytics (revenue, cost, margin)

### Phase 6: Error Handling & Polish
- Lazy registration retry mechanism
- Fallback routing
- Rate limiting
- User-facing error messages (generic, no Puter references)

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| User registration → Puter success rate | > 95% |
| Package purchase completion rate | > 90% |
| Request success rate | > 99% |
| Average response time | < 3s |
| Profit margin (packages) | > 30% |
| Monthly revenue growth | > 20% |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Puter API downtime | Free tier unavailable | Lazy registration + package fallback |
| Aggregator API downtime | Packages unavailable | Retry + fallback to Puter |
| Puter free tier limit changes | Free tier quota changes | Superadmin can adjust app limits |
| Midtrans webhook failures | Payment not confirmed | Manual verify + retry mechanism |
| Double purchase | User buys same package twice | Allow stacking (quota adds up) |
