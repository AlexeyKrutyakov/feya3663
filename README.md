# feya3663

Веб-приложение для частной стоматологии **ИП Родионова Ю.В.**: удобный интерфейс поверх МИС Arnica Dental (SQNS/denta) — просмотр расписания, управление записями.

Стек: **Next.js 15** (web) · **NestJS 11** (api) · **PostgreSQL 16** · **Redis 7** · **pnpm + Turborepo** · **TypeScript 6**

---

## Требования

| Инструмент | Версия |
|-----------|--------|
| Node.js   | 22 LTS (`.nvmrc`) |
| pnpm      | 9.4.0 (`corepack`) |
| Docker + Compose | 29 / v5 |

```bash
# активировать pnpm через corepack (один раз)
corepack enable
```

---

## Быстрый старт

```bash
git clone https://github.com/AlexeyKrutyakov/feya3663.git
cd feya3663

pnpm install

cp .env.example .env   # заполнить значения
```

---

## Переменные окружения

Скопировать `.env.example` → `.env` и заполнить:

```bash
cp .env.example .env
```

> Файл `.env` в git не попадает. Секреты (ApiKey MIS, пароли БД) — только локально и в GitHub Actions Secrets.

---

## Локальная разработка

### Инфраструктура (PostgreSQL + Redis)

```bash
docker compose up -d
```

### Запуск всех сервисов

```bash
pnpm dev          # turbo run dev (api + web параллельно)
```

По умолчанию:
- **api** → `http://localhost:3001`
- **web** → `http://localhost:3000`
- **Swagger** → `http://localhost:3001/docs`

### Запуск по отдельности

```bash
pnpm --filter @feya/api dev
pnpm --filter @feya/web dev
```

---

## Команды

```bash
pnpm build          # сборка всех пакетов (turbo, с кэшем)
pnpm lint           # ESLint по всему монорепо
pnpm typecheck      # tsc --noEmit по всем пакетам
pnpm test           # Vitest (unit)
pnpm format         # Prettier (запись)
pnpm format:check   # Prettier (проверка)
```

---

## Миграции БД

```bash
pnpm --filter @feya/api exec prisma migrate dev    # создать и применить миграцию
pnpm --filter @feya/api exec prisma migrate deploy  # применить в prod
pnpm --filter @feya/api exec prisma studio          # GUI
```

---

## Docker (сборка образов)

```bash
# api
docker build -f apps/api/Dockerfile -t feya-api .

# web
docker build -f apps/web/Dockerfile -t feya-web .
```

Образы собираются в CI и пушатся в GHCR при мерже в `main`.

---

## Структура репозитория

```
apps/
  api/          # NestJS — REST API, интеграция MIS, Prisma
  web/          # Next.js — App Router, Tailwind
packages/
  shared/       # @feya/shared — Zod-схемы, общие DTO/типы
docs/           # Планировочные документы, ADR, задачи фаз
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- триггер: `pull_request` → `main`, `push` → `main`
- шаги: `install` → `lint` → `typecheck` → `test` → `build`
- при мерже в `main`: сборка и пуш Docker-образов в GHCR

---

## Документация

| Файл | Содержание |
|------|-----------|
| `docs/00-README.md` | Навигация по документам, текущий фокус |
| `docs/03-architecture.md` | Архитектура и ADR |
| `docs/04-roadmap.md` | Фазы и план |
| `docs/06-mis-api-reference.md` | API МИС (Arnica/SQNS) |
| `docs/09-phase-0-bootstrap.md` | Прогресс Фазы 0 |
