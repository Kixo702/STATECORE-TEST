// lib/eventStore.js
// Локальное «хранилище» мероприятий — пока нет бэкенда, пишем в localStorage
// по тому же принципу, что и userStore.js. Если/когда появится API, здесь
// достаточно будет заменить load/save на fetch к серверу и, по аналогии с
// syncLocalUsers из lib/api.js, добавить syncLocalEvents() для подтяжки
// изменений с бэка.

const STORAGE_KEY = 'sc_events'
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

let events = load()

function emit() {
  listeners.forEach((cb) => {
    try { cb(events) } catch {}
  })
}

export function getEvents() {
  return events
}

export function subscribeEvents(callback) {
  listeners.add(callback)
  callback(events)
  return () => listeners.delete(callback)
}

export function addEvent(event) {
  events = [event, ...events]
  save(events)
  emit()
  return event
}

export function updateEvent(eventId, updater) {
  events = events.map((ev) => (ev.id === eventId ? updater(ev) : ev))
  save(events)
  emit()
}

export function removeEvent(eventId) {
  events = events.filter((ev) => ev.id !== eventId)
  save(events)
  emit()
}

export function clearEvents() {
  events = []
  save(events)
  emit()
}