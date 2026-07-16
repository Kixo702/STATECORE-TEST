import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// В проде (Render/Railway) можно подключить постоянный диск через DB_PATH,
// иначе файл лежит рядом с сервером.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'statecore.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT UNIQUE,
    passwordHash TEXT,
    nickname TEXT,
    roleName TEXT DEFAULT 'Игрок',
    vk TEXT DEFAULT '',
    forum TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    warnings INTEGER DEFAULT 0,
    isBanned INTEGER DEFAULT 0,
    banReason TEXT DEFAULT '',
    registeredAt TEXT
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending | accepted | rejected
    createdAt TEXT NOT NULL,
    FOREIGN KEY (fromUserId) REFERENCES users(id),
    FOREIGN KEY (toUserId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    userId TEXT NOT NULL,
    friendId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    PRIMARY KEY (userId, friendId)
  );
`)

export function publicUser(row) {
  if (!row) return null
  const { passwordHash, ...rest } = row
  return { ...rest, isBanned: !!rest.isBanned }
}