# ============================================================
# Xperimne AI Gateway — Dockerfile
# Next.js 16 (standalone output) + Prisma 7 (pg driver adapter)
#
# Stages:
#   deps    → install full node_modules (termasuk prisma CLI, dipakai generate & manual)
#   builder → prisma generate + next build (output standalone)
#   runner  → standalone server + static assets + prisma CLI (untuk `npx prisma *` manual)
# ============================================================

# ---------- deps ----------
FROM node:22-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# Env `NEXT_PUBLIC_*` yang wajib di-inline saat build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_INTERNAL_KEY
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_INTERNAL_KEY=${NEXT_PUBLIC_INTERNAL_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3035
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Prisma CLI (untuk manajemen prisma manual via `docker exec -it rdai-app sh`)
# Salin node_modules LENGKAP dari builder: menyertakan prisma CLI + semua
# dependensi transitifnya (effect, c12, dst) sehingga `npx prisma *` pasti jalan.
# Menyalin selektif terbukti bocor dependensi transitif (MODULE_NOT_FOUND).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Static assets (public/, .next/static) + standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3035
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3035/api/health || exit 1
CMD ["node", "server.js"]
