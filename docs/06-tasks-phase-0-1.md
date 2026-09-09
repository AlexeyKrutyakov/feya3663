# 06 — Детализация Фаз 0–1

> Рабочая декомпозиция до конкретных задач. Имена/код — EN. Статус: 🟡 черновик
> Связано с: `05-roadmap.md` (Фазы 0, 1), `04-architecture.md` (ADR-001, 002, 005), `10-mis-api-reference.md`.
>
> ⚠️ **Гранула работы (обновлено 2026-08-08):** фазы здесь — это **группировка для планирования**, а не единица PR. Каждая задача (напр. 0.4 web, 0.5 docker-compose, 0.6 CI) идёт **отдельной веткой и PR**. См. `07-git-workflow.md` («единица = фича/задача, не фаза»).

## Целевая структура монорепо

```
feya/                         # корень, git-репозиторий
├── package.json              # pnpm workspaces, скрипты
├── pnpm-workspace.yaml
├── turbo.json                # пайплайны build/lint/test/typecheck
├── tsconfig.base.json
├── .eslintrc / .prettierrc / .editorconfig / .gitignore
├── docker-compose.yml        # локально: postgres, redis
├── .github/workflows/ci.yml
├── apps/
│   ├── api/                  # NestJS + Prisma
│   └── web/                  # Next.js + Tailwind + R3F
└── packages/
    └── shared/               # Zod-схемы и типы (DTO, модели MIS)
```

---

## Фаза 0 — Фундамент

### 0.1 Репозиторий и инструменты ✅ (PR #10, main)
- [x] `pnpm init`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`.
- [x] `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), общий ESLint (flat config) + Prettier, `.editorconfig`, `.gitignore`.
- [x] (Опц.) `commitlint` + `husky` — пропущено (коммитим через `/commit`).
- **DoD:** `pnpm install` и `pnpm turbo run lint typecheck` проходят. ✅
- _Версии: turbo 2.9.18, TS 5.9.3, ESLint 9.x flat config._

### 0.2 packages/shared (`@feya/shared`) ✅ (PR #10, main)
- [x] Пакет `@feya/shared`: сборка `tsup` (ESM+CJS, d.ts); Zod-схема env (`apiEnvSchema`).
- [x] Smoke-тест (Vitest) на схему env; общий тип импортируется из `api` (web — в 0.4).
- **DoD:** `api` импортирует тип/схему из `@feya/shared`. ✅ (web — после 0.4)
- _Версии: Zod 4.4.3, tsup 8.5.1._

### 0.3 apps/api (NestJS + Prisma) ✅ (PR #10, main)
- [x] Каркас Nest (`AppModule`, `HealthModule`).
- [x] `ConfigModule` с валидацией env через Zod из `@feya/shared`.
- [x] Prisma вынесена в `@feya/db` (D27): `prisma-client` generator + `createPgAdapter()`; миграция baseline.
- [x] `GET /health` — статус + проверка БД (`$queryRaw SELECT 1`).
- [x] Swagger на `/docs` (`@nestjs/swagger`).
- [x] `Dockerfile` (multi-stage, `node:24-bookworm-slim`; собирает `@feya/db` перед api).
- **DoD:** typecheck + build зелёные ✅; runtime (живая БД) — проверяется в 0.5.
- _Версии: NestJS 11.1.27, Prisma 7.8.0 (в `@feya/db`). Node 24 LTS._

### 0.4 apps/web (Next.js) ✅ (2026-09-09)
- [x] `create-next-app` (App Router, TS, Tailwind) в `apps/web`.
- [x] Базовый layout, тема Tailwind, страница-заглушка.
- [x] Конфиг env (публичные переменные), клиент API (fetch-обёртка).
- [x] `Dockerfile`.
- **DoD:** стартовая страница рендерится локально и в Docker. ✅ (dev-сервер + контейнер,
  `output: 'standalone'` через `NEXT_OUTPUT=standalone` — обход EPERM-symlink на Windows).

### 0.5 Локальная инфраструктура ✅ (2026-09-09)
- [x] `docker-compose.yml`: `postgres`, `redis` с томами; `.env.example`.
- **DoD:** `docker compose up` поднимает БД и Redis; `api` подключается.

### 0.6 CI (GitHub Actions)
- [ ] `ci.yml`: setup pnpm + кэш, `install`, `lint`, `typecheck`, `test`, `build` (через Turbo).
- [ ] Запуск на PR и в основную ветку.
- **DoD:** CI зелёный на стартовом коммите.

