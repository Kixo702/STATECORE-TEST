import { useEffect, useMemo, useState } from 'react'

/*
  ── Активность лидеров ──────────────────────────────────────────
  Автоматический подсчёт дневной нормы и выговоров по таблице
  активности лидеров (Google Sheets, публикация в интернет).

  ПРАВИЛА (выведены из вашей таблицы и сверены с итоговыми строками):
   • Дневная норма = 2:30:00. Время ≥ нормы → «зелёный» день (норма выполнена).
     Время < нормы → «красный» день (норма не выполнена).
   • «Неактив» — отдельная категория (не красный и не зелёный).
   • «Назначен» / «Нет нормы» / «ПСЖ» — норма в этот день не действует,
     день не учитывается ни в одной из категорий.
   • Пустая ячейка — «без нормы» (данных ещё нет, например до трудоустройства).
   • Среднее время = сумма всех отыгранных секунд / (зелёные + красные дни).
   • Выговоры: 1 красный день — ничего. 2 красных дня — 1 устный выговор.
     3 устных выговора — 1 строгий выговор.

  Если понадобится добавить ещё одну неделю — просто нажмите
  «+ Добавить неделю» и вставьте gid вкладки (или ссылку на неё).
*/

// ── Google Sheets API v4 (вместо «Публикации в интернет» — без кеша Google,
//    данные приходят актуальными сразу после записи) ──
const SPREADSHEET_ID = '1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M'
const SHEETS_API_KEY = 'AIzaSyCVGbcNXOGpKm0lQnHKRNdJ9kIIV26FqZE'
const DEFAULT_GID = '1783162861'

// ── Apps Script (doPost) — запись времени и создание новой недели ──
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhZYSsvPt0QdbyYiAEfvyfu8XVQwOPeYapuG0HwV8CCngctz43msP9K_o4C-ck13Hy/exec'

async function postToScript(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
  let json = null
  try { json = await res.json() } catch { /* Apps Script иногда шлёт нестандартный ответ */ }
  if (!json || json.success === false) {
    throw new Error((json && json.error) || 'Не удалось сохранить изменения')
  }
  return json
}

const NORM_SECONDS = 2 * 3600 + 30 * 60 // 2:30:00 — дневная норма

const clean = (v) => (v || '').toString().replace(/^"|"$/g, '').trim()

function parseDuration(raw) {
  const m = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(clean(raw))
  if (!m) return null
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])
}

function classifyCell(raw) {
  const v = clean(raw)
  if (!v || v === '-' || v === '—') return { type: 'none', seconds: 0, label: '' }
  const secs = parseDuration(v)
  if (secs !== null) {
    return { type: secs >= NORM_SECONDS ? 'ok' : 'fail', seconds: secs, label: v }
  }
  const low = v.toLowerCase()
  if (low.includes('неактив')) return { type: 'inactive', seconds: 0, label: v }
  // Назначен / Нет нормы / ПСЖ / прочие текстовые статусы — норма не применяется
  return { type: 'excluded', seconds: 0, label: v }
}

function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function computeWarnings(failCount) {
  const oral = Math.floor(failCount / 2)
  const strict = Math.floor(oral / 3)
  const oralLeft = oral - strict * 3
  return { oral, strict, oralLeft }
}

/* ───────── Текущая неделя (пн..вс) в формате таблицы дд.мм.гггг ───────── */
function pad2(n) { return String(n).padStart(2, '0') }
function fmtDateRu(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}
function getCurrentWeekRangeStr() {
  const now = new Date()
  const day = now.getDay() // 0 = вс
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${fmtDateRu(monday)} - ${fmtDateRu(sunday)}`
}

async function sheetsApiGet(path, params) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${path}`)
  url.searchParams.set('key', SHEETS_API_KEY)
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message || `Ошибка запроса к Google Sheets API (${res.status})`
    throw new Error(msg)
  }
  return json
}

// gid → название листа (Sheets API читает данные по имени листа, не по gid).
// Кешируем в памяти на время сессии — список вкладок меняется редко,
// а лишний запрос метаданных на каждую загрузку недели не нужен.
const sheetTitleByGidCache = new Map()
async function resolveSheetTitle(gid) {
  if (sheetTitleByGidCache.has(gid)) return sheetTitleByGidCache.get(gid)
  const meta = await sheetsApiGet('', { fields: 'sheets.properties' })
  const sheets = meta.sheets || []
  for (const sh of sheets) {
    sheetTitleByGidCache.set(String(sh.properties.sheetId), sh.properties.title)
  }
  const title = sheetTitleByGidCache.get(String(gid))
  if (!title) throw new Error('Не удалось найти вкладку с таким gid в таблице')
  return title
}

