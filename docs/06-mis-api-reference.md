# 06 — Справочник API MIS (CRM Exchange API)

> Источник: **живой swagger** `https://crmexchange.1denta.ru/docs/swagger` (spec v2.1.0) + **ответы техподдержки SQNS от 2026-06-15** (полный текст — `06a-sqns-support-2026-06.md`). Имена полей/эндпоинтов — как в API (EN). Статус: 🟡 актуализирован по ответам техподдержки.
> Назначение: рабочая шпаргалка по интеграции. Источник истины по записям — **MIS**, наше приложение — клиент.
> Платформа: разработчик — **SQNS** (sqns.ru); продукт продаётся под брендами `arnica | denta | clinica`. Наш доступ — через бренд **Arnica Dental**, API хостится на `1denta.ru` (продукт `denta`).

## Общее

- **Базовый URL:** `https://crmexchange.1denta.ru` (в PDF фигурировал `bookingapi.arnica.pro` — это был лишь пример).
- **Версия API:** `2.1.0` (`Crm Exchange Api`). Схемы https/http.
- **Продукт:** поле `product` в вебхуках — `arnica | denta | clinica`. У нас — **`denta`**.
- **Формат:** JSON. Многие поля приходят строками (цены и т.п.).
- **Пагинация:** query `page`, `perPage`; число страниц (`lastPage`) и фактический объём проверять в `meta` (`metaList`) — оно зависит от `perPage`.
- **Инкрементальная синхронизация:** параметр `modificate` у `/visit` и `/employee` — это **«изменённые за последние N минут»**, не timestamp/дата. Максимум **1440 мин (24 ч)**. ⇒ нельзя «догнать» произвольную давность одним запросом; нужен **регулярный** pull (рекоменд. ~15 мин) и обязательно ≥ 1 раза в сутки, иначе пропуски не восстановятся.
- **Rate limit:** **15 req/s И 900 req/min**. Превышение → HTTP **`444`** (не 429). Рекомендуемый интервал опроса для сверки — **~15 мин** (зависит от активности клиники).
- **Часовой пояс клиники — GMT+3** (Europe/Moscow). Даты отдаются в поясе клиники; «наивные» `datetime` без смещения трактуем как GMT+3. (В примерах техподдержки встречается `+05:00` — это пояс их тестового аккаунта, не наш.)

## Получение доступа (Q5a/Q5b — закрыто)

1. В MIS создать **сотрудника-интегратора**, выдать ему доступ к системе, указать **уникальный подтверждённый email**.
2. На `support@sqns.ru` прислать email (на который выдать ключ) и **id аккаунта** → техподдержка генерирует **`ApiKey`**.
3. `ApiKey` **активирует учётке доступ к crmExchangeApi**, но в самих запросах не передаётся — хранится у нас.

> **Статус:** `ApiKey` **выдан 2026-06-05** для **ИП Родионова Ю.В., B.ID 7781** (email `feya3663@yandex.ru`). Сам ключ — в `.env`/Secrets, не в git.

## Механика аутентификации (JWT Bearer)

Все запросы к API авторизуются через **JWT** в заголовке `Authorization: Bearer <JWT>`.
- JWT получаем через `POST /api/v2/auth`, передавая **логин и пароль** учётной записи интегратора (а **не** `ApiKey`).
- Пароль интегратора задаём через «забыли пароль»: `https://app3.sqns.ru/auth#/forgot_password`.
- Из JWT определяются **организация** (`orgId`) и привязанный сотрудник — токен общий на клинику, один ключ = одна организация.
- **JWT бессрочный.** Обновление/сброс = повторный `POST /api/v2/auth`. Отдельного refresh-эндпоинта нет.
- Доступ можно только **отозвать** (отзыв `ApiKey` на стороне SQNS) → запросы вернут `401 {"message":"User token deactivated"}`.

`POST /api/v2/auth`
```json
{ "email": "integrator@clinic.ru", "password": "password" }
```
Ответ: токен (JWT) + данные сотрудника/организации. Ошибки: `404`, `422` (спек), `401 User token deactivated` (после отзыва ключа).

## Ключевые сущности

| Сущность | В нашем домене | Заметки |
|----------|----------------|---------|
| `organization` | Клиника | На старте — одна |
| `employee` / `resource` | **Врач** | `resource` адресуется как `employeeId`; ресурс = сотрудник |
| `service` | Услуга | `durationSeconds`, цена |
| `visit` | **Запись на приём** | главный объект для нас |
| `client` | **Пациент** | ключ сопоставления — телефон |
| `commodity` | Товар | вне scope MVP |
| `payments` | Платежи | вне scope MVP |

## Полный список эндпоинтов (spec v2.1.0)

### Аутентификация
- `POST /api/v2/auth` — body `{email, password}` → токен.

### Записи (visit) — чтение и запись
| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/v2/visit?dateFrom=&dateTill=&page=&perPage=&modificate=` | Список записей (период / дельта по `modificate`) |
| `GET` | `/api/v2/visit/{visitId}` | Запись по id |
| `POST` | `/api/v2/visit` | Создать запись (body `visitForm`) |
| `PUT` | `/api/v2/visit/{visitId}` | Изменить/перенести |
| `DELETE` | `/api/v2/visit/{visitId}` | Удалить |
| `PUT` | `/api/v2/visit/{visitId}/status` | Сменить статус: `new \| confirmed \| showedUp \| cancel` |

### Врачи / ресурсы / услуги / слоты
| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/v2/employee?page=&perPage=&modificate=&isFired=&isDeleted=` | Список сотрудников (врачей) |
| `GET` | `/api/v2/employee/{employeeId}` | Сотрудник по id |
| `GET` | `/api/v2/resource?serviceIds[]=` | Ресурсы (для услуг) |
| `GET` | `/api/v2/resource/{employeeId}/date?serviceIds[]=&from=&to=` | Доступные даты |
| `GET` | `/api/v2/resource/{employeeId}/time?serviceIds[]=&date=` | Свободные слоты |
| `GET` | `/api/v2/service` / `/service/{id}` | Услуги |
| `GET` | `/api/v2/booking/service` / `/booking/service/{id}` | Услуги для онлайн-записи |

