import { getSession, getUsers, saveUsers, setSession } from './userStore'

// Заявки на смену никнейма — хранятся локально и рассматриваются модераторами
const REQ_KEY = 'sc_nick_requests'

function readAll() {
  try {
    const raw = localStorage.getItem(REQ_KEY)
    if (!raw || raw === 'undefined' || raw === 'null') return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(list) {
  localStorage.setItem(REQ_KEY, JSON.stringify(list))
  // уведомляем другие открытые вкладки/компоненты этого же таба
  try {
    window.dispatchEvent(new CustomEvent('sc:nick-requests-updated'))
  } catch {}
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'undefined' || raw === 'null') return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function pushLog(userId, text) {
  if (!userId) return
  const logsKey = `sc_logs_${userId}`
  const logs = readJSON(logsKey, [])
  logs.unshift({ text, at: new Date().toISOString() })
  localStorage.setItem(logsKey, JSON.stringify(logs.slice(0, 30)))
}

export function getNickRequests() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getPendingNickRequests() {
  return getNickRequests().filter((r) => r.status === 'pending')
}

export function getPendingNickRequestForUser(userId) {
  if (!userId) return null
  return readAll().find((r) => r.userId === userId && r.status === 'pending') || null
}

export function createNickRequest({ userId, login, currentNickname, requestedNickname }) {
  const list = readAll()
  // если уже есть активная заявка от этого пользователя — заменяем её
  const filtered = list.filter((r) => !(r.userId === userId && r.status === 'pending'))
  const entry = {
    id: `nr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    login: login || null,
    currentNickname,
    requestedNickname,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
  }
  filtered.unshift(entry)
  writeAll(filtered)
  pushLog(userId, `Заявка на смену никнейма отправлена на рассмотрение: «${currentNickname}» → «${requestedNickname}»`)
  return entry
}

export function reviewNickRequest(id, decision, reviewer) {
  const list = readAll()
  const idx = list.findIndex((r) => r.id === id)
  if (idx === -1) return null

  const req = { ...list[idx] }
  req.status = decision // 'approved' | 'rejected'
  req.reviewedBy = reviewer?.nickname || reviewer?.login || 'Модератор'
  req.reviewedAt = new Date().toISOString()
  list[idx] = req
  writeAll(list)

  if (decision === 'approved') {
    try {
      const users = getUsers()
      const uidx = users.findIndex((u) => u.id === req.userId)
      if (uidx !== -1) {
        users[uidx].nickname = req.requestedNickname
        saveUsers(users)
      }
      const session = getSession()
      if (session && session.id === req.userId) {
        const nextSession = { ...session, nickname: req.requestedNickname }
        setSession(nextSession)
      }
      pushLog(req.userId, `Заявка на смену никнейма одобрена (${req.reviewedBy}): «${req.currentNickname}» → «${req.requestedNickname}»`)
    } catch (e) {
      console.error(e)
    }
  } else if (decision === 'rejected') {
    pushLog(req.userId, `Заявка на смену никнейма отклонена (${req.reviewedBy}): «${req.currentNickname}» → «${req.requestedNickname}»`)
  }

  return req
}

export default {
  getNickRequests,
  getPendingNickRequests,
  getPendingNickRequestForUser,
  createNickRequest,
  reviewNickRequest,
}