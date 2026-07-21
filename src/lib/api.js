// src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || '/api'

async function api(endpoint, options = {}) {
  const token = localStorage.getItem('statecore_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Ошибка запроса к API')
  }

  return data
}

// Auth API
export async function loginApi(credentials) {
  return await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function registerApi(userData) {
  return await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

// Users API
export async function getUsers() {
  const data = await api('/users')
  return Array.isArray(data) ? data : (data.users || [])
}

export async function getUser(id) {
  const data = await api(`/users/${id}`)
  return data.user || data
}

export async function updateUser(id, updateData) {
  const data = await api(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  })
  return data.user || data
}

// Friends API
export async function sendFriendRequest(toUserId) {
  return await api('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  })
}

export async function acceptFriendRequest(requestId) {
  return await api('/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}

export async function rejectFriendRequest(requestId) {
  return await api('/friends/reject', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}

export async function getFriendRequests(userId) {
  const data = await api(`/friends/requests/${userId}`)
  return Array.isArray(data) ? data : (data.requests || [])
}

export async function getFriends(userId) {
  const data = await api(`/friends/${userId}`)
  return Array.isArray(data) ? data : (data.friends || [])
}

export async function removeFriend(friendId) {
  return await api(`/friends/${friendId}`, {
    method: 'DELETE',
  })
}