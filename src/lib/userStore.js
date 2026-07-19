import seedUsers from '../data/sc_users.json'
import { getJSON, setJSON } from './storage'

const STORE_KEY = 'statecore_store'
const LEGACY_USERS_KEY = 'sc_users'
const LEGACY_SESSION_KEY = 'sc_user'
const STORE_VERSION = 1

function normalizeUser(u) {
  if (!u || typeof u !== 'object') return null
  const id = u.id || u.login || u.nickname || `user-${Date.now()}`
  return {
    id,
    login: u.login || u.name || u.id || 'guest',
    nickname: u.nickname || u.name || u.login || u.id || 'Гость',
    vk: u.vk || '',
    forum: u.forum || '',
    password: u.password || '',
    registeredAt: u.registeredAt || new Date().toISOString(),
    roleName: u.roleName || 'Игрок',
    avatar: u.avatar || null,
    ...u,
  }
}

function normalizeUsers(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeUser).filter(Boolean)
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object') return null
  if (!session.id) return null
  return normalizeUser(session)
}

function buildStore(users = [], session = null) {
  return {
    version: STORE_VERSION,
    users: normalizeUsers(users),
    session: normalizeSession(session),
    updatedAt: new Date().toISOString(),
  }
}

function persistStore(store) {
  setJSON(STORE_KEY, store)
  setJSON(LEGACY_USERS_KEY, store.users)
  if (store.session) {
    setJSON(LEGACY_SESSION_KEY, store.session)
  } else {
    setJSON(LEGACY_SESSION_KEY, null)
  }
  try {
    window.dispatchEvent(new CustomEvent('statecore:users-updated'))
  } catch {}
}

export function hydrateUserStore() {
  const existing = getJSON(STORE_KEY, null)
  const legacyUsers = getJSON(LEGACY_USERS_KEY, [])
  const legacySession = getJSON(LEGACY_SESSION_KEY, null)

  if (existing && existing.version === STORE_VERSION && Array.isArray(existing.users)) {
    const users = normalizeUsers(existing.users)
    const session = normalizeSession(existing.session || legacySession)
    const store = buildStore(users, session)
    if (!existing.updatedAt) {
      persistStore(store)
    }
    return store
  }

  const sourceUsers = normalizeUsers(legacyUsers.length ? legacyUsers : seedUsers)
  const store = buildStore(sourceUsers, legacySession)
  persistStore(store)
  return store
}

export function getUsers() {
  return [...hydrateUserStore().users]
}

export function saveUsers(users) {
  const store = buildStore(users, getSession())
  persistStore(store)
  return store.users
}

export function getSession() {
  return hydrateUserStore().session ? { ...hydrateUserStore().session } : null
}

export function setSession(session) {
  const store = buildStore(getUsers(), session)
  persistStore(store)
  return store.session
}

export function clearSession() {
  const store = buildStore(getUsers(), null)
  persistStore(store)
  return null
}

export function upsertUser(user) {
  const normalized = normalizeUser(user)
  if (!normalized) return getUsers()

  const users = getUsers()
  const index = users.findIndex((item) => item.id === normalized.id)
  const nextUsers = [...users]

  if (index === -1) {
    nextUsers.push(normalized)
  } else {
    nextUsers[index] = { ...nextUsers[index], ...normalized }
  }

  saveUsers(nextUsers)
  return nextUsers
}

// Удаляет пользователя из локального кэша (localStorage), которым пользуются
// логин/регистрация как фолбэком поверх бэкенда. Вызывать вместе с deleteUser
// из api.js, чтобы аккаунт не "воскрес" из локального кэша на этом устройстве.
export function removeUser(id) {
  if (!id) return getUsers()
  const users = getUsers().filter((u) => u.id !== id)
  const currentSession = getSession()
  const nextSession = currentSession && currentSession.id === id ? null : currentSession
  const store = buildStore(users, nextSession)
  persistStore(store)
  return store.users
}

export function ensureUserStoreSeeded() {
  return hydrateUserStore()
}