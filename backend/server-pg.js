// server-pg.js
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db, initDatabase } from './db.js'

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'statecore_secret_key_change_me'

app.use(cors())
app.use(express.json())

// Хелперы
const ok = (res, data, status = 200) => res.status(status).json(data)
const bad = (res, status = 400, error = 'Ошибка запроса') => res.status(status).json({ error })

// Middleware проверки авторизации
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return bad(res, 401, 'Необходима авторизация')

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return bad(res, 403, 'Токен недействителен или истек')
    req.user = user
    next()
  })
}

// Форматирование данных пользователя под фронтенд (snake_case -> camelCase)
function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    login: row.login,
    nickname: row.nickname,
    roleName: row.role_name || 'Игрок',
    vk: row.vk || '',
    forum: row.forum || '',
    avatar: row.avatar || null,
    warnings: row.warnings || 0,
    isBanned: Boolean(row.is_banned),
    banReason: row.ban_reason || null,
    registeredAt: row.registered_at,
  }
}

// Форматирование заявки кадрового аудита под фронтенд (snake_case -> camelCase)
function publicCadreAudit(row) {
  if (!row) return null
  return {
    id: String(row.id),
    candidateNick: row.candidate_nick,
    faction: row.faction,
    currentRank: row.current_rank,
    targetRank: row.target_rank,
    reason: row.reason,
    proofUrl: row.proof_url,
    vkUrl: row.vk_url,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
  }
}

/* ==========================================================================
   AUTH ENDPOINTS
   ========================================================================== */

app.post('/api/register', async (req, res) => {
  try {
    const { login, password, nickname, vk = '', forum = '' } = req.body || {}

    if (!login || !password || !nickname) {
      return bad(res, 400, 'Заполните обязательные поля')
    }

    const cleanLogin = String(login).trim().toLowerCase()
    if (cleanLogin.length > 10) {
      return bad(res, 400, 'Логин не может быть длиннее 10 символов')
    }

    const existing = await db.query('SELECT id FROM users WHERE login = $1', [cleanLogin])
    if (existing.rows.length > 0) {
      return bad(res, 400, 'Пользователь с таким логином уже существует')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.query(
      `INSERT INTO users (id, login, password_hash, nickname, vk, forum)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuid(), cleanLogin, passwordHash, nickname.trim(), vk, forum]
    )

    const user = publicUser(result.rows[0])
    const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '7d' })

    return ok(res, { token, user })
  } catch (error) {
    if (error.code === '23505') return bad(res, 400, 'Пользователь с таким логином уже существует')
    console.error('Ошибка регистрации:', error)
    return bad(res, 500, 'Ошибка при регистрации')
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body || {}

    if (!login || !password) {
      return bad(res, 400, 'Введите логин и пароль')
    }

    const cleanLogin = String(login).trim().toLowerCase()
    const result = await db.query('SELECT * FROM users WHERE login = $1', [cleanLogin])
    const rawUser = result.rows[0]

    if (!rawUser) {
      return bad(res, 400, 'Неверный логин или пароль')
    }

    const isValidPassword = await bcrypt.compare(password, rawUser.password_hash)
    if (!isValidPassword) {
      return bad(res, 400, 'Неверный логин или пароль')
    }

    if (rawUser.is_banned) {
      return bad(res, 403, 'Аккаунт заблокирован: ' + (rawUser.ban_reason || 'без причины'))
    }

    const user = publicUser(rawUser)
    const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '7d' })

    return ok(res, { token, user })
  } catch (error) {
    console.error('Ошибка входа:', error)
    return bad(res, 500, 'Ошибка при входе в систему')
  }
})

/* ==========================================================================
   USERS ENDPOINTS
   ========================================================================== */

app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY id ASC')
    const users = result.rows.map(publicUser)
    return ok(res, users)
  } catch (error) {
    console.error('Ошибка получения пользователей:', error)
    return bad(res, 500, 'Не удалось получить список пользователей')
  }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return bad(res, 404, 'Пользователь не найден')
    }

    return ok(res, { user: publicUser(result.rows[0]) })
  } catch (error) {
    console.error('Ошибка получения профиля:', error)
    return bad(res, 500, 'Ошибка сервера')
  }
})

app.patch('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { nickname, role, roleName, isBanned, banReason, warns, avatar } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (nickname !== undefined) { fields.push(`nickname = $${idx++}`); values.push(nickname); }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (roleName !== undefined) { fields.push(`role_name = $${idx++}`); values.push(roleName); }
    if (isBanned !== undefined) { fields.push(`is_banned = $${idx++}`); values.push(isBanned); }
    if (banReason !== undefined) { fields.push(`ban_reason = $${idx++}`); values.push(banReason); }
    if (warns !== undefined) { fields.push(`warns = $${idx++}`); values.push(warns); }
    if (avatar !== undefined) { fields.push(`avatar = $${idx++}`); values.push(avatar); }

    if (fields.length === 0) {
      return bad(res, 400, 'Нет полей для обновления')
    }

    values.push(id)
    const queryText = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`

    const result = await db.query(queryText, values)
    if (result.rows.length === 0) {
      return bad(res, 404, 'Пользователь не найден')
    }

    return ok(res, { user: publicUser(result.rows[0]) })
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error)
    return bad(res, 500, 'Не удалось обновить данные')
  }
})

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // Удаляем связи пользователя из друзей и запросов
    await db.query('DELETE FROM friends WHERE user_id = $1 OR friend_id = $1', [id])
    await db.query('DELETE FROM friend_requests WHERE from_user_id = $1 OR to_user_id = $1', [id])
    
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return bad(res, 404, 'Пользователь не найден')
    }

    return ok(res, { success: true, deletedId: id })
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error)
    return bad(res, 500, 'Ошибка при удалении пользователя')
  }
})

