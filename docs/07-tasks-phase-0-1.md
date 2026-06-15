# 07 — Детализация Фаз 0–1

> Рабочая декомпозиция до конкретных задач. Имена/код — EN. Статус: 🟡 черновик
> Связано с: `04-roadmap.md` (Фазы 0, 1), `03-architecture.md` (ADR-001, 002, 005), `06-mis-api-reference.md`.

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

### 0.1 Репозиторий и инструменты
- [ ] `pnpm init`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`.
- [ ] `tsconfig.base.json` (strict), общий ESLint + Prettier, `.editorconfig`, `.gitignore`.
- [ ] (Опц.) `commitlint` + `husky` — соответствие Conventional Commits (мы коммитим через `/commit`).
- **DoD:** `pnpm install` и `pnpm turbo run lint typecheck` проходят на пустых пакетах.

### 0.2 packages/shared
- [ ] Пакет `@feya/shared`: сборка (`tsup`), экспорт первых Zod-схем (env, общие DTO).
- [ ] Пример общего типа, импортируемого и в `api`, и в `web`.
- **DoD:** оба приложения импортируют тип из `@feya/shared`.

### 0.3 apps/api (NestJS)
- [ ] `nest new` в `apps/api`; модульная структура (`AppModule`, `HealthModule`).
- [ ] `ConfigModule` с валидацией env через Zod (из `shared`).
- [ ] Prisma: `prisma init`, подключение к PostgreSQL, первая миграция (пустая/health).
- [ ] Эндпоинт `GET /health` (проверка БД).
- [ ] Swagger/OpenAPI подключён (`/docs`).
- [ ] `Dockerfile` (multi-stage, Ubuntu/node).
- **DoD:** `/health` отвечает локально и в Docker; `/docs` открывается.

### 0.4 apps/web (Next.js)
- [ ] `create-next-app` (App Router, TS, Tailwind) в `apps/web`.
- [ ] Базовый layout, тема Tailwind, страница-заглушка.
- [ ] Конфиг env (публичные переменные), клиент API (fetch-обёртка).
- [ ] `Dockerfile`.
- **DoD:** стартовая страница рендерится локально и в Docker.

### 0.5 Локальная инфраструктура
- [ ] `docker-compose.yml`: `postgres`, `redis` с томами; `.env.example`.
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
- **DoD:** миграция применяется; схема отражает `06-mis-api-reference.md`.

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