### 0.7 Заготовка деплоя (ADR-005)
- [ ] Сборка Docker-образов `api`/`web` в CI; пуш в реестр (GHCR).
- [ ] Документировать секреты (DB, registry) — заполнить позже.
- **DoD:** образы собираются в CI (деплой на VPS — в Фазе 7).

---

## Фаза 1 — Интеграция MIS: чтение
_Доступ получен (D24): `ApiKey` выдан, разблокировано. Тестового стенда нет — разработка на боевом API через Swagger. Вебхуки ненадёжны → reconciliation как основа (D25)._

### 1.1 Модель данных (Prisma)
- [ ] `MisResource`, `MisService`, `Appointment`, `WebhookEvent` (+ enum статусов из `attendance`: `-1 cancel / 0 new / 1 showedUp / 2 confirmed`).
- [ ] Индексы: `Appointment.misVisitId` (уникальный), `resourceId`, `datetime`.
- [ ] Миграция.
- **DoD:** миграция применяется; схема отражает `10-mis-api-reference.md`.

### 1.2 MIS-клиент (модуль `MisModule`)
- [ ] Конфиг (секреты в `.env`): `MIS_BASE_URL` (`https://crmexchange.1denta.ru`), логин+пароль учётки интегратора. **`ApiKey` в запросах не передаётся** — он лишь активирует доступ учётки (D24).
- [ ] Авторизация: `POST /api/v2/auth` с логином+паролем → JWT (бессрочный); хранить, обновлять повторным `/auth`; на `401 "User token deactivated"` — алерт (ключ отозван).
- [ ] Обработка ошибок/ретраи; соблюдать rate-limit **15 req/s и 900 req/min**, бэкофф на HTTP `444`.
- **DoD:** успешный авторизованный `GET /api/v2/visit` к боевому API.

### 1.3 Импортёры (pull)
- [ ] `importResources()` (`/resource`), `importServices()` (`/service`).
- [ ] `importVisits(dateFrom, dateTill)` с пагинацией (`page`/`meta.lastPage`).
- [ ] Нормализация `datetime`: пояс клиники **GMT+3**; «наивные» значения трактуем как GMT+3 (хранить UTC + tz).
- [ ] Маппинг `attendance` → наш статус.
- **DoD:** период записей из MIS загружается в `Appointment`.

### 1.4 Сверка (reconciliation) — основной источник актуальности
- [ ] BullMQ-задача по расписанию: дельта-pull через `modificate` (окно «N минут назад», **max 1440**) + сверка с проекцией.
- [ ] Интервал ~15 мин; **не реже раза в сутки** (иначе пропуски за пределами 1440 мин не восстановятся).
- **DoD:** изменение в MIS попадает в проекцию даже без вебхука.

### 1.5 Вебхуки (ускоритель) — `POST /webhooks/mis`
- [ ] Приём событий `visit/client/service/commodity`, `type: create|update|delete` (включая смену статуса визита).
- [ ] **Защита эндпоинта:** секретный токен в URL (подписи/секрета у MIS нет — D25). Не доверять телу: **верифицировать событие GET-запросом по `id`** перед применением.
- [ ] Идемпотентность: запись в `WebhookEvent`, дедуп по `misVisitId` + `update_date`; upsert `Appointment`.
- [ ] Учесть: доставка **единичная, без ретраев** — пропуски закрывает сверка (1.4).
- **DoD:** событие из MIS обновляет проекцию; повтор не дублирует.

### 1.6 Регистрация вебхука
- [ ] Скрипт/задача: `POST /api/v2/hook_settings` с нашим URL (массив; `POST` перезаписывает, `PATCH` добавляет).
- **DoD:** MIS шлёт события на наш endpoint.

### 1.7 Тесты
- [ ] Unit: маппинг визита, нормализация tz (GMT+3), дедуп вебхуков.
- [ ] Integration: идемпотентность `POST /webhooks/mis`; дельта-pull по `modificate`.
- **DoD:** тесты в CI зелёные.

### Итог Фазы 1
Запись, созданная/изменённая в MIS, надёжно отражается в нашей БД (основа — периодическая сверка через `modificate`, вебхук ускоряет). Это снимает главный технический риск проекта.

---

## Что нужно от тебя до старта Фазы 1
- **Готово:** `ApiKey` выдан (D24), сотрудник-интегратор создан, email подтверждён (D18).
- **Проверить наличие секретов в `.env` / GitHub Secrets** (вне git): логин+пароль учётки интегратора (пароль задаётся через `https://app3.sqns.ru/auth#/forgot_password`). Сам `ApiKey` в коде не используется.
- Тестирование — на боевом API через Swagger; фильтровать POST, чтобы не засорять боевой аккаунт.
