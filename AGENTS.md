# AGENTS.md

Workspace guide for ZCode agents. Concise and project-specific — for full
context read the docs in `docs/` (Russian) and `CLAUDE.md`.

## What this is

B2C web app for a private dental practice (**ИП Родионова Ю.В.**): a friendly
UI over the Arnica Dental MIS (SQNS/denta) — patients/doctors browse schedule;
admins manage appointments with write-back to MIS via API.

Stack: Next.js 15 (web) · NestJS 11 (api) · PostgreSQL 16 · Redis 7 ·
pnpm 9 + Turborepo · full TypeScript 5.9. Hosting: Beget (RU), Docker/Ubuntu,
GitHub Actions. See `docs/03-architecture.md` (ADR-001) for rationale.

## Session entry point

1. `docs/00-README.md` — "Текущий фокус / следующий шаг" (current focus).
2. `docs/05-open-questions.md` — decisions journal (D1–D27) + open questions.
   **Fastest way to get context.**
3. Then the relevant `docs/` file (brief, requirements, architecture, roadmap,
   MIS API reference, phase tasks, git workflow).

## Repository layout

```
apps/
  api/   # @feya/api  — NestJS REST API, Prisma, Swagger (/docs)
  web/   # @feya/web  — Next.js App Router + Tailwind (NOT scaffolded yet)
packages/
  shared/  # @feya/shared — Zod schemas + shared DTOs/types (tsup, dual ESM/CJS)
  db/      # @feya/db    — Prisma 7 client + createPgAdapter() factory
docs/      # Planning docs, ADR, phase tasks (in Russian)
```

## Commands

Root (run via Turborepo, cached):

```bash
pnpm install            # corepack-managed pnpm@9.4.0 (Node 22, .nvmrc)
pnpm dev                # turbo run dev — api :3001, web :3000, Swagger :3001/docs
pnpm build              # build all packages (dependsOn ^build)
pnpm lint               # ESLint flat config (eslint.config.mjs)
pnpm typecheck          # tsc --noEmit across packages
pnpm test               # vitest run (unit)
pnpm format             # prettier --write .
pnpm format:check
```

Per-package (filter):

```bash
pnpm --filter @feya/api dev
pnpm --filter @feya/shared test
```

Database (Prisma lives in **`@feya/db`**, not `@feya/api` — README commands are
stale on this):

```bash
pnpm --filter @feya/db db:generate   # prisma generate
pnpm --filter @feya/db db:migrate     # prisma migrate dev  (interactive)
pnpm --filter @feya/db db:deploy      # prisma migrate deploy (prod)
```

## Architecture boundaries & layer rules

- **`@feya/shared`** is the only package both `web` and `api` import. Put
  cross-cutting DTOs, Zod schemas, and shared types here. Built with `tsup`
  (dual ESM/CJS); consumers use the built `dist/`, not source.
- **`@feya/db`** owns Prisma. It exports `PrismaClient`, `Prisma` (types), and
  `createPgAdapter(connectionString)`. `apps/api` consumes it — do **not**
  re-declare a Prisma client or `schema.prisma` inside `apps/api`.
- **`apps/api`** wires `PrismaService` via `createPgAdapter(DATABASE_URL)` and
  injects `@feya/shared` types. Never reach into `packages/db/src/generated`
  directly from `api`; import from `@feya/db`.
- Config: `tsconfig.base.json` is strict, with `noUncheckedIndexedAccess: true`
  — indexed access returns `T | undefined`. Account for it in new code.

## Conventions

- **Language:** docs (incl. `CLAUDE.md`, `docs/`) are **Russian**; code,
  identifiers, comments, commits are **English**.
- **Commits:** use the `/commit` skill → Conventional Commits. Default is a
  single short subject line, no body. Type/scope examples from history:
  `feat(api):`, `feat(shared):`, `refactor(db):`, `fix(lint):`, `chore:`,
  `docs:`.
- **No AI attribution:** never add `Co-Authored-By`, `🤖 Generated with…`,
  "Сгенерировано при помощи…" or similar trailers to commits, PR bodies, or
  comments.
- **Git flow:** branches `<type>/<slug>`; one session = one branch = one PR;
  **squash-merge into `main`**. Never commit directly to `main`.
