import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db, initDatabase, publicUser } from './db.js'

const app = express()
const PORT = process.env.PORT || 4000
const origins = (process.env.ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean)

app.use(cors({ origin(origin, callback) {
  if (!origin || !origins.length || origins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true)
  return callback(new Error('Origin is not allowed'))
} }))
app.use(express.json({ limit: '1mb' }))

const ok = (res, data) => res.json(data)
const bad = (res, code, error) => res.status(code).json({ error })
const loginOf = value => String(value || '').trim().toLowerCase()
const userFields = { roleName: 'role_name', warnings: 'warnings', isBanned: 'is_banned', banReason: 'ban_reason', nickname: 'nickname', vk: 'vk', forum: 'forum', avatar: 'avatar' }

app.get('/api/health', async (_req, res) => {
  try { await db.query('SELECT 1'); return ok(res, { ok: true, status: 'ok', time: new Date().toISOString() }) }
  catch (error) { console.error(error); return bad(res, 503, 'База данных недоступна') }
})

app.post('/api/register', async (req, res) => {
  try {
    const { login, password, nickname, vk = '', forum = '' } = req.body || {}
    const cleanLogin = loginOf(login)
    if (!cleanLogin || !password || !String(nickname || '').trim()) return bad(res, 400, 'Заполните обязательные поля')
    if (cleanLogin.length > 32) return bad(res, 400, 'Логин слишком длинный')
    const result = await db.query('INSERT INTO users (id, login, password_hash, nickname, vk, forum) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [uuid(), cleanLogin, await bcrypt.hash(password, 12), String(nickname).trim(), String(vk || ''), String(forum || '')])
    return ok(res, { user: publicUser(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') return bad(res, 409, 'Такой логин уже занят')
    console.error(error); return bad(res, 500, 'Ошибка сервера при регистрации')
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE login = $1', [loginOf(req.body?.login)])
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(req.body?.password || '', user.password_hash))) return bad(res, 401, 'Неверный логин или пароль')
    if (user.is_banned) return bad(res, 403, `Аккаунт заблокирован: ${user.ban_reason || 'без причины'}`)
    return ok(res, { user: publicUser(user) })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка сервера при входе') }
})

app.get('/api/users', async (_req, res) => {
  try { const result = await db.query('SELECT * FROM users ORDER BY registered_at DESC'); return ok(res, result.rows.map(publicUser)) }
  catch (error) { console.error(error); return bad(res, 500, 'Ошибка загрузки пользователей') }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    return ok(res, { user: publicUser(result.rows[0]) })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка загрузки пользователя') }
})

app.patch('/api/users/:id', async (req, res) => {
  const updates = Object.entries(userFields).filter(([key]) => key in (req.body || {}))
  if (!updates.length) return bad(res, 400, 'Нечего обновлять')
  try {
    const values = updates.map(([key]) => req.body[key])
    const assignments = updates.map(([, column], index) => `${column} = $${index + 1}`)
    values.push(req.params.id)
    const result = await db.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`, values)
    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    return ok(res, publicUser(result.rows[0]))
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка обновления пользователя') }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows[0]) return bad(res, 404, 'Пользователь не найден')
    return ok(res, { success: true, deletedId: result.rows[0].id })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка удаления пользователя') }
})

app.post('/api/friends/request', async (req, res) => {
  const { fromUserId, toUserId } = req.body || {}
  if (!fromUserId || !toUserId || fromUserId === toUserId) return bad(res, 400, 'Неверный запрос')
  try {
    const existing = await db.query(`SELECT * FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`, [fromUserId, toUserId])
    if (existing.rows[0]) return ok(res, { ok: true, request: existing.rows[0] })
    const result = await db.query('INSERT INTO friend_requests (id, from_user_id, to_user_id) VALUES ($1, $2, $3) RETURNING *', [uuid(), fromUserId, toUserId])
    return ok(res, { ok: true, request: result.rows[0] })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка отправки запроса') }
})

app.get('/api/friends/requests/:userId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM friend_requests WHERE to_user_id = $1 AND status = $2 ORDER BY created_at DESC', [req.params.userId, 'pending'])
    return ok(res, { requests: result.rows })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка загрузки запросов') }
})

app.post('/api/friends/accept', async (req, res) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1 AND status = 'pending' RETURNING *`, [req.body?.requestId])
    if (!result.rows[0]) { await client.query('ROLLBACK'); return bad(res, 404, 'Заявка не найдена') }
    const request = result.rows[0]
    await client.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING', [request.from_user_id, request.to_user_id])
    await client.query('COMMIT')
    return ok(res, { success: true })
  } catch (error) { await client.query('ROLLBACK'); console.error(error); return bad(res, 500, 'Ошибка принятия запроса') }
  finally { client.release() }
})

app.get('/api/friends/:userId', async (req, res) => {
  try {
    const result = await db.query('SELECT u.* FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1 ORDER BY u.nickname', [req.params.userId])
    return ok(res, { friends: result.rows.map(publicUser) })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка загрузки друзей') }
})

app.post('/api/sync-local-users', async (req, res) => {
  try {
    for (const user of Array.isArray(req.body?.users) ? req.body.users : []) {
      const login = loginOf(user?.login)
      if (!login) continue
      await db.query(`INSERT INTO users (id, login, password_hash, nickname, role_name, vk, forum, avatar, warnings, is_banned, ban_reason, registered_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW())) ON CONFLICT (login) DO NOTHING`, [user.id || uuid(), login, user.passwordHash || '', user.nickname || login, user.roleName || 'Игрок', user.vk || '', user.forum || '', user.avatar || null, Number(user.warnings || 0), Boolean(user.isBanned), user.banReason || '', user.registeredAt || null])
    }
    const result = await db.query('SELECT * FROM users ORDER BY registered_at DESC')
    return ok(res, { ok: true, users: result.rows.map(publicUser) })
  } catch (error) { console.error(error); return bad(res, 500, 'Ошибка синхронизации пользователей') }
})

const start = async () => { await initDatabase(); app.listen(PORT, () => console.log(`StateCore API listening on port ${PORT}`)) }
start().catch(error => { console.error('Database initialization failed', error); process.exit(1) })
