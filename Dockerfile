# ============================================================
# Xperimne AI Gateway — Dockerfile (Production-Optimized)
# Next.js 16 (standalone output) + Prisma 7 (pg driver adapter)
#
# Stages:
#   deps    → install production dependencies only
#   builder → prisma generate + next build (output standalone)
#   runner  → standalone server + static assets + prisma CLI
# ============================================================

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Env `NEXT_PUBLIC_*` yang wajib di-inline saat build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_INTERNAL_KEY
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_INTERNAL_KEY=${NEXT_PUBLIC_INTERNAL_KEY}
# Copy deps (production) then install dev deps for build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate && npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
# Prisma CLI di runtime butuh openssl untuk generate engine
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3035
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Prisma CLI + client (dari builder) dan config prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Static assets (public/) + standalone server + next static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Healthcheck berbasis Node.js (lebih portabel dari wget)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3035/api/health',res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1))"

USER nextjs
EXPOSE 3035
CMD ["node", "server.js"]