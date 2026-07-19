// lib/notifications.js
// Лёгкое pub-sub хранилище уведомлений. Любой компонент (например, колокольчик
// в Topbar) может подписаться через subscribeNotifications и получать живые
// обновления, когда EventPlanner (или что угодно другое) вызывает addNotification.

const STORAGE_KEY = 'sc_notifications'
const listeners = new Set()

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

let notifications = load()

function emit() {
  listeners.forEach((cb) => {
    try { cb(notifications) } catch {}
  })
}

export function getNotifications() {
  return notifications
}

export function addNotification({ title, body, type = 'event', meta = {} }) {
  const notif = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title,
    body,
    type,
    meta,
    read: false,
    createdAt: new Date().toISOString(),
  }
  notifications = [notif, ...notifications].slice(0, 100)
  save(notifications)
  emit()
  return notif
}

export function markNotificationRead(id) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  save(notifications)
  emit()
}

export function markAllNotificationsRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  save(notifications)
  emit()
}

export function subscribeNotifications(callback) {
  listeners.add(callback)
  callback(notifications)
  return () => listeners.delete(callback)
}

// Хелпер специально для приглашений на ГРП/мероприятия — вызывается
// из EventPlanner.jsx, когда создатель отмечает нужные фракции.
export function notifyFactionInvite({ organizerNick, organizerFaction, eventTitle, eventId, targetFactionCode }) {
  return addNotification({
    title: 'Приглашение на мероприятие',
    body: `Фракция [${organizerFaction}] приглашает вас принять участие в «${eventTitle}»`,
    type: 'event_invite',
    meta: { eventId, organizerNick, organizerFaction, targetFactionCode },
  })
}