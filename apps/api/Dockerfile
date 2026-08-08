# syntax=docker/dockerfile:1

# ===== builder =====
FROM node:24-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

# Copy manifests first (cache layer for deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/

# `prisma generate` resolves DATABASE_URL from prisma.config.ts (no DB connection at build time).
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/feya?schema=public

# Build shared, generate + build the Prisma package, then build api.
RUN pnpm --filter @feya/shared build && \
    pnpm --filter @feya/db build && \
    pnpm --filter @feya/api build

# ===== runner =====
FROM node:24-bookworm-slim AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Re-install only prod deps (includes @prisma/adapter-pg + pg via @feya/db; Prisma 7 needs no engine binary).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
