// server-pg.js
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { authenticator } from 'otplib/authenticator'
import qrcode from 'qrcode'
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
    isTotpEnabled: Boolean(row.is_totp_enabled),
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
    const { login, password, deviceId } = req.body || {}

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

    // Проверка 2FA, если включен
    if (rawUser.is_totp_enabled && rawUser.totp_secret) {
      let isKnownDevice = false

      if (deviceId) {
        const deviceCheck = await db.query(
          'SELECT id FROM user_devices WHERE user_id = $1 AND device_id = $2',
          [rawUser.id, deviceId]
        )
        isKnownDevice = deviceCheck.rows.length > 0
      }

      // Новое устройство / браузер — запрашиваем 2FA код
      if (!isKnownDevice) {
        const tempToken = jwt.sign(
          { id: rawUser.id, type: '2fa_pending' },
          JWT_SECRET,
          { expiresIn: '5m' }
        )

        return ok(res, {
          requires2FA: true,
          tempToken,
          message: 'Требуется подтверждение Google Authenticator'
        })
      }
    }

    // Сохраняем текущее устройство как доверенное
    if (deviceId) {
      await db.query(
        `INSERT INTO user_devices (user_id, device_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, device_id) 
         DO UPDATE SET last_used_at = NOW()`,
        [rawUser.id, deviceId, req.ip, req.headers['user-agent'] || '']
      )
    }

    const user = publicUser(rawUser)
    const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '7d' })

    return ok(res, { token, user })
  } catch (error) {
    console.error('Ошибка входа:', error)
    return bad(res, 500, 'Ошибка при входе в систему')
  }
})

// Верификация 2FA кода при входе с нового устройства
app.post('/api/login/2fa', async (req, res) => {
  try {
    const { tempToken, code, deviceId } = req.body || {}

    if (!tempToken || !code) {
      return bad(res, 400, 'Переданы не все данные')
    }

    let payload
    try {
      payload = jwt.verify(tempToken, JWT_SECRET)
    } catch (e) {
      return bad(res, 401, 'Сессия входа истекла. Авторизуйтесь заново.')
    }

    if (payload.type !== '2fa_pending') {
      return bad(res, 400, 'Неверный токен авторизации')
    }

    const result = await db.query('SELECT * FROM users WHERE id = $1', [payload.id])
    const rawUser = result.rows[0]

    if (!rawUser || !rawUser.totp_secret) {
      return bad(res, 400, 'Пользователь не найден или 2FA не привязан')
    }

    const isValidCode = authenticator.check(String(code).trim(), rawUser.totp_secret)
    if (!isValidCode) {
      return bad(res, 400, 'Неверный код из Google Authenticator')
    }

    // Сохраняем устройство в доверенные
    if (deviceId) {
      await db.query(
        `INSERT INTO user_devices (user_id, device_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, device_id) 
         DO UPDATE SET last_used_at = NOW()`,
        [rawUser.id, deviceId, req.ip, req.headers['user-agent'] || '']
      )
    }

    const user = publicUser(rawUser)
    const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: '7d' })

    return ok(res, { token, user })
  } catch (error) {
    console.error('Ошибка подтверждения 2FA:', error)
    return bad(res, 500, 'Ошибка проверки 2FA кода')
  }
})

/* ==========================================================================
   2FA SETUP ENDPOINTS (Личный кабинет)
   ========================================================================== */

// 1. Генерация секретного ключа и QR-кода для настройки 2FA
app.post('/api/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT login FROM users WHERE id = $1', [req.user.id])
    if (userRes.rows.length === 0) return bad(res, 404, 'Пользователь не найден')

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(userRes.rows[0].login, 'StateCore', secret)
    const qrCodeUrl = await qrcode.toDataURL(otpauth)

    // Сохраняем временный секрет в БД
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, req.user.id])

    return ok(res, { secret, qrCodeUrl })
  } catch (error) {
    console.error('Ошибка настройки 2FA:', error)
    return bad(res, 500, 'Не удалось сгенерировать 2FA ключ')
  }
})

// 2. Включение 2FA (подтверждение первым кодом из приложения)
app.post('/api/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { code, deviceId } = req.body || {}
    if (!code) return bad(res, 400, 'Введите 6-значный код')

    const userRes = await db.query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id])
    const rawUser = userRes.rows[0]

    if (!rawUser || !rawUser.totp_secret) {
      return bad(res, 400, 'Сначала сгенерируйте QR-код для подключения')
    }

    const isValid = authenticator.check(String(code).trim(), rawUser.totp_secret)
    if (!isValid) {
      return bad(res, 400, 'Неверный код. Попробуйте еще раз.')
    }

    await db.query('UPDATE users SET is_totp_enabled = TRUE WHERE id = $1', [req.user.id])

    // Текущее устройство сразу запоминаем как доверенное
    if (deviceId) {
      await db.query(
        `INSERT INTO user_devices (user_id, device_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, device_id) 
         DO UPDATE SET last_used_at = NOW()`,
        [req.user.id, deviceId, req.ip, req.headers['user-agent'] || '']
      )
    }

    return ok(res, { success: true, message: 'Двухфакторная аутентификация успешно включена!' })
  } catch (error) {
    console.error('Ошибка активации 2FA:', error)
    return bad(res, 500, 'Не удалось активировать 2FA')
  }
})

// 3. Отключение 2FA
app.post('/api/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body || {}
    const userRes = await db.query('SELECT totp_secret, is_totp_enabled FROM users WHERE id = $1', [req.user.id])
    const rawUser = userRes.rows[0]

    if (!rawUser || !rawUser.is_totp_enabled) {
      return bad(res, 400, '2FA не включен на этом аккаунте')
    }

    const isValid = authenticator.check(String(code).trim(), rawUser.totp_secret)
    if (!isValid) {
      return bad(res, 400, 'Неверный код 2FA')
    }

    await db.query('UPDATE users SET is_totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [req.user.id])
    await db.query('DELETE FROM user_devices WHERE user_id = $1', [req.user.id])

    return ok(res, { success: true, message: '2FA успешно отключен' })
  } catch (error) {
    console.error('Ошибка отключения 2FA:', error)
    return bad(res, 500, 'Не удалось отключить 2FA')
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
    
    // Удаляем связи пользователя из друзей, устройств и запросов
    await db.query('DELETE FROM user_devices WHERE user_id = $1', [id])
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

// Удаление заявки
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