app.post('/api/sync-local-users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY id ASC')
    const users = result.rows.map(publicUser)
    return ok(res, { success: true, users })
  } catch (error) {
    console.error('Ошибка синхронизации:', error)
    return bad(res, 500, 'Ошибка синхронизации')
  }
})

/* ==========================================================================
   FRIENDS ENDPOINTS
   ========================================================================== */

app.get('/api/friends/requests/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const query = `
      SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.created_at,
             u.username, u.nickname, u.avatar
      FROM friend_requests fr
      JOIN users u ON u.id = fr.from_user_id
      WHERE fr.to_user_id = $1 AND fr.status = 'pending'
    `
    const result = await db.query(query, [userId])
    return ok(res, { requests: result.rows })
  } catch (error) {
    console.error('Ошибка запросов в друзья:', error)
    return bad(res, 500, 'Ошибка сервера')
  }
})

app.get('/api/friends/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const query = `
      SELECT u.id, u.username, u.nickname, u.avatar, u.role, u.role_name
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1
    `
    const result = await db.query(query, [userId])
    const friends = result.rows.map(publicUser)
    return ok(res, { friends })
  } catch (error) {
    console.error('Ошибка получения списка друзей:', error)
    return bad(res, 500, 'Ошибка сервера')
  }
})

app.post('/api/friends/request', authenticateToken, async (req, res) => {
  try {
    const fromUserId = req.user.id
    const { toUserId, userId } = req.body || {}
    const targetId = toUserId || userId

    if (!targetId || fromUserId === Number(targetId)) {
      return bad(res, 400, 'Некорректный получатель')
    }

    const check = await db.query(
      `SELECT id FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [fromUserId, targetId]
    )

    if (check.rows.length > 0) {
      return bad(res, 400, 'Заявка уже отправлена')
    }

    const result = await db.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [fromUserId, targetId]
    )

    return ok(res, { request: result.rows[0] })
  } catch (error) {
    console.error('Ошибка отправки заявки:', error)
    return bad(res, 500, 'Не удалось отправить заявку')
  }
})