### Клиенты (пациенты)
| Метод | Путь | Назначение |
|-------|------|-----------|
| `GET` | `/api/v2/client?page=&perPage=` | Список |
| `GET` | `/api/v2/client/{clientId}` | По id |
| `GET` | `/api/v2/client/phone/{phone}` | **По телефону (сопоставление пациента)** |
| `POST` | `/api/v2/client` | Создать (`clientForm`) |
| `PUT` | `/api/v2/client/{clientId}` | Изменить |
| `DELETE` | `/api/v2/client/{clientId}` | Удалить |

### Прочее
- `GET /api/v2/commodity`, `/commodity/{id}` — товары (вне scope).
- `GET /api/v2/payments` — платежи (вне scope).

### Вебхуки
- `POST /api/v2/hook_settings` — задать URL’ы (массив). **`POST` перезаписывает** список с нуля.
- `PATCH /api/v2/hook_settings` — **добавляет** URL поверх существующих.
- `DELETE /api/v2/hook_settings` — удалить.

## Поведение записей (write-back) и статусы

### Статусы визита (`attendance` ↔ `PUT /visit/{id}/status`)

| `attendance` | `status` | Смысл |
|:---:|----------|-------|
| `-1` | `cancel` | отменён |
| `0` | `new` | не подтверждён |
| `1` | `showedUp` | клиент пришёл |
| `2` | `confirmed` | подтверждён |

- Переходы свободны (любые, сколько угодно) — **пока не наступило время начала визита**.
- **Исключение:** при распечатанном чеке статус фиксируется на `showedUp` и не меняется.

### Создание визита (`POST /visit`, `visitForm`)
- Матчинг клиента **по телефону**: если клиент с номером есть — данные из `user` подтянутся к нему, **ФИО перезапишется** новым значением из запроса; если нет — создаётся новый клиент.
- **Идемпотентности нет.** Защита от дублей — на нашей стороне (проверка слота + own-dedup). При попытке занять уже занятый слот API вернёт `{"code":"SlotUnavailableError"}`.

### Отмена визита — `DELETE` vs `PUT .../status=cancel`
- `DELETE /visit/{id}` — **мягкое** удаление (визит остаётся в справочнике) + освобождает слот.
- `PUT /visit/{id}/status` со `cancel` — отменяет + освобождает слот, но **остаётся в статистике**. Предпочтительно, если нужна статистика.

### Свободные слоты (`/resource/{id}/date`, `/time`)
- Длительность слота = «Интервал записи» в настройках онлайн-записи; **индивидуальный интервал** в карточке сотрудника приоритетнее.
- Уже занятые слоты учитываются (не возвращаются как свободные). `resource.id == employee.id`.

## Схемы данных (из спека)

**`visit`:** `id, resourceId, services[], commodities[], subscriptions[], certificates[], totalPrice, totalCost, clientId, clientData(client), datetime, comment, master_requested, attendance(-1|0|1|2), deleted, online, author, isPaid, organization, create_date, update_date`

**`client`:** `id, name, firstname, lastname, patronymic, phone, additionalPhone, sex(1|2|0), birthDate, comment, totalArrival, type, visitsCount, tags[], email, passportData, address`

**`employeeData`:** `id, firstname, lastname, patronymic, image, position, rating, updateAt, isFired, isDeleted`

**`resourceData`:** `id, title, description, image, rating`

**`visitForm`** (создание): `{ visit: { user{name,phone,email}, comment?, appointment{serviceIds[], resourceId, datetime} } }`. Реальные curl/JSON — в `06a-sqns-support-2026-06.md` §3.5/§5.1.

## Вебхуки (синхронизация в реальном времени)

`POST /api/v2/hook_settings`
```json
{ "urls": ["https://api.feya3663.ru/webhooks/mis"] }
```
MIS шлёт POST на эти URL при событии (создание / изменение / **удаление**) сущности. Структура:
```
object: "visit" | "client" | "service" | "commodity"
type:   "create" | "update" | "delete"
orgId, orgName, product, <payload по объекту>
```
- Сущности: `Visit`, `Client`, `Service`, `Commodity` (товар). Смена статуса визита **тоже** шлёт событие.
- Для `visit` — полный объект записи + `medicalClientData` для `denta/clinica`.

> **Гарантии доставки — слабые (Q-webhook закрыт):**
> - Хук уходит **единожды**; при ошибке/таймауте на нашей стороне **повтора не будет**. Порядок не гарантируется.
> - **Подписи/общего секрета нет** (обещают «к концу года»), IP-фильтрации отправителя нет.
>
> **Следствия для нас:**
> - Вебхук — лишь **ускоритель**; источник актуальности — **обязательный периодический pull-reconciliation** через `modificate` (см. «Общее»).
> - Защита эндпоинта `/webhooks/mis`: **секретный токен в URL** + **верификация события GET-запросом по id** перед применением (доверять телу вебхука нельзя).

## Открытые вопросы по API

- **SLA доступности API** — техподдержкой не назван (канал один: `support@sqns.ru`, отвечают медленно, ~2 недели). Закладываем деградацию на проекции при недоступности MIS.