/* ───────── Парсинг одной недели ───────── */
// Структура листа фиксированная:
//  A — пусто · B — никнейм · C — фракция · D — пусто
//  E..K — 7 дней (пн..вс) · L — пусто · M — всего · N — отчёт
const NICK_COL = 1
const FRACTION_COL = 2
const DAY_START_COL = 4

async function fetchWeek(gid) {
  const sheetTitle = await resolveSheetTitle(gid)
  // FORMATTED_VALUE (по умолчанию) отдаёт то же, что видно глазами в таблице —
  // «2:45:00», «Неактив» и т.п., как раньше отдавал CSV-экспорт
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:N2000`
  const data = await sheetsApiGet(`/values/${encodeURIComponent(range)}`, {
    valueRenderOption: 'FORMATTED_VALUE',
  })
  const rows = data.values || []
  if (rows.length === 0) throw new Error('Таблица пуста')

  // Заголовок недели — строка с диапазоном дат "Активность лидеров [... - ...]"
  const rangeRe = /(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\s*-\s*\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/
  const currentWeekRange = getCurrentWeekRangeStr()

  let title = ''
  let titleRowIdx = -1

  // 1) Сначала ищем блок именно текущей недели (реальные пн..вс).
  //    Если таких блоков несколько (кто-то задублировал таблицу) — берём самый верхний,
  //    т.к. новые недели у нас всегда создаются сверху.
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].join(' ')
    if (joined.includes(currentWeekRange)) {
      title = currentWeekRange
      titleRowIdx = i
      break
    }
  }

  // 2) Если блока текущей недели не нашлось (например, ещё не создали новую неделю
  //    и в таблице только прошлые) — берём просто самый верхний блок с любым диапазоном дат.
  if (titleRowIdx === -1) {
    for (let i = 0; i < rows.length; i++) {
      const m = rangeRe.exec(rows[i].join(' '))
      if (m) { title = m[1].replace(/\s+/g, ' '); titleRowIdx = i; break }
    }
  }

  if (titleRowIdx === -1) titleRowIdx = 3 // запасной вариант, если диапазон дат не нашёлся

  // строка с "Понедельник...Воскресенье"
  let dayNameRowIdx = -1
  for (let i = titleRowIdx; i < Math.min(rows.length, titleRowIdx + 10); i++) {
    if (rows[i].some((c) => /понедельник/i.test(clean(c)))) { dayNameRowIdx = i; break }
  }
  if (dayNameRowIdx === -1) dayNameRowIdx = titleRowIdx + 1

  // первая строка ниже, где в колонке B реально стоит никнейм
  let dataStartRowIdx = -1
  for (let i = dayNameRowIdx + 1; i < rows.length; i++) {
    const v = clean(rows[i][NICK_COL])
    if (v && v.toLowerCase() !== 'никнейм') { dataStartRowIdx = i; break }
  }
  if (dataStartRowIdx === -1) throw new Error('Не удалось найти строки с никнеймами лидеров (колонка B)')

  const dateRow = rows[dataStartRowIdx - 1] || []
  const dayNameRow = rows[dayNameRowIdx] || []
  const dayDates = []
  const dayNames = []
  for (let i = 0; i < 7; i++) {
    dayDates.push(clean(dateRow[DAY_START_COL + i]) || '')
    dayNames.push(clean(dayNameRow[DAY_START_COL + i]) || '')
  }

  const leaders = []
  let lastLeaderRowIdx = dataStartRowIdx - 1
  for (let r = dataStartRowIdx; r < rows.length; r++) {
    const row = rows[r]
    const nickname = clean(row[NICK_COL])
    if (!nickname) break // список лидеров закончился — дальше идут итоговые блоки

    const fraction = clean(row[FRACTION_COL])
    const days = []
    for (let i = 0; i < 7; i++) days.push(classifyCell(row[DAY_START_COL + i]))

    const okCount = days.filter((d) => d.type === 'ok').length
    const failCount = days.filter((d) => d.type === 'fail').length
    const inactiveCount = days.filter((d) => d.type === 'inactive').length
    const noneCount = days.filter((d) => d.type === 'none').length
    const excludedCount = days.filter((d) => d.type === 'excluded').length
    const totalSeconds = days.reduce((s, d) => s + ((d.type === 'ok' || d.type === 'fail') ? d.seconds : 0), 0)

    leaders.push({
      // CSV-строки индексируются с 0, а строки листа Google Sheets — с 1
      rowId: r + 1,
      nickname, fraction, days,
      okCount, failCount, inactiveCount, noneCount, excludedCount,
      totalSeconds,
      warnings: computeWarnings(failCount),
    })
    lastLeaderRowIdx = r
  }

  // Границы блока текущей недели в реальных строках листа (1-based) —
  // нужны для CREATE_WEEK (копирование блока целиком, включая шапку с датами)
  const blockStartRow = titleRowIdx + 1
  const blockEndRow = lastLeaderRowIdx + 1

  const totals = leaders.reduce((acc, l) => {
    acc.ok += l.okCount
    acc.fail += l.failCount
    acc.inactive += l.inactiveCount
    acc.none += l.noneCount
    acc.seconds += l.totalSeconds
    return acc
  }, { ok: 0, fail: 0, inactive: 0, none: 0, seconds: 0 })

  const activeCells = totals.ok + totals.fail
  const avgSeconds = activeCells > 0 ? totals.seconds / activeCells : 0

  const topLeaders = [...leaders].sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 3)

  return {
    title: title || 'Неделя', dayDates, dayNames, leaders, totals, avgSeconds, topLeaders,
    blockStartRow, blockEndRow,
  }
}

// Применяет правку одной ячейки к уже загруженным данным недели локально,
// без похода на сервер — чтобы интерфейс обновился мгновенно, не дожидаясь,
// пока кеш Google "Публикации в интернет" догонит только что сделанную запись.
function applyEditToWeekData(data, rowId, dayIndex, rawValue) {
  const leaders = data.leaders.map((l) => {
    if (l.rowId !== rowId) return l
    const days = l.days.slice()
    days[dayIndex] = classifyCell(rawValue)
    const okCount = days.filter((d) => d.type === 'ok').length
    const failCount = days.filter((d) => d.type === 'fail').length
    const inactiveCount = days.filter((d) => d.type === 'inactive').length
    const noneCount = days.filter((d) => d.type === 'none').length
    const excludedCount = days.filter((d) => d.type === 'excluded').length
    const totalSeconds = days.reduce((s, d) => s + ((d.type === 'ok' || d.type === 'fail') ? d.seconds : 0), 0)
    return { ...l, days, okCount, failCount, inactiveCount, noneCount, excludedCount, totalSeconds, warnings: computeWarnings(failCount) }
  })

  const totals = leaders.reduce((acc, l) => {
    acc.ok += l.okCount
    acc.fail += l.failCount
    acc.inactive += l.inactiveCount
    acc.none += l.noneCount
    acc.seconds += l.totalSeconds
    return acc
  }, { ok: 0, fail: 0, inactive: 0, none: 0, seconds: 0 })

  const activeCells = totals.ok + totals.fail
  const avgSeconds = activeCells > 0 ? totals.seconds / activeCells : 0
  const topLeaders = [...leaders].sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 3)

  return { ...data, leaders, totals, avgSeconds, topLeaders }
}

/* ───────── Иконки (в едином наборе со стилем Dashboard) ───────── */
const IC = {
  crown:   <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cross:   <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  moon:    <svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dash:    <svg viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  clock:   <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:       <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
}

const DAY_TYPE_STYLE = {
  ok:       { accent: '52,211,153',  color: '#34d399', icon: IC.check },
  fail:     { accent: '248,113,113', color: '#f87171', icon: IC.cross },
  inactive: { accent: '251,146,60',  color: '#fb923c', icon: IC.moon },
  excluded: { accent: '96,165,250',  color: '#93c5fd', icon: null },
  none:     { accent: '148,163,184', color: 'rgba(255,255,255,.3)', icon: IC.dash },
}

export default function LeaderActivity() {
  const [weeks, setWeeks] = useState([{ id: 0, gid: DEFAULT_GID, label: 'Загрузка…', status: 'loading', data: null, error: '' }])
  const [activeId, setActiveId] = useState(0)
  const [search, setSearch] = useState('')

  // ── Редактор времени (клик по ячейке дня) ──
  const [editCell, setEditCell] = useState(null) // { rowId, nickname, dayIndex, dayLabel, currentValue }
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // ── Создание новой недели ──
  const [creatingWeek, setCreatingWeek] = useState(false)
  const [createError, setCreateError] = useState('')

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // silent = true -> не показываем скелетон и не сбрасываем текущие данные,
  // просто тихо подменяем их, если с сервера пришло что-то новое.
  // Так гасится задержка кеша Google на "Публикации в интернет": первый
  // запрос может прийти чуть устаревшим, а через пару секунд подтягивается
  // актуальная версия без "прыжка" интерфейса в состояние загрузки.
  const loadWeek = async (id, gid, { silent = false } = {}) => {
    if (!silent) {
      setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status: 'loading', error: '' } : w)))
    }
    try {
      const data = await fetchWeek(gid)
      setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status: 'ready', data, label: data.title } : w)))
      return data
    } catch (e) {
      if (!silent) {
        setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, status: 'error', error: e.message || 'Ошибка загрузки' } : w)))
      }
      return null
    }
  }

  useEffect(() => {
    loadWeek(0, DEFAULT_GID)
    // тихий повторный запрос через 2.5с — подчищает устаревший кеш Google,
    // если он попался при самой первой загрузке страницы
    const t = setTimeout(() => { loadWeek(0, DEFAULT_GID, { silent: true }) }, 2500)
    return () => clearTimeout(t)
  }, [])

  const activeWeek = weeks.find((w) => w.id === activeId) || weeks[0]

  // Сохраняет значение одной ячейки (и через модалку, и через контекстное меню):
  // шлёт в Apps Script, тут же применяет правку локально, потом тихо сверяется с сервером.
  const commitCellValue = async (rowId, dayIndex, rawValue) => {
    await postToScript({
      type: 'SET_DAY_TIME',
      rowId,
      dayCol: dayIndex, // 0..6 — скрипт сам переведёт в колонку E..K
      value: rawValue,
    })
    const weekId = activeWeek.id
    const weekGid = activeWeek.gid
    setWeeks((prev) => prev.map((w) => (
      w.id === weekId && w.data
        ? { ...w, data: applyEditToWeekData(w.data, rowId, dayIndex, rawValue) }
        : w
    )))
    setTimeout(() => { loadWeek(weekId, weekGid, { silent: true }) }, 3000)
  }

  // ── Быстрый ввод времени в модалке (часы/минуты вместо ручного "2:30:00") ──
  const [quickH, setQuickH] = useState(0)
  const [quickM, setQuickM] = useState(0)
  const applyQuickTime = (h, m) => {
    const hh = Math.max(0, Math.min(99, Number(h) || 0))
    const mm = Math.max(0, Math.min(59, Number(m) || 0))
    setQuickH(hh)
    setQuickM(mm)
    setEditValue(`${hh}:${String(mm).padStart(2, '0')}:00`)
  }

  const openEditor = (leader, dayIndex) => {
    setEditError('')
    setEditCell({
      rowId: leader.rowId,
      nickname: leader.nickname,
      dayIndex,
      dayLabel: `${d?.dayNames?.[dayIndex] || ''} ${d?.dayDates?.[dayIndex] || ''}`.trim(),
    })
    const currentLabel = leader.days[dayIndex]?.label || ''
    setEditValue(currentLabel)
    const secs = parseDuration(currentLabel)
    if (secs !== null) {
      setQuickH(Math.floor(secs / 3600))
      setQuickM(Math.floor((secs % 3600) / 60))
    } else {
      setQuickH(0)
      setQuickM(0)
    }
  }

  const closeEditor = () => {
    setEditCell(null)
    setEditValue('')
    setEditError('')
  }

  const saveEditor = async () => {
    if (!editCell) return
    setEditSaving(true)
    setEditError('')
    try {
      await commitCellValue(editCell.rowId, editCell.dayIndex, editValue.trim())
      closeEditor()
    } catch (e) {
      setEditError(e.message || 'Не удалось сохранить')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Контекстное меню (ПКМ по ячейке) — быстрые причины без открытия модалки ──
  const [contextMenu, setContextMenu] = useState(null) // { x, y, leader, dayIndex }
  const [contextBusy, setContextBusy] = useState(false)
  const [contextToast, setContextToast] = useState('')

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!contextToast) return
    const t = setTimeout(() => setContextToast(''), 3200)
    return () => clearTimeout(t)
  }, [contextToast])

  const openContextMenu = (e, leader, dayIndex) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, leader, dayIndex })
  }

  const applyQuickOption = async (rawValue) => {
    if (!contextMenu) return
    const { leader, dayIndex } = contextMenu
    setContextMenu(null)
    setContextBusy(true)
    try {
      await commitCellValue(leader.rowId, dayIndex, rawValue)
    } catch (e) {
      setContextToast(e.message || 'Не удалось сохранить')
    } finally {
      setContextBusy(false)
    }
  }

  const QUICK_OPTIONS = [
    { label: 'ПСЖ', value: 'ПСЖ' },
    { label: 'Снят', value: 'Снят' },
    { label: 'Срок', value: 'Срок' },
    { label: 'Пустота', value: '' },
    { label: '0:00:00', value: '0:00:00' },
  ]

  const handleCreateNewWeek = async () => {
    if (!d) return
    setCreateError('')
    setCreatingWeek(true)
    try {
      await postToScript({
        type: 'CREATE_WEEK',
        startRow: d.blockStartRow,
        endRow: d.blockEndRow,
        offset: 20,
      })
      await loadWeek(activeWeek.id, activeWeek.gid)
    } catch (e) {
      setCreateError(e.message || 'Не удалось создать новую неделю')
    } finally {
      setCreatingWeek(false)
    }
  }

  const filteredLeaders = useMemo(() => {
    if (!activeWeek?.data) return []
    const q = search.trim().toLowerCase()
    if (!q) return activeWeek.data.leaders
    return activeWeek.data.leaders.filter((l) =>
      l.nickname.toLowerCase().includes(q) || l.fraction.toLowerCase().includes(q)
    )
  }, [activeWeek, search])

  const d = activeWeek?.data
  const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  const summaryCards = d ? [
    { label: 'Всего отыграно', value: fmtDuration(d.totals.seconds), accent: '96,165,250' },
    { label: 'Среднее за активный день', value: fmtDuration(d.avgSeconds), accent: '167,139,250' },
    { label: 'Норма выполнена', value: `${d.totals.ok} дн.`, accent: '52,211,153' },
    { label: 'Норма не выполнена', value: `${d.totals.fail} дн.`, accent: '248,113,113' },
    { label: 'Неактивных дней', value: `${d.totals.inactive} дн.`, accent: '251,146,60' },
    { label: 'Без нормы (нет данных)', value: `${d.totals.none} дн.`, accent: '148,163,184' },
  ] : []

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes la-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes la-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes la-spin { to { transform: rotate(360deg); } }

        .la-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: la-shimmer 1.6s infinite linear;
          border-radius: 14px; height: 60px;
        }
        .la-table-scroll { overflow-x: auto; }
        .la-table-scroll::-webkit-scrollbar { height: 8px; }
        .la-table-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 999px; }

        .la-day-cell { transition: transform .12s, filter .12s; cursor: pointer; }
        .la-day-cell:hover { filter: brightness(1.25); transform: translateY(-1px); }

        .la-input {
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
          color: #fff; outline: none; transition: border-color .15s;
        }
        .la-input:focus { border-color: rgba(249,115,22,.5); }
      `}</style>

      {/* ── STATUS STRIP ───────────────────────────────── */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-10 flex items-center justify-between text-[11px] font-semibold tracking-wide text-white/35">
          <div className="uppercase">{dateStr}, {timeStr}</div>
          <div className="uppercase truncate max-w-[60%]">{d ? d.title : '—'}</div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="mb-8">
          <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Панель управления · Дисциплина</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Активность лидеров</h1>
          <p className="text-slate-400 max-w-lg">Автоматический подсчёт дневной нормы (2:30:00) и выговоров по данным таблицы</p>
        </div>

        {/* ── БАННЕР ТЕКУЩЕЙ НЕДЕЛИ ───────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-orange-500/20 mb-8 p-5 sm:p-6"
          style={{ background: 'linear-gradient(120deg, rgba(249,115,22,.14) 0%, rgba(249,115,22,.02) 65%)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/15 text-orange-400 shrink-0">
                <span className="w-5 h-5 block">{IC.clock}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold tracking-[2px] uppercase text-orange-400/80 mb-1">Текущая неделя</div>
                <h2 className="text-lg sm:text-xl font-black truncate">
                  {activeWeek?.status === 'loading' ? 'Загрузка…' : activeWeek?.status === 'error' ? 'Ошибка загрузки' : activeWeek?.label}
                </h2>
              </div>
            </div>
            <button
              disabled={activeWeek?.status === 'loading'}
              onClick={() => activeWeek && loadWeek(activeWeek.id, activeWeek.gid)}
              title="Перезапросить данные с таблицы"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.06] border border-white/10 text-white/60 hover:bg-orange-500/15 hover:border-orange-500/30 hover:text-orange-400 transition-all duration-150 shrink-0"
              style={{ opacity: activeWeek?.status === 'loading' ? .6 : 1, cursor: activeWeek?.status === 'loading' ? 'default' : 'pointer' }}
            >
              <span className="w-3.5 h-3.5 block" style={{ animation: activeWeek?.status === 'loading' ? 'la-spin .8s linear infinite' : 'none' }}>{IC.refresh}</span>
              Обновить
            </button>
          </div>
        </div>

        {/* ── ЗАГРУЗКА / ОШИБКА ──────────────────────────── */}
        {activeWeek?.status === 'loading' && (
          <div className="flex flex-col gap-2.5 mb-10">
            {[...Array(4)].map((_, i) => <div key={i} className="la-skeleton" />)}
          </div>
        )}

        {activeWeek?.status === 'error' && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-red-400 text-sm mb-10">
            {activeWeek.error}
          </div>
        )}

        {d && activeWeek.status === 'ready' && (
          <>
            {/* ── ИТОГИ ───────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Итоги недели</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              {summaryCards.map((s) => (
                <div
                  key={s.label}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                  style={{ animation: 'la-fadeUp .3s ease both' }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${s.accent})` }} />
                  <div className="pl-5 pr-5 py-5">
                    <p className="text-slate-400 text-xs uppercase tracking-wide font-bold">{s.label}</p>
                    <h2 className="text-2xl font-black mt-1.5 tabular-nums" style={{ color: `rgb(${s.accent})` }}>{s.value}</h2>
                  </div>
                </div>
              ))}
            </div>

            {/* ── ЛЕГЕНДА ─────────────────────────────────── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 mb-10">
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 items-center text-xs text-slate-400">
                {[
                  { c: DAY_TYPE_STYLE.ok.color, t: 'Норма выполнена (≥ 2:30:00)' },
                  { c: DAY_TYPE_STYLE.fail.color, t: 'Норма не выполнена' },
                  { c: DAY_TYPE_STYLE.inactive.color, t: 'Неактив' },
                  { c: DAY_TYPE_STYLE.excluded.color, t: 'Назначен / Нет нормы / ПСЖ' },
                  { c: 'rgba(255,255,255,.3)', t: 'Без нормы (нет данных)' },
                ].map((it) => (
                  <div key={it.t} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.c }} />
                    {it.t}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                Выговоры: 1 красный день — ничего · 2 красных дня — 1 устный выговор · 3 устных выговора — 1 строгий выговор
              </div>
            </div>

            {/* ── ТОП НЕДЕЛИ ──────────────────────────────── */}
            {d.topLeaders.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Топ недели</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
                  {d.topLeaders.map((l, i) => (
                    <div
                      key={l.nickname}
                      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: i === 0 ? '#f97316' : 'rgba(255,255,255,.15)' }} />
                      <div className="flex items-center gap-4 pl-5 pr-5 py-5">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: i === 0 ? 'rgba(249,115,22,.15)' : 'rgba(255,255,255,.05)', color: i === 0 ? '#f97316' : 'rgba(255,255,255,.4)' }}
                        >
                          <span className="w-5 h-5">{IC.crown}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase" style={{ color: i === 0 ? '#f97316' : 'rgba(255,255,255,.35)' }}>#{i + 1}</p>
                          <h3 className="text-base font-black mt-0.5 truncate">{l.nickname}</h3>
                          <p className="text-xs text-slate-400 mt-1 tabular-nums">{fmtDuration(l.totalSeconds)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── ПОИСК + СОЗДАНИЕ НОВОЙ НЕДЕЛИ ───────────── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Лидеры</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="flex gap-3 items-center flex-wrap mb-4">
              <div className="relative max-w-[360px] flex-1 min-w-[240px]">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4">{IC.search}</span>
                <input
                  className="la-input rounded-xl text-xs font-medium pl-9 pr-3 py-2.5 w-full"
                  placeholder="Поиск по нику или фракции…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button
                disabled={creatingWeek}
                onClick={handleCreateNewWeek}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500/10 border border-dashed border-orange-500/30 text-orange-400 hover:bg-orange-500/15 transition-all duration-150"
                style={{ opacity: creatingWeek ? .6 : 1, cursor: creatingWeek ? 'default' : 'pointer' }}
              >
                <span className="w-3.5 h-3.5">{IC.plus}</span> {creatingWeek ? 'Создаём…' : 'Создать новую неделю'}
              </button>

              {createError && <div className="text-red-400 text-xs">{createError}</div>}
            </div>

            {/* ── ТАБЛИЦА ─────────────────────────────────── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6 mb-4">
              <div className="la-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: 900 }}>
                  <thead>
                    <tr className="text-[10.5px] text-white/30 uppercase tracking-wide font-bold">
                      <th style={{ textAlign: 'left', padding: '0 10px 6px' }}>Лидер</th>
                      {d.dayNames.map((n, i) => (
                        <th key={i} style={{ padding: '0 4px 6px', minWidth: 70 }}>
                          <div>{n || `Д${i + 1}`}</div>
                          <div className="font-normal opacity-60 normal-case tracking-normal">{d.dayDates[i]}</div>
                        </th>
                      ))}
                      <th style={{ padding: '0 8px 6px' }}>Всего</th>
                      <th style={{ padding: '0 8px 6px' }}>Выговоры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaders.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-8 text-white/20 text-sm">Ничего не найдено</td></tr>
                    )}
                    {filteredLeaders.map((l) => {
                      const w = l.warnings
                      return (
                        <tr key={l.nickname} className="bg-white/[0.015] hover:bg-white/[0.03] transition-colors duration-150">
                          <td style={{ padding: '10px 10px', borderRadius: '12px 0 0 12px', whiteSpace: 'nowrap' }}>
                            <div className="text-[13px] font-bold text-slate-100">{l.nickname}</div>
                            <div className="text-[11px] text-white/35">{l.fraction}</div>
                          </td>
                          {l.days.map((day, i) => {
                            const st = DAY_TYPE_STYLE[day.type]
                            const text = day.type === 'ok' || day.type === 'fail' ? day.label
                              : day.type === 'inactive' ? 'Неактив'
                              : day.type === 'excluded' ? (day.label || '—')
                              : '—'
                            return (
                              <td key={i} style={{ padding: '4px' }}>
                                <div
                                  className="la-day-cell flex items-center justify-center gap-1.5 rounded-lg border"
                                  style={{
                                    background: `rgba(${st.accent},.1)`,
                                    borderColor: `rgba(${st.accent},.28)`,
                                    color: st.color,
                                    padding: '7px 5px', fontSize: 11.5, fontWeight: 700, minWidth: 64,
                                  }}
                                  onClick={() => openEditor(l, i)}
                                  onContextMenu={(e) => openContextMenu(e, l, i)}
                                  title="ЛКМ — редактировать, ПКМ — быстрые причины"
                                >
                                  {(day.type === 'ok' || day.type === 'fail') && st.icon && <span className="w-3 h-3 flex-shrink-0">{st.icon}</span>}
                                  <span>{text}</span>
                                </div>
                              </td>
                            )
                          })}
                          <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }} className="font-black text-sm tabular-nums text-blue-300">
                            {fmtDuration(l.totalSeconds)}
                          </td>
                          <td style={{ padding: '10px 8px', borderRadius: '0 12px 12px 0' }}>
                            <div className="flex gap-1.5 justify-center flex-wrap">
                              {w.strict > 0 && (
                                <span className="text-[10.5px] font-extrabold px-2 py-1 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400">
                                  СВ ×{w.strict}
                                </span>
                              )}
                              {w.oralLeft > 0 && (
                                <span className="text-[10.5px] font-extrabold px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-400">
                                  УВ ×{w.oralLeft}
                                </span>
                              )}
                              {w.strict === 0 && w.oralLeft === 0 && (
                                <span className="text-[11px] text-white/20">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── МОДАЛКА РЕДАКТОРА ВРЕМЕНИ ──────────────────── */}
        {editCell && (
          <div
            onClick={closeEditor}
            className="fixed inset-0 z-[200] flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(14px)' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-2xl p-6"
              style={{ maxWidth: 420, background: 'linear-gradient(160deg, #141a2e 0%, #0a0e18 100%)', border: '1px solid rgba(255,255,255,.08)' }}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/35">Редактор времени</div>
                <button onClick={closeEditor} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors">
                  <span className="w-3.5 h-3.5">{IC.x}</span>
                </button>
              </div>
              <div className="text-lg font-black text-white mb-0.5">{editCell.nickname}</div>
              <div className="text-xs text-white/40 mb-5">{editCell.dayLabel}</div>

              <label className="text-[11.5px] text-white/50 block mb-1.5">Быстрый ввод времени</label>
              <div className="flex items-center gap-2 mb-2.5">
                <input
                  type="number" min={0} max={99} value={quickH}
                  onChange={(e) => applyQuickTime(e.target.value, quickM)}
                  className="la-input rounded-lg w-16 px-2 py-2 text-sm text-center tabular-nums"
                />
                <span className="text-white/30 font-bold">:</span>
                <input
                  type="number" min={0} max={59} value={quickM}
                  onChange={(e) => applyQuickTime(quickH, e.target.value)}
                  className="la-input rounded-lg w-16 px-2 py-2 text-sm text-center tabular-nums"
                />
                <span className="text-[11px] text-white/30 ml-1">часы : минуты</span>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((mins) => {
                  const h = Math.floor(mins / 60), m = mins % 60
                  const isNorm = mins === 150
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => applyQuickTime(h, m)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        isNorm
                          ? 'bg-orange-500/15 border border-orange-500/35 text-orange-400'
                          : 'bg-white/[0.04] border border-white/10 text-white/50 hover:bg-white/[0.08] hover:text-white'
                      }`}
                      title={isNorm ? 'Дневная норма' : undefined}
                    >
                      {h}:{String(m).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>

              <label className="text-[11.5px] text-white/50 block mb-1.5">Или введите вручную (время / статус)</label>
              <input
                className="la-input rounded-xl w-full mb-3 px-3 py-2.5 text-sm"
                placeholder="2:45:00 / Неактив / Назначен"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEditor()}
              />

              <div className="flex gap-2 flex-wrap mb-5">
                <button
                  className="px-3 py-2 rounded-lg text-xs font-bold"
                  style={{ background: `rgba(${DAY_TYPE_STYLE.inactive.accent},.1)`, border: `1px solid rgba(${DAY_TYPE_STYLE.inactive.accent},.3)`, color: DAY_TYPE_STYLE.inactive.color }}
                  onClick={() => setEditValue('Неактив')}
                >
                  Неактив
                </button>
                <button
                  className="px-3 py-2 rounded-lg text-xs font-bold"
                  style={{ background: `rgba(${DAY_TYPE_STYLE.excluded.accent},.08)`, border: `1px solid rgba(${DAY_TYPE_STYLE.excluded.accent},.22)`, color: DAY_TYPE_STYLE.excluded.color }}
                  onClick={() => setEditValue('Назначен')}
                >
                  Назначен
                </button>
                <button
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-white/[0.04] border border-white/10 text-white/50"
                  onClick={() => setEditValue('')}
                >
                  Очистить
                </button>
              </div>

              {editError && <div className="text-red-400 text-xs mb-3">{editError}</div>}

              <div className="flex gap-2.5 justify-end">
                <button
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[0.04] border border-dashed border-white/15 text-white/50 hover:bg-white/[0.08] transition-colors"
                  onClick={closeEditor}
                >
                  Отмена
                </button>
                <button
                  disabled={editSaving}
                  onClick={saveEditor}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  style={{ opacity: editSaving ? .6 : 1 }}
                >
                  {editSaving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── КОНТЕКСТНОЕ МЕНЮ (ПКМ по ячейке) ───────────── */}
        {contextMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[250] rounded-xl overflow-hidden py-1.5 min-w-[150px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 170),
              top: Math.min(contextMenu.y, window.innerHeight - 220),
              background: 'linear-gradient(160deg, #141a2e 0%, #0a0e18 100%)',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 12px 32px rgba(0,0,0,.45)',
            }}
          >
            <div className="px-3.5 pt-1.5 pb-2 text-[10px] font-extrabold uppercase tracking-wide text-white/30 truncate">
              {contextMenu.leader.nickname}
            </div>
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => applyQuickOption(opt.value)}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* ── ТОСТ ОШИБКИ БЫСТРОГО ДЕЙСТВИЯ ───────────────── */}
        {contextToast && (
          <div
            className="fixed bottom-6 right-6 z-[260] px-4 py-3 rounded-xl text-xs font-semibold text-red-400 max-w-[320px]"
            style={{ background: 'linear-gradient(160deg, #1a1014 0%, #0a0e18 100%)', border: '1px solid rgba(248,113,113,.3)' }}
          >
            {contextToast}
          </div>
        )}
      </div>
    </div>
  )
}