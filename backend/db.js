import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Use a hosted PostgreSQL database such as Neon or Supabase.')
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
})

export async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role_name TEXT NOT NULL DEFAULT 'Игрок',
      vk TEXT NOT NULL DEFAULT '',
      forum TEXT NOT NULL DEFAULT '',
      avatar TEXT,
      warnings INTEGER NOT NULL DEFAULT 0,
      is_banned BOOLEAN NOT NULL DEFAULT FALSE,
      ban_reason TEXT NOT NULL DEFAULT '',
      totp_secret TEXT,
      is_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      last_seen TIMESTAMPTZ,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Миграция для имеющихся баз данных (если таблица users уже существовала)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS user_devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, device_id)
    );

    CREATE INDEX IF NOT EXISTS user_devices_lookup_idx ON user_devices (user_id, device_id);

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_unique
      ON friend_requests (from_user_id, to_user_id) WHERE status = 'pending';
    CREATE TABLE IF NOT EXISTS friends (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_id)
    );
    CREATE INDEX IF NOT EXISTS users_registered_at_idx ON users (registered_at DESC);
    CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx ON friend_requests (to_user_id, status);
    CREATE TABLE IF NOT EXISTS cadre_audits (
      id SERIAL PRIMARY KEY,
      candidate_nick TEXT NOT NULL,
      faction TEXT NOT NULL,
      current_rank INTEGER NOT NULL DEFAULT 0,
      target_rank INTEGER NOT NULL DEFAULT 9,
      reason TEXT NOT NULL DEFAULT 'Доверенное лицо',
      proof_url TEXT,
      vk_url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      submitted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      submitted_by TEXT NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      reject_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS cadre_audits_status_idx ON cadre_audits (status);
    CREATE INDEX IF NOT EXISTS cadre_audits_faction_idx ON cadre_audits (faction);
  `)
}

export function publicUser(row) {
  if (!row) return null
  const {
    password_hash: _passwordHash,
    totp_secret: _totpSecret,
    role_name: roleName,
    is_banned: isBanned,
    ban_reason: banReason,
    is_totp_enabled: isTotpEnabled,
    registered_at: registeredAt,
    last_seen: lastSeen,
    ...rest
  } = row
  return {
    ...rest,
    roleName,
    isBanned: Boolean(isBanned),
    banReason,
    isTotpEnabled: Boolean(isTotpEnabled),
    registeredAt,
    lastSeen,
  }
}