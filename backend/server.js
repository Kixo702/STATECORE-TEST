import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db, initDatabase, publicUser } from './db.js'

const app = express()
const PORT = process.env.PORT || 4000

// Увеличиваем лимит размера тела запроса для отправки аватарок в base64
app.use(express.json({ limit: '10mb' }))

// В ORIGIN можно перечислить несколько адресов через запятую, например:
// ORIGIN=https://kixo702.github.io,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// localhost всегда разрешён — удобно для локальной разработки
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin) || DEV_ORIGINS.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS: ' + origin))
  }
}))

const ok = (res, data) => res.json(data)
const bad = (res, code, error) => res.status(code).json({ error })

// ── health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => ok(res, { status: 'ok', time: new Date().toISOString() }))

// ── register ──────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { login, password, nickname, vk = '', forum = '' } = req.body || {}
    if (!login || !password || !nickname) {
      return bad(res, 400, 'Заполните обязательные поля')
    }
    const cleanLogin = String(login).trim().toLowerCase()
    if (cleanLogin.length > 10) return bad(res, 400, 'Логин не может быть длиннее 10 символов')

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.query(`
      INSERT INTO users (id, login, password_hash, nickname, vk, forum)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [uuid(), cleanLogin, passwordHash, nickname.trim(), vk, forum])
    ok(res, { user: publicUser(result.rows[0]) })
  } catch (err) {
    if (err.code === '23505') return bad(res, 409, 'Такой логин уже занят')
    console.error(err)
    bad(res, 500, 'Ошибка сервера при регистрации')
  }
})

// ── login ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body || {}
    if (!login || !password) return bad(res, 400, 'Заполните все поля')

    const cleanLogin = String(login).trim().toLowerCase()
    const result = await db.query('SELECT * FROM users WHERE login = $1', [cleanLogin])
    const user = result.rows[0]
    if (!user) return bad(res, 401, 'Неверный логин или пароль')

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) return bad(res, 401, 'Неверный логин или пароль')

    if (user.is_banned || user.isBanned) {
      return bad(res, 403, 'Аккаунт заблокирован: ' + (user.ban_reason || user.banReason || 'без причины'))
    }

    ok(res, { user: publicUser(user) })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка сервера при входе')
  }
})

// ── users ─────────────────────────────────────────────────────
app.get('/api/users', async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY registered_at DESC')
    ok(res, result.rows.map(publicUser))
  } catch (err) { console.error(err); bad(res, 500, 'Ошибка загрузки пользователей') }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    ok(res, { user: publicUser(result.rows[0]) })
  } catch (err) { console.error(err); bad(res, 500, 'Ошибка загрузки пользователя') }
})

app.patch('/api/users/:id', async (req, res) => {
  const fields = { 
    roleName: 'role_name', 
    warnings: 'warnings', 
    isBanned: 'is_banned', 
    banReason: 'ban_reason', 
    nickname: 'nickname', 
    vk: 'vk', 
    forum: 'forum', 
    avatar: 'avatar',
    // Поля двухфакторной аутентификации (2FA)
    twoFactorSecret: 'two_factor_secret',
    two_factor_secret: 'two_factor_secret',
    twoFactorEnabled: 'is_totp_enabled',
    is_totp_enabled: 'is_totp_enabled'
  }

  const body = req.body || {}
  const updates = []

  // Собираем массив обновляемых полей, защищаясь от дублирования столбцов
  for (const [key, column] of Object.entries(fields)) {
    if (key in body && !updates.some(u => u.column === column)) {
      updates.push({ column, value: body[key] })
    }
  }

  if (!updates.length) return bad(res, 400, 'Нечего обновлять')

  try {
    const valuesArr = updates.map(u => u.value)
    const assignments = updates.map((u, index) => `${u.column} = $${index + 1}`)
    valuesArr.push(req.params.id)

    const sql = `UPDATE users SET ${assignments.join(', ')} WHERE id = $${valuesArr.length} RETURNING *`
    const result = await db.query(sql, valuesArr)

    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    return ok(res, publicUser(result.rows[0]))
  } catch (error) { 
    console.error('Ошибка при обновлении пользователя:', error)
    return bad(res, 500, 'Ошибка обновления пользователя') 
  }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    return ok(res, { success: true, deletedId: result.rows[0].id })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка удаления пользователя') }
})

// ── friend requests ───────────────────────────────────────────
app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body || {}
    if (!fromUserId || !toUserId) return bad(res, 400, 'Не хватает данных')
    if (fromUserId === toUserId) return bad(res, 400, 'Нельзя добавить самого себя')

    const already = await db.query(`
      SELECT id FROM friend_requests
      WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
    `, [fromUserId, toUserId])

    if (already.rows.length) return bad(res, 409, 'Заявка уже отправлена')

    const id = uuid()
    await db.query(`
      INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at)
      VALUES ($1, $2, $3, 'pending', $4)
    `, [id, fromUserId, toUserId, new Date().toISOString()])

    ok(res, { id, fromUserId, toUserId, status: 'pending' })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка отправки заявки')
  }
})

app.get('/api/friends/requests/:userId', async (req, res) => {
  try {
    const requests = await db.query(`
      SELECT * FROM friend_requests WHERE to_user_id = $1 AND status = 'pending' ORDER BY created_at DESC
    `, [req.params.userId])
    ok(res, requests.rows)
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка получения заявок')
  }
})

app.post('/api/friends/accept', async (req, res) => {
  try {
    const { requestId } = req.body || {}
    if (!requestId) return bad(res, 400, 'Не хватает requestId')

    const requestRes = await db.query('SELECT * FROM friend_requests WHERE id = $1', [requestId])
    const request = requestRes.rows[0]
    if (!request) return bad(res, 404, 'Заявка не найдена')

    await db.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [requestId])

    const now = new Date().toISOString()
    const insertQuery = `
      INSERT INTO friends (user_id, friend_id, created_at) 
      VALUES ($1, $2, $3) 
      ON CONFLICT DO NOTHING
    `
    await db.query(insertQuery, [request.from_user_id, request.to_user_id, now])
    await db.query(insertQuery, [request.to_user_id, request.from_user_id, now])

    ok(res, { success: true })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка при принятии заявки в друзья')
  }
})

app.get('/api/friends/:userId', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.* FROM friends f 
      JOIN users u ON u.id = f.friend_id 
      WHERE f.user_id = $1
    `, [req.params.userId])
    
    ok(res, result.rows.map(publicUser))
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка при получении списка друзей')
  }
})

