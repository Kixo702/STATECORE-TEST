// src/lib/api.js

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://statecore-proxy.kaitolawliet52.workers.dev/api').replace(/\/$/, '')

export async function api(path, options = {}) {
  const token = localStorage.getItem('statecore_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Ошибка запроса')
  return data
}

// Auth
export async function registerUser(payload) {
  return api('/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function loginUser(payload) {
  return api('/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function verify2FALogin(payload) {
  // payload содержит { tempToken, code, deviceId }
  return api('/login/2fa', { method: 'POST', body: JSON.stringify(payload) })
}

// Users
export async function getUsers() {
  const data = await api('/users')
  return Array.isArray(data) ? data : (data.users || [])
}

export async function getUser(id) {
  const data = await api(`/users/${id}`)
  return data.user || data
}

export async function updateUser(id, patch) {
  const data = await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return data.user || data
}

export async function deleteUser(id) {
  return api(`/users/${id}`, { method: 'DELETE' })
}

// Sync
export async function syncLocalUsers(users, session = null) {
  return api('/sync-local-users', { method: 'POST', body: JSON.stringify({ users, session }) })
}

// Cadre audit (Кадровый аудит / Антиблат)
export async function getCadreAudits(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await api(`/cadre-audits${query}`)
  return data.audits || []
}

export async function createCadreAudit(payload) {
  const data = await api('/cadre-audits', { method: 'POST', body: JSON.stringify(payload) })
  return data.audit || data
}

export async function approveCadreAudit(id) {
  const data = await api(`/cadre-audits/${id}/approve`, { method: 'PATCH' })
  return data.audit || data
}

export async function rejectCadreAudit(id, rejectReason) {
  const data = await api(`/cadre-audits/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectReason }) })
  return data.audit || data
}

export async function deleteCadreAudit(id) {
  return api(`/cadre-audits/${id}`, { method: 'DELETE' })
}

// Friends
export async function sendFriendRequest(payload) {
  return api('/friends/request', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFriendRequests(userId) {
  const data = await api(`/friends/requests/${userId}`)
  return Array.isArray(data) ? data : (data.requests || [])
}

export async function acceptFriendRequest(payload) {
  return api('/friends/accept', { method: 'POST', body: JSON.stringify(payload) })
}

export async function rejectFriendRequest(payload) {
  return api('/friends/reject', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFriends(userId) {
  const data = await api(`/friends/${userId}`)
  return Array.isArray(data) ? data : (data.friends || [])
}

export async function updateUserOnServer(user) {
  if (!user?.id) return
  return updateUser(user.id, user)
}

export async function removeFriend(friendId) {
  return api(`/friends/${friendId}`, { method: 'DELETE' })
}