app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.body || {}
    if (!requestId) return bad(res, 400, 'Не указан requestId')

    const updateReq = await db.query(
      `UPDATE friend_requests SET status = 'accepted' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [requestId]
    )

    if (updateReq.rows.length === 0) {
      return bad(res, 404, 'Заявка не найдена или уже обработана')
    }

    const request = updateReq.rows[0]

    await db.query(
      `INSERT INTO friends (user_id, friend_id)
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [request.from_user_id, request.to_user_id]
    )

    return ok(res, { success: true })
  } catch (error) {
    console.error('Ошибка принятия заявки:', error)
    return bad(res, 500, 'Ошибка при принятии заявки')
  }
})

app.post('/api/friends/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.body || {}
    if (!requestId) return bad(res, 400, 'Не указан requestId')

    await db.query(`UPDATE friend_requests SET status = 'rejected' WHERE id = $1`, [requestId])
    return ok(res, { success: true })
  } catch (error) {
    console.error('Ошибка отклонения заявки:', error)
    return bad(res, 500, 'Ошибка при отклонении заявки')
  }
})

app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { friendId } = req.params

    await db.query(
      `DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    )

    return ok(res, { success: true })
  } catch (error) {
    console.error('Ошибка удаления из друзей:', error)
    return bad(res, 500, 'Не удалось удалить друга')
  }
})

/* ==========================================================================
   ADMIN ENDPOINTS (защищены секретным ключом ADMIN_SECRET)
   ========================================================================== */

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me'

// Сброс пароля пользователю по логину — на случай, если забыл свой пароль
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { secret, login, newPassword } = req.body || {}
    if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
    if (!login || !newPassword) return bad(res, 400, 'Не хватает данных')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE login = $2 RETURNING id, login, nickname',
      [passwordHash, String(login).trim().toLowerCase()]
    )

    if (result.rows.length === 0) return bad(res, 404, 'Пользователь не найден')
    return ok(res, { success: true, user: result.rows[0] })
  } catch (error) {
    console.error('Ошибка сброса пароля:', error)
    return bad(res, 500, 'Ошибка сервера при сбросе пароля')
  }
})

// Ручное изменение роли пользователя (roleName)
app.post('/api/admin/set-role', async (req, res) => {
  try {
    const { secret, login, roleName } = req.body || {}
    if (secret !== ADMIN_SECRET) return bad(res, 403, 'Неверный секрет')
    if (!login || !roleName) return bad(res, 400, 'Не хватает данных')

    const result = await db.query(
      'UPDATE users SET role_name = $1 WHERE login = $2 RETURNING id, login, nickname, role_name',
      [roleName, String(login).trim().toLowerCase()]
    )

    if (result.rows.length === 0) return bad(res, 404, 'Пользователь не найден')
    return ok(res, { success: true, user: result.rows[0] })
  } catch (error) {
    console.error('Ошибка изменения роли:', error)
    return bad(res, 500, 'Ошибка сервера при изменении роли')
  }
})

/* ==========================================================================
   CADRE AUDIT ENDPOINTS (Кадровый аудит / Антиблат)
   ========================================================================== */

// Список заявок. Можно отфильтровать по статусу: /api/cadre-audits?status=PENDING
app.get('/api/cadre-audits', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query
    const params = []
    let where = ''
    if (status) {
      params.push(status)
      where = `WHERE status = $${params.length}`
    }
    const result = await db.query(
      `SELECT * FROM cadre_audits ${where} ORDER BY submitted_at DESC`,
      params
    )
    return ok(res, { audits: result.rows.map(publicCadreAudit) })
  } catch (error) {
    console.error('Ошибка получения заявок кадрового аудита:', error)
    return bad(res, 500, 'Не удалось получить заявки')
  }
})

// Создание новой заявки
app.post('/api/cadre-audits', authenticateToken, async (req, res) => {
  try {
    const {
      candidateNick,
      faction,
      currentRank,
      targetRank,
      reason,
      proofUrl,
      vkUrl,
    } = req.body || {}

    if (!candidateNick || !faction || !proofUrl || !vkUrl) {
      return bad(res, 400, 'Заполните обязательные поля заявки')
    }

    // Имя подавшего заявку берём из его аккаунта на сервере, а не из тела запроса,
    // чтобы нельзя было подделать поле submittedBy
    const submitterRes = await db.query('SELECT nickname, login FROM users WHERE id = $1', [req.user.id])
    const submitter = submitterRes.rows[0]
    const submittedByName = submitter?.nickname || submitter?.login || 'Лидер'

    const result = await db.query(
      `INSERT INTO cadre_audits
         (candidate_nick, faction, current_rank, target_rank, reason, proof_url, vk_url, status, submitted_by_id, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
       RETURNING *`,
      [
        candidateNick,
        faction,
        Number(currentRank) || 0,
        Number(targetRank) || 9,
        reason || 'Доверенное лицо',
        proofUrl,
        vkUrl,
        req.user.id,
        submittedByName,
      ]
    )

    return ok(res, { audit: publicCadreAudit(result.rows[0]) }, 201)
  } catch (error) {
    console.error('Ошибка создания заявки кадрового аудита:', error)
    return bad(res, 500, 'Не удалось создать заявку')
  }
})

// Одобрение заявки
app.patch('/api/cadre-audits/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const reviewerRes = await db.query('SELECT nickname, login FROM users WHERE id = $1', [req.user.id])
    const reviewer = reviewerRes.rows[0]
    const reviewedByName = reviewer?.nickname || reviewer?.login || 'Следящий'

    const result = await db.query(
      `UPDATE cadre_audits
         SET status = 'APPROVED', reviewed_by_id = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3 AND status = 'PENDING'
       RETURNING *`,
      [req.user.id, reviewedByName, id]
    )

    if (result.rows.length === 0) {
      return bad(res, 404, 'Заявка не найдена или уже обработана')
    }

    return ok(res, { audit: publicCadreAudit(result.rows[0]) })
  } catch (error) {
    console.error('Ошибка одобрения заявки кадрового аудита:', error)
    return bad(res, 500, 'Не удалось одобрить заявку')
  }
})

// Отклонение заявки
app.patch('/api/cadre-audits/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { rejectReason } = req.body || {}

    if (!rejectReason || !rejectReason.trim()) {
      return bad(res, 400, 'Укажите причину отказа')
    }

    const reviewerRes = await db.query('SELECT nickname, login FROM users WHERE id = $1', [req.user.id])
    const reviewer = reviewerRes.rows[0]
    const reviewedByName = reviewer?.nickname || reviewer?.login || 'Следящий'

    const result = await db.query(
      `UPDATE cadre_audits
         SET status = 'REJECTED', reviewed_by_id = $1, reviewed_by = $2, reviewed_at = now(), reject_reason = $3
       WHERE id = $4 AND status = 'PENDING'
       RETURNING *`,
      [req.user.id, reviewedByName, rejectReason.trim(), id]
    )

    if (result.rows.length === 0) {
      return bad(res, 404, 'Заявка не найдена или уже обработана')
    }

    return ok(res, { audit: publicCadreAudit(result.rows[0]) })
  } catch (error) {
    console.error('Ошибка отклонения заявки кадрового аудита:', error)
    return bad(res, 500, 'Не удалось отклонить заявку')
  }
})

// Удаление заявки (например, ошибочно созданной)
app.delete('/api/cadre-audits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query('DELETE FROM cadre_audits WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return bad(res, 404, 'Заявка не найдена')
    }
    return ok(res, { success: true, deletedId: id })
  } catch (error) {
    console.error('Ошибка удаления заявки кадрового аудита:', error)
    return bad(res, 500, 'Не удалось удалить заявку')
  }
})

/* ==========================================================================
   START SERVER
   ========================================================================== */

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[StateCore API] Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Не удалось инициализировать базу данных:', err)
    process.exit(1)
  })