- **Lint:** unused vars must be prefixed `_` (`argsIgnorePattern: '^_'`).
  `*.prisma` and `**/src/generated/**` are ESLint-ignored.
- **Formatting:** Prettier (`.prettierrc`, `.prettierignore`); `.editorconfig`
  present.

## Session & chat discipline

- **One chat = one task = one branch = one PR.** Start a fresh chat per task and
  name it after the branch slug (e.g. `feat/mis-visit-sync`). This matches the git
  flow above and keeps context clean.
- **Persistent state lives in `docs/`, not chats.** Progress checkboxes
  (`docs/10-phase-0-bootstrap.md`, `docs/07-tasks-phase-0-1.md`), the "Текущий фокус"
  block in `docs/00-README.md`, and decisions in `docs/05-open-questions.md` are the
  source of truth across sessions. Every new chat reads these on entry (per the
  session entry point above) — a new chat is cheap because state is externalized.
- **Continue a chat only for the same task/branch** (e.g. addressing PR review
  comments). For a new task, start a new chat and a new branch from fresh `main`.
  Do not keep a single "eternal" chat — it pollutes context and loses early details
  to summarization.
- **Before closing a chat, persist any decision made only in it.** If a decision,
  rationale, or design note isn't yet in `docs/05` (decisions) or `docs/07`/`docs/09`
  (progress), write it there first. A decision not in `docs/` effectively doesn't
  exist for the next session.
- **Chats are disposable after merge.** Once the branch is squash-merged and the
  progress checkboxes + "Текущий фокус" are updated, the chat holds no unique
  information — close/delete it. Keep chats only for branches with an open PR still
  being worked.

## Gotchas

- **Prisma 7 driver-adapter pattern (D27).** Schema uses the `prisma-client`
  generator (not `prisma-client-js`), `moduleFormat = "cjs"`, output to
  `packages/db/src/generated/prisma`. `PrismaClient` **must** be constructed
  with `{ adapter: createPgAdapter(DATABASE_URL) }` — there is no embedded
  datasource URL. `DATABASE_URL` is required at runtime/config time and is a
  Turborepo `globalEnv`.
- **Generated client is build output.** `**/src/generated/` is gitignored and
  never edited by hand — regenerated by `db:generate` / `build`. Same for
  `dist/`, `.next/`, `.turbo/`, `*.tsbuildinfo`.
- **README is partly aspirational.** No `.env.example`, `docker-compose.yml`,
  or `apps/web` exist yet — references in `README.md` describe target state.
  If you need Postgres/Redis locally, they are not wired up; check current
  state before relying on `docker compose up -d`.
- **Secrets never go in git.** MIS `ApiKey`, DB passwords, the
  `feya3663@yandex.ru` password — only in local `.env` (gitignored) and
  GitHub Actions Secrets. Clinic credentials / support drafts live in `tmp/`
  (gitignored). `docs/` and commits must stay secret-free.
- **Where secrets live (split by scope):**
  - **App secrets** (`DATABASE_URL`, `REDIS_URL`, MIS `ApiKey`, SMTP tokens,
    JWT secrets) — local `.env` at the repo root, gitignored. Runtime code reads
    them via `process.env.*` (validated by the Zod schema in `@feya/shared`).
    In CI, the same names come from GitHub Actions Secrets. Never hardcode.
  - **ZCode tool secrets** (MCP server API keys like `context7`, third-party
    integration tokens) — `~/.zcode/cli/config.json` under
    `mcp.servers.<name>.headers`, **not** in `.env`. `.env` feeds the app
    runtime; ZCode's MCP layer is separate and reads its own config. Workspace
    `.zcode/config.json` stays secret-free (`mcp.servers: {}`) — anything with a
    key goes to the user-scope file so it never risks a commit.

## Read before touching sensitive areas

- MIS integration / `ApiKey` / webhooks → `docs/06-mis-api-reference.md`,
  `docs/06a-sqns-support-2026-06.md` (no test sandbox — test against live API;
  webhooks have no retries/signature → pull-reconciliation via `modificate` is
  mandatory; clinic TZ GMT+3; notifications via Max not SMS, D26).
- Architecture / stack choices → `docs/03-architecture.md` (ADR-001), D27 in
  `docs/05-open-questions.md` (Prisma 7).
- Git/PR process → `docs/08-git-workflow.md`.
