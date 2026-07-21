# StateCore API

Простой Express-бэкенд под фронтенд StateCore: регистрация, вход, пользователи, заявки в друзья, синхронизация локальных данных.

## Локальный запуск

```bash
npm install
npm start
```

Сервер поднимется на `http://localhost:4000`, база — файл `statecore.db` (SQLite) рядом с сервером, создастся автоматически при первом запуске.

Для разработки с автоперезапуском:
```bash
npm run dev
```

## Проверка что жив

Открой в браузере:
```
http://localhost:4000/api/health
```
Должно вернуть `{"status":"ok", ...}`.

## Деплой (Render.com — бесплатно для старта)

1. Залей папку `backend/` в отдельный репозиторий на GitHub (или подпапку в том же репозитории).
2. На https://render.com → **New** → **Web Service** → подключи репозиторий.
3. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. В **Environment Variables** добавь:
   - `ORIGIN` = адрес твоего фронтенда (например `https://статкор.github.io` или адрес Vercel/Netlify)
5. ⚠️ **Важно про базу данных:** на бесплатном тарифе Render диск не постоянный — файл `statecore.db` **будет стираться** при каждом передеплое/перезапуске контейнера. Для теста это ок. Когда будешь готовить прод — либо подключи Render **Persistent Disk** (платный), либо перейди на внешнюю БД (например бесплатный Postgres на Render/Neon/Supabase — это уже отдельная миграция с `better-sqlite3` на `pg`).

## Что дальше поменять во фронтенде

В `src/lib/api.js`:
```js
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '')
```
и в `.env` фронтенда (для прод-сборки):
```
VITE_API_BASE=https://твой-бэкенд.onrender.com/api
```

SQLite-файлы и `DB_PATH` больше не используются. Схема таблиц создаётся автоматически при старте API, поэтому redeploy сервера не удаляет данные.
# StateCore API

Простой Express-бэкенд под фронтенд StateCore: регистрация, вход, пользователи, заявки в друзья, синхронизация локальных данных.

## Локальный запуск

```bash
npm install
npm start
```

Сервер поднимется на `http://localhost:4000`, база — файл `statecore.db` (SQLite) рядом с сервером, создастся автоматически при первом запуске.

Для разработки с автоперезапуском:
```bash
npm run dev
```

## Проверка что жив

Открой в браузере:
```
http://localhost:4000/api/health
```
Должно вернуть `{"status":"ok", ...}`.

## Деплой (Render.com — бесплатно для старта)

1. Залей папку `backend/` в отдельный репозиторий на GitHub (или подпапку в том же репозитории).
2. На https://render.com → **New** → **Web Service** → подключи репозиторий.
3. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. В **Environment Variables** добавь:
   - `ORIGIN` = адрес твоего фронтенда (например `https://статкор.github.io` или адрес Vercel/Netlify)
5. ⚠️ **Важно про базу данных:** на бесплатном тарифе Render диск не постоянный — файл `statecore.db` **будет стираться** при каждом передеплое/перезапуске контейнера. Для теста это ок. Когда будешь готовить прод — либо подключи Render **Persistent Disk** (платный), либо перейди на внешнюю БД (например бесплатный Postgres на Render/Neon/Supabase — это уже отдельная миграция с `better-sqlite3` на `pg`).

## Что дальше поменять во фронтенде

В `src/lib/api.js`:
```js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
```
и в `.env` фронтенда (для прод-сборки):
```
VITE_API_BASE=https://твой-бэкенд.onrender.com/api
```
