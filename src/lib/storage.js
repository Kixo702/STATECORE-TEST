export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return fallback
    if (raw === 'undefined' || raw === 'null') return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.error('getJSON error for', key, e)
    try { localStorage.removeItem(key) } catch {}
    return fallback
  }
}

export function setJSON(key, value) {
  try {
    if (value === undefined) {
      console.warn('setJSON called with undefined for', key)
      return false
    }
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error('setJSON error for', key, e)
    return false
  }
}

export function safeParse(raw, fallback = null) {
  try {
    if (raw === null || raw === undefined) return fallback
    if (raw === 'undefined' || raw === 'null') return fallback
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}
