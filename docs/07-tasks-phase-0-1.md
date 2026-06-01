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
_Зависит от Q5b (передача ApiKey, тестовый стенд) — запросить у Arnica до старта._

### 1.1 Модель данных (Prisma)
- [ ] `MisResource`, `MisService`, `Appointment`, `WebhookEvent` (+ enum статусов из `attendance`).
- [ ] Индексы: `Appointment.misVisitId` (уникальный), `resourceId`, `datetime`.
- [ ] Миграция.
- **DoD:** миграция применяется; схема отражает `06-mis-api-reference.md`.

### 1.2 MIS-клиент (модуль `MisModule`)
- [ ] Конфиг: `MIS_BASE_URL`, учётка интегратора, `MIS_API_KEY` (секреты).
- [ ] Авторизация booking API: `POST /api/v1/auth` → JWT, обновление по истечении.
- [ ] Передача `ApiKey` для crmExchangeApi (механизм уточнить — Q5b; вынести в абстракцию).
- [ ] Обработка ошибок/ретраи, уважение rate-limit.
- **DoD:** успешный авторизованный `GET /api/v2/visit` к стенду/боевому.

### 1.3 Импортёры (pull)
- [ ] `importResources()` (`/resource`), `importServices()` (`/service`).
- [ ] `importVisits(dateFrom, dateTill)` с пагинацией (`page`/`meta.lastPage`).
- [ ] Нормализация `datetime` (со смещением и без → UTC + tz).
- [ ] Маппинг `attendance` → наш статус.
- **DoD:** период записей из MIS загружается в `Appointment`.

### 1.4 Вебхуки (основной канал)
- [ ] `POST /webhooks/mis`: приём событий `visit/client/service`, `type: create|update`.
- [ ] Идемпотентность: запись в `WebhookEvent`, дедуп по `misVisitId` + `update_date`.
- [ ] Upsert `Appointment` из payload.
- [ ] (Если поддерживается) проверка подписи запроса.
- **DoD:** событие из MIS обновляет нашу проекцию; повтор не дублирует.

### 1.5 Сверка (reconciliation)
- [ ] BullMQ-задача по расписанию: дельта-pull через `modificate` (только изменённые) + сверка с проекцией (на случай пропущенных вебхуков).
- **DoD:** расхождения после «потерянного» вебхука устраняются сверкой.

### 1.6 Регистрация вебхука
- [ ] Скрипт/задача: `POST /api/v2/hook_settings` с нашим URL вебхука.
- **DoD:** MIS шлёт события на наш endpoint.

### 1.7 Тесты
- [ ] Unit: маппинг визита, нормализация tz, дедуп вебхуков.
- [ ] Integration: идемпотентность `POST /webhooks/mis`.
- **DoD:** тесты в CI зелёные.

### Итог Фазы 1
Запись, созданная/изменённая в MIS, надёжно отражается в нашей БД (через вебхук + страховка сверкой). Это снимает главный технический риск проекта.

---

## Что нужно от тебя до старта Фазы 1
- Запросить у техподдержки Arnica: **ApiKey**, способ его передачи (Q5b), наличие **тестового стенда**, политику вебхуков (ретраи/подпись).
- Создать сотрудника-интегратора в MIS и подтвердить его email (D18).