// ── sync-local-users ──────────────────────────────────────────
app.post('/api/sync-local-users', async (req, res) => {
  try {
    const { users = [] } = req.body || {}
    let inserted = 0

    for (const u of users) {
      if (!u.login) continue
      const cleanLogin = String(u.login).trim().toLowerCase()
      
      const exists = await db.query('SELECT id FROM users WHERE login = $1', [cleanLogin])
      if (exists.rows.length) continue

      await db.query(`
        INSERT INTO users (id, login, password_hash, nickname, role_name, vk, forum, avatar, warnings, is_banned, ban_reason, registered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        u.id || uuid(),
        cleanLogin,
        '', // без пароля — при первом входе потребуется регистрация
        u.nickname || cleanLogin,
        u.roleName || 'Игрок',
        u.vk || '',
        u.forum || '',
        u.avatar || '',
        u.warnings || 0,
        Boolean(u.isBanned),
        u.banReason || '',
        u.registeredAt || new Date().toISOString()
      ])
      inserted++
    }
    ok(res, { synced: inserted })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка синхронизации локальных пользователей')
  }
})

// ── admin ─────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me'

app.post('/api/admin/set-role', async (req, res) => {
  try {
    const { secret, login, roleName } = req.body || {}
    if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
    if (!login || !roleName) return bad(res, 400, 'Не хватает данных')

    const result = await db.query(
      'UPDATE users SET role_name = $1 WHERE LOWER(login) = $2 RETURNING *',
      [roleName, login.trim().toLowerCase()]
    )

    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    ok(res, { success: true, user: publicUser(result.rows[0]) })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка изменения роли')
  }
})

app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { secret, login, newPassword } = req.body || {}
    if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
    if (!login || !newPassword) return bad(res, 400, 'Не хватает данных')

    const cleanLogin = login.trim().toLowerCase()
    const userRes = await db.query('SELECT id FROM users WHERE login = $1', [cleanLogin])
    if (!userRes.rows[0]) return bad(res, 404, 'Пользователь не найден')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userRes.rows[0].id])
    ok(res, { success: true })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка при сбросе пароля')
  }
})

app.delete('/api/admin/users/:login', async (req, res) => {
  try {
    const { secret } = req.query
    if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')

    const login = req.params.login.trim().toLowerCase()
    const result = await db.query('DELETE FROM users WHERE login = $1 RETURNING id', [login])
    
    ok(res, { deleted: result.rowCount })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка при удалении пользователя')
  }
})

app.listen(PORT, async () => {
  if (typeof initDatabase === 'function') {
    await initDatabase()
  }
  console.log(`StateCore API запущен на порту ${PORT}`)
})