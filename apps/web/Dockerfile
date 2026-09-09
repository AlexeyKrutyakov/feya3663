# syntax=docker/dockerfile:1

# ===== builder =====
FROM node:24-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /app

# Copy manifests first (cache layer for deps); db manifest is required by the lockfile.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source and build shared first (web typecheck/build resolves @feya/shared dist).
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# NEXT_OUTPUT=standalone enables `output: 'standalone'` (symlinks are fine in Linux).
# NEXT_PUBLIC_* vars are inlined at build time — pass the target API URL via
# --build-arg NEXT_PUBLIC_API_URL=https://api.example.com when deploying.
ENV NEXT_OUTPUT=standalone
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @feya/shared build && \
    pnpm --filter @feya/web build

# ===== runner =====
# `output: 'standalone'` traces only the needed node_modules into .next/standalone.
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
