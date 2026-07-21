# PostgreSQL setup

## Local

1. Create a free database in Neon or Supabase.
2. Copy its connection string to `backend/.env` as `DATABASE_URL`.
3. Set `ORIGIN=http://localhost:5173`.
4. Run `npm install` and `npm start` from `backend/`.
5. Check `http://localhost:4000/api/health`.

The API creates its tables on startup. Do not use `DB_PATH` or commit `.env`.

## Render

Create a Web Service with root directory `backend`, build command `npm install`, and start command `npm start`. Add `DATABASE_URL` and `ORIGIN` in Render environment variables. The database is hosted outside Render, so redeploys and instance restarts do not delete records.

## Frontend

Set `VITE_API_BASE=https://your-api.onrender.com/api` when building the frontend. The source code falls back to `http://localhost:4000/api` for local development.
