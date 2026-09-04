<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Business model

Product: AI chat gateway. Users get an API key and pay per usage. Billing model: **prepaid token packages (token plan) preferred, pay-as-you-go (PAYG) fallback**. No recurring subscription.

## Billing rules

- **Wallet** (`Wallet` model): prepaid IDR balance. Top-up via `/wallet` → `/api/wallet/balance`.
- **Token plan** (`Plan` model): catalog in `/admin/plans`, read via `/api/plans`. Key limit field: `maxTokensPerPeriod` (mapped as `maxTokensPerMonth`). Display features come from the free-text `highlights` list plus a `billingPeriod` label, not derived from the quota/access flags.
- **Purchase** (`/api/packages/purchase`): user picks a plan, price deducted from wallet, creates a `UserPackage` with `tokensTotal`/`tokensRemaining` = `maxTokensPerPeriod`, default 30-day expiry (`expiresAt`).
- **Consumption priority** (`src/lib/db/quota.ts` → `holdBalanceOrTokens`):
  1. If user has an active `UserPackage` (`tokensRemaining > 0`), reserve and draw tokens from it first (discounted `tokenPlan*` pricing).
  2. Else fall back to **PAYG**: reserve cost estimate from wallet balance (uses `payg*` pricing). Insufficient balance → request rejected with top-up prompt.
  3. `settleUsage` refunds/surcharges the difference after the actual token counts are known.
- **Subscriptions** (`Subscription` model): removed from the business model. Not part of billing flow. Leftover references in code are legacy — do not build on them; do not create new `Subscription` writes.

## Models of note

- `User`: roles `user` | `superadmin`; status `active` | `suspended` | `banned`.
- `ApiKey`: user's key for gateway calls. New keys store `keyHash`; legacy plaintext `key` values remain supported for migration. Never expose secrets from list/update endpoints; return the plaintext secret only once after create/regenerate.
- `UserPackage`: prepaid token balance (`tokensRemaining`). `status`: `active` | `expired` | `depleted`. A user may hold several.
- `AppModel`: per-model pricing — `costPer1k*`, `sellPricePer1k*` (PAYG) and `tokenPlanPricePer1k*` (package), fractional IDR per 1K tokens (`Decimal(18,6)`). `sortOrder` controls display order in the admin list.
- `AggregatorConfig`: has a `sortOrder` field for admin ordering (same as `AppModel`).

## Agent API contract

- Main endpoint: `POST /api/v1/chat/completions`; compatible with OpenAI Chat Completions clients.
- Authentication accepts `Authorization: Bearer <API_KEY>` and `x-api-key: <API_KEY>`.
- Model discovery: `GET /api/v1/models`; apply the same authentication headers.
- Supported agent features: `stream`, `tools`, `tool_choice`, `response_format`, `parallel_tool_calls`, `top_p`, `stop`, `seed`, `user`, and `metadata`.
- Streaming uses SSE. Preserve provider `tool_calls` events; do not parse only text content when changing the stream proxy.
- Public API traffic is rate-limited in memory per API key/user and client IP. This is suitable for a single instance only; use a shared store before multi-instance deployment.
- CORS responses must allow `Authorization` and `X-API-Key` for browser-based agent clients.
- After successful usage, update both `UsageRecord` and API key usage counters (`usageCount`, `totalTokens`, `lastUsed`).

## Security rules

- API key secrets must be generated with cryptographically secure randomness and hashed before persistence.
- Do not add new plaintext API key writes or return stored secrets from list/admin/login responses.
- When changing API key authentication, update all API-key-protected routes consistently, including wallet, billing, package purchase, and model routes.

## Conventions

- `AppModel` prices are fractional IDR per 1K tokens (`Decimal(18,6)`); `calcSellPrice` in `src/lib/pricing-engine.ts` rounds to 6 decimals (not `Math.ceil` to whole rupiah). Keep the admin editor's local `calcSell` mirror in sync.
- Public pages render model prices per 1M tokens (`price × 1000`); the admin pricing editor stays per 1K tokens.
- New feature schema → add Prisma migration (`npx prisma db push --accept-data-loss` for dev), then `npx prisma generate`.
- Dev server must be (re)started after `prisma generate` or `/api/*` route registration can go stale.
- Do not add `priority` or `apiAccess` fields to `Plan` — they were removed; they are display-only/no-op concepts.
