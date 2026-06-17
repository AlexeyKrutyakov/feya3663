# 09 — Фаза 0: каркас монорепо (рабочий план и прогресс)

> **Живой документ.** Отмечаем прогресс прямо здесь (чек-боксы) — план переживает сессии.
> Ветка: `chore/monorepo-bootstrap` · PR в `main` (squash-merge). Статус: 🟡 в работе.
> Связано: `04-roadmap.md` (Фаза 0), `07-tasks-phase-0-1.md` (декомпозиция), `03-architecture.md` (ADR-001/005).

## Контекст

Планирование MVP завершено, стек зафиксирован (ADR-001), блокеры по MIS сняты (D24/D25).
Кода ещё не было — только `docs/`, `CLAUDE.md`, `.gitignore`, `tmp/`. Цель Фазы 0 — запускаемый
локально и в Docker каркас (api + web + БД + Redis), зелёный CI и заготовка сборки образов,
чтобы дальше начать Фазу 1 (интеграция MIS) на готовой основе.

**Объём этого PR (согласовано):** вся Фаза 0 (0.1–0.7) в одной ветке.
**apps/web:** минимальный (Next.js + Tailwind, без R3F; 3D-фея — позже, в UI-фазе лендинга).

## Окружение (проверено 2026-06-17)

Node 23.3.0 (локально) · pnpm 9.4.0 (corepack) · npm 11 · Docker 29 + Compose v5 · git 2.54.

## Принятые решения по реализации

- **Корень монорепо = корень git-репозитория** (`D:\programming\feya3663`). В `docs/07` структура
  показана как `feya/…` — это и есть наш корень; отдельной вложенной папки не создаём.
- **Node для Docker/CI — 22 LTS** (воспроизводимость): `.nvmrc`=`22`, базовый образ
  `node:22-bookworm-slim`, в CI `node-version: 22`. Локально Node 23 совместим.
- **pnpm** через corepack, пин `packageManager: "pnpm@9.4.0"` в корневом `package.json`.
- **husky/commitlint (0.1 опц.) — пропускаем** (коммитим через `/commit`); вернёмся при необходимости.
- **Тесты:** Vitest (unit) — по одному smoke-тесту в api/web/shared. Playwright (e2e) — позже, в UI-фазе.
- **Prisma:** прикладных моделей не добавляем (они в Фазе 1.1). Первая миграция — baseline без таблиц;
  `GET /health` проверяет БД через `prisma.$queryRaw` SELECT 1.
- **Перед скаффолдингом** свериться с актуальными версиями Next.js/NestJS/Prisma/Tailwind через
  Context7 (Next.js 15 + Tailwind v4, NestJS 11, Prisma 6 — конфиги изменились между мажорами).

## Целевая структура (корень репозитория)

```
package.json            # pnpm workspaces + scripts + packageManager
pnpm-workspace.yaml     # apps/*, packages/*
turbo.json              # build/lint/test/typecheck/dev
tsconfig.base.json      # strict; общие compilerOptions
.eslintrc.cjs / .prettierrc / .editorconfig / .nvmrc
docker-compose.yml      # postgres + redis (+ тома)
.env.example
.github/workflows/ci.yml
apps/
  api/                  # NestJS + Prisma + Swagger + Dockerfile
  web/                  # Next.js (App Router) + Tailwind + Dockerfile
packages/
  shared/               # @feya/shared: Zod-схемы (env, общие DTO/типы), сборка tsup
```

## Прогресс по шагам

### 0.1 Каркас и инструменты ✅
- [x] Корневой `package.json` (private, `packageManager: pnpm@9.4.0`, скрипты-обёртки над `turbo`).
- [x] `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` (build/lint/test/typecheck/dev).
- [x] `tsconfig.base.json` — `strict: true`, базовые `compilerOptions`/paths.
- [x] Общий ESLint (`@typescript-eslint`) + Prettier + `.editorconfig` + `.nvmrc`.
- **DoD:** `pnpm install` и `pnpm turbo run lint typecheck` проходят. ✅
- _Версии (2026-06-17): turbo 2.9.18, TS 6.0.3, ESLint 10.5.0, typescript-eslint 8.61.1, prettier 3.8.4._

### 0.2 packages/shared (`@feya/shared`) ✅
- [x] Пакет с `tsup` (ESM+CJS, d.ts). Экспорт: Zod-схема env (`apiEnvSchema`) + пример общего DTO/типа.
- [x] Smoke-тест (Vitest) на схему env.
- **DoD:** и `api`, и `web` импортируют тип/схему из `@feya/shared`. ✅ (проверяется в 0.3/0.4)
- _Версии (2026-06-17): Zod 4.4.3, tsup 8.5.1, Vitest 4.1.9, TS понижен до 5.9.3 (TS6 несовместим с tsup DTS)._

