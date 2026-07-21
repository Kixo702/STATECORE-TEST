// src/lib/api.js

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://statecore-api.onrender.com/api').replace(/\/$/, '')

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

export async function removeFriend(friendId) {
  return api(`/friends/${friendId}`, { method: 'DELETE' })
}