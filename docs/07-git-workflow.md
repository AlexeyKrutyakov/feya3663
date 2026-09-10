# 07 — Git-процесс (ветки, коммиты, CI/CD)

> Лёгкий trunk-based процесс под команду «пользователь + AI-агенты». Статус: ✅ согласовано (база)

## Принципы

- **`main` — единственная долгоживущая ветка.** Всегда «зелёная» и деплоится. Push/merge в `main` запускает GitHub Actions (CI + деплой).
- **В `main` напрямую не коммитим** (кроме самого первого init-коммита). Любая работа идёт через короткоживущую ветку и Pull Request.
- **Одна сессия = одна фича/задача = одна ветка = один PR.** Единица работы — **конкретная фича или задача, а не фаза целиком** (фаза = набор задач в `docs/05`/`06`). Например, Фаза 0 — это несколько PR: `feat: scaffold api`, `feat: next+tailwind web`, `ci: github actions`, и т.д. — не один гигантский «Phase 0» PR. Правило выбора размера: ветка должна быть достаточно мелкой, чтобы ревью и squash-merge помещались в одну сессию. При слиянии — **squash**, чтобы в `main` был один аккуратный коммит на фичу.

## Именование веток

Формат: `<type>/<короткий-kebab-slug>` — где `<type>` совпадает с типами Conventional Commits (не только feature/fix):

| Префикс | Когда |
|---------|-------|
| `feat/` | новая функциональность |
| `fix/` | исправление бага |
| `refactor/` | рефакторинг без смены поведения |
| `docs/` | документация |
| `chore/` | рутина, конфиги, зависимости |
| `test/` | тесты |
| `ci/` | пайплайны/инфраструктура CI |
| `perf/` | производительность |

Примеры: `feat/mis-visit-sync`, `fix/webhook-dedup`, `docs/roadmap-phase-2`, `chore/monorepo-bootstrap`.
Если работа привязана к GitHub Issue — добавляем номер: `feat/42-patient-cabinet`.

## Коммиты

- **Conventional Commits**, через skill `/commit`. Формат: `type(scope): summary` (на английском).
- **Коротко: по умолчанию одна строка, без тела.** Тело добавляем только если «зачем» неочевидно (нетривиальный компромисс, обход бага). Большинству коммитов тело не нужно.
- Примеры: `feat(api): import visits from MIS`, `fix(web): timezone in appointment card`, `docs: record integration coordinates`.

## Цикл работы

```
main ──┐
       ├─► создать ветку  <type>/<slug>  от свежего main
       ├─► работа + коммиты (/commit)
       ├─► push ветки, открыть PR в main
       │     └─ в теле PR: «Closes #N» для каждого закрываемого issue
       ├─► CI на PR: lint / typecheck / test / build
       └─► squash-merge в main  ──►  CI деплой на Beget VPS
```

**Правило закрытия issues:** если у задачи есть GitHub-issue, PR обязан содержать
`Closes #N` (по строке на issue) — тогда GitHub закрывает его автоматически при
смёрже. Прогресс-чекбоксы в `docs/` обновляются в том же PR. Source of truth по
прогрессу — `docs/`, issues — зеркало задач в трекере.

## CI/CD триггеры (GitHub Actions)

| Событие | Что запускается |
|---------|-----------------|
| PR в `main` | Проверки: lint, typecheck, test, build (без деплоя) |
| Push/merge в `main` | Полный пайплайн + сборка Docker-образов + деплой на VPS |

## Защита `main` (рекомендуется на GitHub)

- Требовать прохождение CI перед слиянием.
- Требовать PR (запрет прямого push).
- Линейная история (squash-merge).

## Версионирование (опционально, позже)

- Семантические теги `vX.Y.Z` на `main` для маркировки релизов/деплоев.

## Сборка Docker-образов в GHCR (0.7, ADR-005)

Job `docker` в `.github/workflows/ci.yml`: матрица `api` / `web`, запуск только
после успешного job `ci` на `push`→`main`. Пуш в GHCR под именами:

- `ghcr.io/alexeykrutyakov/feya-api:latest` + `:sha` (полный SHA мержа)
- `ghcr.io/alexeykrutyakov/feya-web:latest` + `:sha`

Аутентификация — `GITHUB_TOKEN` c `permissions: packages: write` (никакие
секреты реестра настраивать не нужно). Кэш слоёв — GitHub Actions cache
(`type=gha`, scope на приложение).

**Нюанс `web`:** `NEXT_PUBLIC_*` инлайнятся в бандл при сборке образа. Пока
production-домена API нет, образ собирается с дефолтом `http://localhost:3001`;
когда домен появится — задать repository variable `NEXT_PUBLIC_API_URL`
(Settings → Secrets and variables → Actions → Variables), job подхватит её
через `vars.NEXT_PUBLIC_API_URL`.

## Секреты CI/деплоя (карта, без значений)

> Значения заполняются в GitHub (Settings → Secrets and variables → Actions)
> и на VPS перед реальным деплоем (Фаза 7). Здесь — только состав и назначение.

**GitHub Secrets (для CI/деплоя, Phase 7+):**

| Имя | Назначение |
|-----|------------|
| `SSH_HOST` / `SSH_USER` | доступ к VPS Beget для deploy-job |
| `SSH_PRIVATE_KEY` | приватный ключ deploy-ключа для VPS |
| `DEPLOY_WEBHOOK` (альтернатива SSH) | если Beget предложит webhook-деплой |

Сейчас CI (lint/typecheck/test/build + образы) **не требует** секретов:
`GITHUB_TOKEN` выдаётся автоматически, `DATABASE_URL` для `prisma generate` —
заглушка в workflow.

**GitHub Variables (не секреты):**

| Имя | Назначение |
|-----|------------|
| `NEXT_PUBLIC_API_URL` | публичный URL API, инлайнится в образ `web` при сборке |

**Рантайм-секреты приложения** (живут на VPS в `.env` / secrets orchestrator,
не в CI): `DATABASE_URL`, `REDIS_URL`, `MIS_BASE_URL` + логин/пароль
интегратора MIS, JWT/SMTP-токены. См. `AGENTS.md` → «Where secrets live».

**Доступ к GHCR с VPS (Phase 7):** read-only Personal Access Token (classic,
scope `read:packages`) для `docker login ghcr.io` на сервере — завести при
настройке деплоя; пакеты по умолчанию private, токен выдаётся на аккаунт
с доступом к репозиторию.
