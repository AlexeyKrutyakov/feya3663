# 06 — Справочник API MIS (CRM Exchange API)

> Источник: **живой swagger** `https://crmexchange.1denta.ru/docs/swagger` (spec v2.1.0). Имена полей/эндпоинтов — как в API (EN). Статус: 🟡 черновик
> Назначение: рабочая шпаргалка по интеграции. Источник истины по записям — **MIS**, наше приложение — клиент.
> Платформа: разработчик — **SQNS** (sqns.ru); продукт продаётся под брендами `arnica | denta | clinica`. Наш доступ — через бренд **Arnica Dental**, API хостится на `1denta.ru` (продукт `denta`).

## Общее

- **Базовый URL:** `https://crmexchange.1denta.ru` (в PDF фигурировал `bookingapi.arnica.pro` — это был лишь пример).
- **Версия API:** `2.1.0` (`Crm Exchange Api`). Схемы https/http.
- **Продукт:** поле `product` в вебхуках — `arnica | denta | clinica`. У нас — **`denta`**.
- **Формат:** JSON. Многие поля приходят строками (цены и т.п.).
- **Пагинация:** query `page`, `perPage`; в ответе `meta` (`metaList`).
- **Инкрементальная синхронизация:** параметр `modificate` у `/visit` и `/employee` — выбирать только изменённые с момента (дельта). Использовать вместо полных выгрузок при сверке.
- **Rate limit:** присутствует — учитывать при синхронизации.

## Получение доступа (процедура, Q5a — закрыто)

1. В MIS создать **сотрудника-интегратора** (пример: `Integrator SQNS`).
2. Во вкладке управления доступом выдать ему доступ к системе.
3. Указать **уникальный email** (рекомендуется отдельный корпоративный) и **подтвердить** его.
4. Для доступа к **crmExchangeApi** получить **`ApiKey`** — генерируется техподдержкой Arnica через admin-панель и хранится у нас.
5. После получения `ApiKey` можно выполнять запросы.

> В инструкции MIS есть скриншоты настроек внутри приложения (для ручной настройки доступа).

## Механика аутентификации (JWT Bearer)

Все запросы к API авторизуются через **JWT** в заголовке `Authorization: Bearer <JWT>`.
- JWT выдаётся MIS и позволяет ей убедиться, что токен выписан ею.
- Из JWT определяются **организация** (`orgId`) и **привязанный сотрудник** (наш интегратор) — токен общий на клинику, не на пациента.
- JWT получаем через `POST /api/v1/auth` (email+password интегратора).
- **`ApiKey`** от техподдержки Arnica — шаг, **открывающий интегратору доступ к `crmExchangeApi`** (выгрузка `/visit`,`/client`,`/service`, вебхуки). Хранится у нас.

`POST /api/v2/auth` (по живому спеку — v2, не v1)
```json
{ "email": "integrator@clinic.ru", "password": "password" }
```
Ответ: токен (JWT) + данные сотрудника/организации. Ошибки: `404`, `422` (по спеку), плюс из PDF — `401 Invalid/deactivated token`.
- ❓ **Подтвердить у Arnica связку `ApiKey` ↔ JWT:** ApiKey используется при логине/обмене на JWT, или передаётся отдельным заголовком наряду с Bearer? Есть ли **тестовый стенд**?

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
- `POST /api/v2/hook_settings` — задать URL’ы `{ "urls": ["https://наш-домен/webhooks/mis"] }`.
- `PATCH /api/v2/hook_settings` — обновить.
- `DELETE /api/v2/hook_settings` — удалить.

## Схемы данных (из спека)

**`visit`:** `id, resourceId, services[], commodities[], subscriptions[], certificates[], totalPrice, totalCost, clientId, clientData(client), datetime, comment, master_requested, attendance(-1|0|1|2), deleted, online, author, isPaid, organization, create_date, update_date`

**`client`:** `id, name, firstname, lastname, patronymic, phone, additionalPhone, sex(1|2|0), birthDate, comment, totalArrival, type, visitsCount, tags[], email, passportData, address`

**`employeeData`:** `id, firstname, lastname, patronymic, image, position, rating, updateAt, isFired, isDeleted`

**`resourceData`:** `id, title, description, image, rating`

**`visitForm`** (создание): `{ user{...}, appointment{...} }` (см. PDF-пример: `user{name,phone,email}`, `appointment{serviceIds[], resourceId, datetime}`).

## Вебхуки (синхронизация в реальном времени)

`POST /api/v2/hook_settings`
```json
{ "urls": ["https://наш-домен/webhooks/mis"] }
```
MIS шлёт POST на эти URL при изменениях. Структура события:
```
object: "visit" | "client" | "service" | "commodity"
type:   "create" | "update"
orgId, orgName, product, <payload по объекту>
```
- Для `visit` — полный объект записи (как в списке) + `medicalClientData` для `denta/clinica`.
- **Это основной механизм актуализации** записей у нас; периодический pull (`GET /visit`) — для сверки/восстановления.

## Открытые вопросы по API

- Как именно передаётся `ApiKey` (заголовок/query) и есть ли тестовый стенд?
- Гарантии доставки вебхуков (ретраи, подпись запроса) — нужно уточнить у MIS.
- Часовой пояс: `datetime` в визитах приходит и со смещением (`+05:00`), и без — нормализовать на нашей стороне.
