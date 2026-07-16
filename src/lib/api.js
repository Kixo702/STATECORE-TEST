const API_BASE = 'https://statecore-test.onrender.com/api'

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
  return data
}

export async function registerUser(payload) {
  return api('/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function loginUser(payload) {
  return api('/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getUsers() {
  return api('/users')
}

export async function getUser(id) {
  return api(`/users/${id}`)
}

export async function sendFriendRequest(payload) {
  return api('/friends/request', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFriendRequests(userId) {
  return api(`/friends/requests/${userId}`)
}

export async function acceptFriendRequest(payload) {
  return api('/friends/accept', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getFriends(userId) {
  return api(`/friends/${userId}`)
}

export async function syncLocalUsers(users, session = null) {
  return api('/sync-local-users', { method: 'POST', body: JSON.stringify({ users, session }) })
}
