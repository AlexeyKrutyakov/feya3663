# syntax=docker/dockerfile:1

# ===== builder =====
FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

# Copy manifests first (cache layer for deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Build shared, generate Prisma client, build api
RUN pnpm --filter @feya/shared build && \
    pnpm --filter @feya/api exec prisma generate && \
    pnpm --filter @feya/api build

# ===== runner =====
FROM node:22-bookworm-slim AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Re-install only prod deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy generated Prisma client (built in builder stage)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