### 0.3 apps/api (NestJS + Prisma)
- [ ] Каркас Nest; `AppModule`, `HealthModule`.
- [ ] `ConfigModule` с валидацией env через Zod из `@feya/shared`.
- [ ] Prisma: `prisma init` (PostgreSQL через `DATABASE_URL`), baseline-миграция без моделей.
- [ ] `GET /health` — статус + проверка БД (`$queryRaw SELECT 1`).
- [ ] Swagger на `/docs` (`@nestjs/swagger`).
- [ ] `Dockerfile` (multi-stage, `node:22-bookworm-slim`; `prisma generate` на build).
- **DoD:** `/health` отвечает локально и в Docker; `/docs` открывается.

### 0.4 apps/web (Next.js, минимальный)
- [ ] `create-next-app` (App Router, TS, Tailwind, ESLint).
- [ ] Базовый layout + тема Tailwind + страница-заглушка; обёртка fetch-клиента (`NEXT_PUBLIC_API_URL`).
- [ ] `next.config` `output: 'standalone'`; `Dockerfile` (multi-stage, standalone).
- **DoD:** стартовая страница рендерится локально и в Docker.

### 0.5 Локальная инфраструктура
- [ ] `docker-compose.yml`: `postgres:16` + `redis:7` (тома, healthchecks, проброс портов).
- [ ] `.env.example` (DB URL, REDIS_URL, PORT, NEXT_PUBLIC_API_URL — **без секретов**).
- **DoD:** `docker compose up` поднимает БД+Redis; `api` подключается, миграция применяется.

### 0.6 CI (GitHub Actions) — `.github/workflows/ci.yml`
- [ ] `pnpm/action-setup` + `actions/setup-node@v4` (Node 22, кэш pnpm-store).
- [ ] `install` → `turbo run lint typecheck test build`.
- [ ] Триггеры: `pull_request`→main и `push`→main.
- **DoD:** CI зелёный на стартовом PR.

### 0.7 Заготовка деплоя (ADR-005)
- [ ] На `push`→main: сборка Docker-образов `api`/`web` и пуш в **GHCR** (`packages: write`).
- [ ] Документировать требуемые секреты (DB, registry) — значения позже.
- **DoD:** образы собираются в CI (реальный деплой на VPS — Фаза 7).

### Завершение
- [ ] Отметить выполненные пункты в `docs/07-tasks-phase-0-1.md` и обновить «Текущий фокус» в `docs/00-README.md`.
- [ ] Push ветки → PR в `main` → зелёный CI → squash-merge.

## Verification (end-to-end)

1. `pnpm install` — без ошибок.
2. `pnpm turbo run lint typecheck` — зелено на всех пакетах.
3. `pnpm turbo run test` — smoke-тесты проходят.
4. `docker compose up -d` → миграция api → `curl http://localhost:<port>/health` = ok; `/docs` открывается.
5. `pnpm --filter @feya/web dev` → стартовая страница рендерится; fetch-клиент видит API.
6. `docker build` для `apps/api` и `apps/web` проходит локально.
7. PR открыт → зелёный CI (lint/typecheck/test/build).

## Git-процесс (по `docs/08`)

Коммиты через `/commit`, Conventional Commits, одна короткая строка, EN, без трейлеров-генераторов.
Дробление по смыслу, например: `chore: bootstrap pnpm/turbo monorepo`, `feat(shared): zod env schema`,
`feat(api): nest health + prisma`, `feat(web): next tailwind scaffold`, `ci: github actions pipeline`.

## Как продолжить в новой сессии

1. Прочитать «Текущий фокус» в `docs/00-README.md` → этот файл (`09`).
2. Перейти на ветку `chore/monorepo-bootstrap` (или создать от `main`, если PR уже слит).
3. Найти первый незакрытый чек-бокс выше — продолжить оттуда. Перед скаффолдингом фреймворков
   свериться с версиями через Context7.
4. По мере выполнения — отмечать чек-боксы здесь и в `docs/07`.

## Замечания / риски

- Windows-хост: `create-next-app`/Nest-каркас интерактивны — запускать неинтерактивно
  (`--skip-git`, флаги пресетов), не плодить вложенный git.
- Node 23 локально vs 22 в CI/Docker — единый пин (`.nvmrc`=22) во избежание расхождений сборки.
- GHCR-пуш требует `permissions: packages: write` в job-е.
- Pre-existing незакоммиченная правка `CLAUDE.md` (форматирование заголовков + строка про
  планирование) — не часть bootstrap; решить отдельно, в bootstrap-коммиты не подмешивать.
