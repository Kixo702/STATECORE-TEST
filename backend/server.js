import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db, publicUser } from './db.js'

const app = express()
const PORT = process.env.PORT || 4000

// В проде укажи ORIGIN=https://твой-фронтенд-домен в переменных окружения.
// Пока стоит "*" — разрешены запросы с любого адреса (ок для старта, но не идеал для продакшена).
const ORIGIN = process.env.ORIGIN || '*'
app.use(cors({ origin: ORIGIN }))
app.use(express.json())

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

    const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(cleanLogin)
    if (existing) return bad(res, 409, 'Такой логин уже занят')

    const id = uuid()
    const passwordHash = await bcrypt.hash(password, 10)
    const registeredAt = new Date().toISOString()

    db.prepare(`
      INSERT INTO users (id, login, passwordHash, nickname, roleName, vk, forum, registeredAt)
      VALUES (?, ?, ?, ?, 'Игрок', ?, ?, ?)
    `).run(id, cleanLogin, passwordHash, nickname.trim(), vk, forum, registeredAt)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    ok(res, { user: publicUser(user) })
  } catch (err) {
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
    const user = db.prepare('SELECT * FROM users WHERE login = ?').get(cleanLogin)
    if (!user) return bad(res, 401, 'Неверный логин или пароль')

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) return bad(res, 401, 'Неверный логин или пароль')

    if (user.isBanned) return bad(res, 403, 'Аккаунт заблокирован: ' + (user.banReason || 'без причины'))

    ok(res, { user: publicUser(user) })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка сервера при входе')
  }
})

// ── users ─────────────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY registeredAt DESC').all()
  ok(res, users.map(publicUser))
})

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return bad(res, 404, 'Пользователь не найден')
  ok(res, publicUser(user))
})

// Обновление полей пользователя (роль/бан/выговоры и т.п.) — используется админкой
app.patch('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return bad(res, 404, 'Пользователь не найден')

  const allowed = ['roleName', 'warnings', 'isBanned', 'banReason', 'nickname', 'vk', 'forum', 'avatar']
  const updates = []
  const values = []
  for (const key of allowed) {
    if (key in (req.body || {})) {
      updates.push(`${key} = ?`)
      values.push(key === 'isBanned' ? (req.body[key] ? 1 : 0) : req.body[key])
    }
  }
  if (updates.length === 0) return bad(res, 400, 'Нечего обновлять')

  values.push(req.params.id)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  ok(res, publicUser(updated))
})

// ── friend requests ───────────────────────────────────────────
app.post('/api/friends/request', (req, res) => {
  const { fromUserId, toUserId } = req.body || {}
  if (!fromUserId || !toUserId) return bad(res, 400, 'Не хватает данных')
  if (fromUserId === toUserId) return bad(res, 400, 'Нельзя добавить самого себя')

  const already = db.prepare(`
    SELECT id FROM friend_requests
    WHERE fromUserId = ? AND toUserId = ? AND status = 'pending'
  `).get(fromUserId, toUserId)
  if (already) return bad(res, 409, 'Заявка уже отправлена')

  const id = uuid()
  db.prepare(`
    INSERT INTO friend_requests (id, fromUserId, toUserId, status, createdAt)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(id, fromUserId, toUserId, new Date().toISOString())

  ok(res, { id, fromUserId, toUserId, status: 'pending' })
})

app.get('/api/friends/requests/:userId', (req, res) => {
  const requests = db.prepare(`
    SELECT * FROM friend_requests WHERE toUserId = ? AND status = 'pending' ORDER BY createdAt DESC
  `).all(req.params.userId)
  ok(res, requests)
})

app.post('/api/friends/accept', (req, res) => {
  const { requestId } = req.body || {}
  if (!requestId) return bad(res, 400, 'Не хватает requestId')

  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(requestId)
  if (!request) return bad(res, 404, 'Заявка не найдена')

  db.prepare(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`).run(requestId)

  const now = new Date().toISOString()
  const insertFriend = db.prepare(`
    INSERT OR IGNORE INTO friends (userId, friendId, createdAt) VALUES (?, ?, ?)
  `)
  insertFriend.run(request.fromUserId, request.toUserId, now)
  insertFriend.run(request.toUserId, request.fromUserId, now)

  ok(res, { success: true })
})

app.get('/api/friends/:userId', (req, res) => {
  const friends = db.prepare(`
    SELECT u.* FROM friends f JOIN users u ON u.id = f.friendId WHERE f.userId = ?
  `).all(req.params.userId)
  ok(res, friends.map(publicUser))
})

// ── sync-local-users ──────────────────────────────────────────
// Принимает пользователей, накопленных раньше в localStorage (до появления бэкенда),
// и аккуратно добавляет в БД тех, кого там ещё нет (по login), не трогая существующих.
app.post('/api/sync-local-users', (req, res) => {
  try {
    const { users = [] } = req.body || {}
    let inserted = 0
    const insertStmt = db.prepare(`
      INSERT INTO users (id, login, passwordHash, nickname, roleName, vk, forum, avatar, warnings, isBanned, banReason, registeredAt)
      VALUES (@id, @login, @passwordHash, @nickname, @roleName, @vk, @forum, @avatar, @warnings, @isBanned, @banReason, @registeredAt)
    `)

    for (const u of users) {
      if (!u.login) continue
      const cleanLogin = String(u.login).trim().toLowerCase()
      const exists = db.prepare('SELECT id FROM users WHERE login = ?').get(cleanLogin)
      if (exists) continue

      insertStmt.run({
        id: u.id || uuid(),
        login: cleanLogin,
        passwordHash: '', // локальные записи без пароля — при первом входе им нужно будет зарегистрироваться заново
        nickname: u.nickname || cleanLogin,
        roleName: u.roleName || 'Игрок',
        vk: u.vk || '',
        forum: u.forum || '',
        avatar: u.avatar || '',
        warnings: u.warnings || 0,
        isBanned: u.isBanned ? 1 : 0,
        banReason: u.banReason || '',
        registeredAt: u.registeredAt || new Date().toISOString(),
      })
      inserted++
    }
    ok(res, { synced: inserted })
  } catch (err) {
    console.error(err)
    bad(res, 500, 'Ошибка синхронизации')
  }
})

// Временный служебный роут для ручного управления — защищён секретным ключом.
// Не забудь удалить или закрыть после использования, это не для постоянной эксплуатации.
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me'

app.post('/api/admin/set-role', (req, res) => {
  const { secret, login, roleName } = req.body || {}
  if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
  if (!login || !roleName) return bad(res, 400, 'Не хватает данных')

  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login.trim().toLowerCase())
  if (!user) return bad(res, 404, 'Пользователь не найден')

  db.prepare('UPDATE users SET roleName = ? WHERE id = ?').run(roleName, user.id)
  ok(res, { success: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) })
})

app.post('/api/admin/reset-password', async (req, res) => {
  const { secret, login, newPassword } = req.body || {}
  if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
  if (!login || !newPassword) return bad(res, 400, 'Не хватает данных')

  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login.trim().toLowerCase())
  if (!user) return bad(res, 404, 'Пользователь не найден')

  const passwordHash = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, user.id)
  ok(res, { success: true })
})

app.delete('/api/admin/users/:login', (req, res) => {
  const { secret } = req.query
  if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')

  const login = req.params.login.trim().toLowerCase()
  const result = db.prepare('DELETE FROM users WHERE login = ?').run(login)
  ok(res, { deleted: result.changes })
})


app.listen(PORT, () => {
  console.log(`StateCore API запущен на порту ${PORT}`)
})