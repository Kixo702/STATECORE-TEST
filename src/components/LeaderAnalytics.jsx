import { useEffect, useMemo, useState, useCallback, Fragment } from 'react'

/*
  ── Аналитика и рейтинг лидеров ─────────────────────────────────────
  Больше не моки — страница читает ту же неделю из той же таблицы,
  что и «Активность лидеров» (Google Sheets API v4), и на её основе
  считает КПД, «Стену Почёта» и «Зону Риска».

  Разбор ячеек и подсчёт выговоров 1-в-1 совпадает с LeaderActivity.jsx:
   • Дневная норма — 2:30:00. Есть время ≥ нормы → green, меньше → fail.
   • «Неактив» — отдельная категория, не зелёная и не красная.
   • «Назначен» / «Нет нормы» / «ПСЖ» — норма не действует, день не в счёт.
   • 2 red-дня = 1 устный выговор (УВ). 3 УВ = 1 строгий выговор (СВ).
  Если понадобится смотреть не текущую, а другую неделю — поменяй GID
  так же, как это делается в LeaderActivity («+ Добавить неделю»).
*/

// ── Google Sheets API v4 (тот же источник, что и у «Активности лидеров») ──
const SPREADSHEET_ID = '1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M'
const SHEETS_API_KEY = 'AIzaSyCVGbcNXOGpKm0lQnHKRNdJ9kIIV26FqZE'
const DEFAULT_GID = '1783162861'

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

function parseRuDate(str) {
  const m = /(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/.exec(str || '')
  if (!m) return null
  let [, d, mo, y] = m
  d = +d; mo = +mo; y = +y
  if (y < 100) y += 2000
  const dt = new Date(y, mo - 1, d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

// Разбирает дату одной ячейки — «14.07.2025» ИЛИ «14.07» (без года).
// Если года нет, подбирает ближайший к referenceDate год (текущий,
// предыдущий или следующий) — это надёжно работает, пока речь о
// последних ~5 неделях (а истории глубже 31 дня система не запрашивает).
function parseCellDate(str, referenceDate) {
  const v = (str || '').toString().trim()
  if (!v) return null
  const full = /^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})$/.exec(v)
  if (full) {
    let [, d, mo, y] = full
    d = +d; mo = +mo; y = +y
    if (y < 100) y += 2000
    const dt = new Date(y, mo - 1, d)
    dt.setHours(0, 0, 0, 0)
    return isNaN(dt.getTime()) ? null : dt
  }
  const short = /^(\d{1,2})[.\/\-](\d{1,2})$/.exec(v)
  if (short) {
    const [, d, mo] = short
    const ref = referenceDate || new Date()
    let best = null
    let bestDiff = Infinity
    for (const y of [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1]) {
      const dt = new Date(y, +mo - 1, +d)
      if (isNaN(dt.getTime())) continue
      const diff = Math.abs(dt.getTime() - ref.getTime())
      if (diff < bestDiff) { bestDiff = diff; best = dt }
    }
    if (best) best.setHours(0, 0, 0, 0)
    return best
  }
  return null
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const WEEK_RANGE_RE = /(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})\s*[-–—]\s*(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/

// Ищет в блоке ячеек текст вида «14.07.2025 - 20.07.2025» и превращает
// его в реальные даты. Используется как запасной вариант в parseWeekHeader —
// основной источник дат теперь строка с датами дней внутри блока.
function extractWeekRangeFromRows(rows) {
  for (const row of rows || []) {
    const joined = (row || []).join(' ')
    const m = WEEK_RANGE_RE.exec(joined)
    if (m) {
      const start = parseRuDate(m[1])
      const end = parseRuDate(m[2])
      if (start && end) return { label: `${m[1]} - ${m[2]}`, start, end }
    }
  }
  return null
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

// ── Разбор ВСЕХ блоков-недель внутри ОДНОГО листа ──
// В этой таблице нет отдельных вкладок по неделям — всё хранится в
// одном листе (Activity), а каждая неделя — это отдельный блок строк,
// идущий друг под другом (новый блок сверху, старые ниже), у каждого
// свой заголовок «Активность лидеров [дд.мм.гггг - дд.мм.гггг]» в
// объединённой ячейке E..K. Чтобы построить историю лидера глубже
// одной недели, нужно один раз выкачать весь лист целиком и найти в
// нём ВСЕ такие блоки, а не искать их по вкладкам/gid — вкладок с
// неделями просто не существует.
function parseAllWeekBlocks(rows) {
  const blocks = []
  let i = 0
  while (i < rows.length) {
    const joined = (rows[i] || []).join(' ')
    const m = WEEK_RANGE_RE.exec(joined)
    if (!m) { i += 1; continue }

    const title = m[0].replace(/\s+/g, ' ')
    const titleRowIdx = i

    // Строка с "Понедельник...Воскресенье" — должна идти в пределах
    // ближайших ~10 строк после заголовка блока.
    let dayNameRowIdx = -1
    for (let j = titleRowIdx; j < Math.min(rows.length, titleRowIdx + 10); j++) {
      if ((rows[j] || []).some((c) => /понедельник/i.test(clean(c)))) { dayNameRowIdx = j; break }
    }
    if (dayNameRowIdx === -1) { i = titleRowIdx + 1; continue } // не настоящий блок недели — просто текст с датами

    // Первая строка данных — где в колонке B реально стоит никнейм
    // (а не заголовок "Никнейм"). Останавливаемся, если случайно
    // упёрлись в заголовок следующего блока раньше, чем нашли данные.
    let dataStartRowIdx = -1
    for (let j = dayNameRowIdx + 1; j < rows.length; j++) {
      if (WEEK_RANGE_RE.test((rows[j] || []).join(' '))) break
      const v = clean((rows[j] || [])[NICK_COL])
      if (v && v.toLowerCase() !== 'никнейм') { dataStartRowIdx = j; break }
    }
    if (dataStartRowIdx === -1) { i = titleRowIdx + 1; continue }

    const dateRow = rows[dataStartRowIdx - 1] || []
    const dayNameRow = rows[dayNameRowIdx] || []
    const dayDates = []
    const dayNames = []
    for (let k = 0; k < 7; k++) {
      dayDates.push(clean(dateRow[DAY_START_COL + k]) || '')
      dayNames.push(clean(dayNameRow[DAY_START_COL + k]) || '')
    }
    const refDate = new Date()
    const dayDateObjs = dayDates.map((s) => parseCellDate(s, refDate))
    const weekStart = dayDateObjs[0] || parseRuDate(m[1])
    const weekEnd = dayDateObjs[6] || parseRuDate(m[2])

    const leaders = []
    let lastLeaderRowIdx = dataStartRowIdx - 1
    for (let r = dataStartRowIdx; r < rows.length; r++) {
      const row = rows[r] || []
      const nickname = clean(row[NICK_COL])
      if (!nickname) break // список лидеров этого блока закончился

      const fraction = clean(row[FRACTION_COL])
      const days = []
      for (let k = 0; k < 7; k++) days.push(classifyCell(row[DAY_START_COL + k]))

      const okCount = days.filter((d) => d.type === 'ok').length
      const failCount = days.filter((d) => d.type === 'fail').length
      const inactiveCount = days.filter((d) => d.type === 'inactive').length
      const noneCount = days.filter((d) => d.type === 'none').length
      const excludedCount = days.filter((d) => d.type === 'excluded').length
      const totalSeconds = days.reduce((s, d) => s + ((d.type === 'ok' || d.type === 'fail') ? d.seconds : 0), 0)

      leaders.push({
        rowId: r + 1,
        nickname, fraction, days,
        okCount, failCount, inactiveCount, noneCount, excludedCount,
        totalSeconds,
        warnings: computeWarnings(failCount),
      })
      lastLeaderRowIdx = r
    }

    if (leaders.length > 0 && weekStart && weekEnd) {
      blocks.push({ title: title || 'Неделя', dayDates, dayNames, dayDateObjs, weekStart, weekEnd, leaders })
    } else {
      console.warn(`[LeaderAnalytics] блок "${title}" (строка ${titleRowIdx + 1}): не удалось разобрать до конца — пропущен`)
    }

    // Следующий блок ищем сразу после последней строки лидеров этого —
    // так не задвоим один и тот же блок и не споткнёмся о случайное
    // совпадение диапазона дат внутри уже разобранных данных.
    i = lastLeaderRowIdx + 1
  }
  return blocks
}

let allBlocksCache = null
let allBlocksPromise = null
async function fetchAllWeekBlocks() {
  if (allBlocksCache && allBlocksCache.length > 0) return allBlocksCache
  if (allBlocksPromise) return allBlocksPromise
  allBlocksPromise = (async () => {
    const sheetTitle = await resolveSheetTitle(DEFAULT_GID)
    const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:N5000`
    const data = await sheetsApiGet(`/values/${encodeURIComponent(range)}`, { valueRenderOption: 'FORMATTED_VALUE' })
    const rows = data.values || []
    const blocks = parseAllWeekBlocks(rows)
    blocks.sort((a, b) => b.weekStart - a.weekStart)
    if (blocks.length === 0) {
      console.warn('[LeaderAnalytics] в листе не найдено ни одного блока недели')
    } else {
      console.info(`[LeaderAnalytics] найдено блоков недель в листе: ${blocks.length}`)
    }
    allBlocksCache = blocks
    return blocks
  })()
  try {
    return await allBlocksPromise
  } finally {
    allBlocksPromise = null
  }
}

// Собирает историю конкретного лидера за N дней назад от сегодня по
// всем найденным блокам-неделям в листе. Если в таблице нет данных
// так глубоко — просто возвращает то, что реально нашлось (без
// «пустых» дней-заглушек).
async function getLeaderHistory(nickname, days) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cutoff = addDays(today, -(days - 1))

  let blocks = []
  try {
    blocks = await fetchAllWeekBlocks()
  } catch (e) {
    console.warn('[LeaderAnalytics] fetchAllWeekBlocks упал:', e.message)
    blocks = []
  }

  const candidates = blocks.filter((w) => w.weekEnd >= cutoff && w.weekStart <= today)

  const byDate = new Map()
  for (const wd of candidates) {
    const target = (wd.leaders || []).find(
      (l) => l.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
    )
    if (!target) continue
    target.days.forEach((d, i) => {
      const date = (wd.dayDateObjs && wd.dayDateObjs[i]) || (wd.weekStart ? addDays(wd.weekStart, i) : null)
      if (!date || isNaN(date.getTime())) return
      if (date < cutoff || date > today) return
      byDate.set(isoDate(date), { date, iso: isoDate(date), type: d.type, seconds: d.seconds, label: d.label })
    })
  }

  // Заполняем ВСЕ дни диапазона подряд, день за днём. Если для
  // какого-то дня нет данных ни в одном блоке (пропущенная неделя
  // или дыра в таблице), всё равно кладём его в массив как «нет
  // данных» вместо того, чтобы молча выбросить — иначе график за
  // 14/31 день визуально терял отдельные дни и сдвигался.
  const records = []
  for (let d = new Date(cutoff); d <= today; d = addDays(d, 1)) {
    const iso = isoDate(d)
    records.push(byDate.get(iso) || { date: new Date(d), iso, type: 'none', seconds: 0, label: '' })
  }

  const foundCount = records.filter((r) => r.type !== 'none').length
  return { records, requestedDays: days, weeksUsed: candidates.length, foundCount }
}

function pad2(n) { return String(n).padStart(2, '0') }
function fmtDateRu(d) { return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}` }
function getCurrentWeekRangeStr() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${fmtDateRu(monday)} - ${fmtDateRu(sunday)}`
}

// A — пусто · B — никнейм · C — фракция · D — пусто · E..K — 7 дней · M — всего
const NICK_COL = 1
const FRACTION_COL = 2
const DAY_START_COL = 4

// Общий разбор шапки вкладки-недели: заголовок, строка с днями недели,
// строка с датами дней и — из неё — реальные календарные даты каждого
// из 7 дней. Используется и для полной загрузки недели, и для быстрого
// «обзора» всех вкладок в таблице (нужен, чтобы искать более раннюю
// историю активности лидера).
function parseWeekHeader(rows) {
  const rangeRe = /(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\s*[-–—]\s*\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/
  const currentWeekRange = getCurrentWeekRangeStr()

  let title = ''
  let titleRowIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i] || []).join(' ').includes(currentWeekRange)) { title = currentWeekRange; titleRowIdx = i; break }
  }
  if (titleRowIdx === -1) {
    for (let i = 0; i < rows.length; i++) {
      const m = rangeRe.exec((rows[i] || []).join(' '))
      if (m) { title = m[1].replace(/\s+/g, ' '); titleRowIdx = i; break }
    }
  }
  if (titleRowIdx === -1) titleRowIdx = 3

  let dayNameRowIdx = -1
  for (let i = titleRowIdx; i < Math.min(rows.length, titleRowIdx + 10); i++) {
    if ((rows[i] || []).some((c) => /понедельник/i.test(clean(c)))) { dayNameRowIdx = i; break }
  }
  if (dayNameRowIdx === -1) dayNameRowIdx = titleRowIdx + 1

  let dataStartRowIdx = -1
  for (let i = dayNameRowIdx + 1; i < rows.length; i++) {
    const v = clean((rows[i] || [])[NICK_COL])
    if (v && v.toLowerCase() !== 'никнейм') { dataStartRowIdx = i; break }
  }

  // Строка с датами дней — как правило прямо над первой строкой данных.
  // Если строк данных в этом (обрезанном для «обзора») диапазоне ещё
  // не видно, берём строку сразу под названиями дней недели.
  const dateRow = dataStartRowIdx > 0 ? (rows[dataStartRowIdx - 1] || []) : (rows[dayNameRowIdx + 1] || [])
  const dayNameRow = rows[dayNameRowIdx] || []
  const dayDates = []
  const dayNames = []
  for (let i = 0; i < 7; i++) {
    dayDates.push(clean(dateRow[DAY_START_COL + i]) || '')
    dayNames.push(clean(dayNameRow[DAY_START_COL + i]) || '')
  }

  // Реальные даты каждого дня — из самой строки с датами (та же самая,
  // что уже сейчас корректно показывается в таблице и в подсказках).
  const today = new Date()
  const dayDateObjs = dayDates.map((s) => parseCellDate(s, today))
  let weekStart = dayDateObjs[0] || null
  let weekEnd = dayDateObjs[6] || null
  if (!weekStart || !weekEnd) {
    const textRange = extractWeekRangeFromRows(rows)
    if (textRange) {
      weekStart = weekStart || textRange.start
      weekEnd = weekEnd || textRange.end
    }
  }

  return { title: title || 'Неделя', dayNameRowIdx, dataStartRowIdx, dayDates, dayNames, dayDateObjs, weekStart, weekEnd }
}

async function fetchWeek(gid) {
  const sheetTitle = await resolveSheetTitle(gid)
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:N2000`
  const data = await sheetsApiGet(`/values/${encodeURIComponent(range)}`, { valueRenderOption: 'FORMATTED_VALUE' })
  const rows = data.values || []
  if (rows.length === 0) throw new Error('Таблица пуста')

  const header = parseWeekHeader(rows)
  if (header.dataStartRowIdx === -1) throw new Error('Не удалось найти строки с никнеймами лидеров (колонка B)')

  const leaders = []
  for (let r = header.dataStartRowIdx; r < rows.length; r++) {
    const row = rows[r]
    const nickname = clean(row[NICK_COL])
    if (!nickname) break

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
      rowId: r + 1,
      nickname, fraction, days,
      okCount, failCount, inactiveCount, noneCount, excludedCount,
      totalSeconds,
      warnings: computeWarnings(failCount),
    })
  }

  return {
    title: header.title,
    dayDates: header.dayDates,
    dayNames: header.dayNames,
    dayDateObjs: header.dayDateObjs,
    weekStart: header.weekStart,
    weekEnd: header.weekEnd,
    leaders,
  }
}

/* ───────── КПД — теперь считается по реальным данным недели ─────────
   До 65 баллов — онлайн: сколько от нормы недели реально отыграно
   (норма = кол-во дней, где норма действовала × 2:30:00).
   До 35 баллов — дисциплина: минус за непогашенные устные и строгие.
*/
export function calculateKPD(l) {
  const activeDays = (l.okCount || 0) + (l.failCount || 0)
  const normSeconds = activeDays > 0 ? activeDays * NORM_SECONDS : NORM_SECONDS
  const onlineRatio = Math.min((l.totalSeconds || 0) / normSeconds, 1)
  const onlineScore = onlineRatio * 65

  const oralLeft = l.warnings?.oralLeft || 0
  const strict = l.warnings?.strict || 0
  const oralPenalty = Math.min(oralLeft * 6, 20)
  const strictPenalty = Math.min(strict * 15, 35)
  const disciplineScore = Math.max(35 - oralPenalty - strictPenalty, 0)

  return {
    value: Math.round(Math.max(0, Math.min(100, onlineScore + disciplineScore))),
    hasData: activeDays > 0,
  }
}

// «Стена Почёта»: неделя без единого fail-дня и без единого выговора
function isTopLeader(l) {
  return l.okCount > 0 && l.failCount === 0 && l.warnings.oral === 0
}

// «Зона Риска»: уже есть строгий, ИЛИ 2+ непогашенных устных («УВ ×2»),
// ИЛИ критически мало времени относительно недельной нормы
function isAtRisk(l) {
  const activeDays = l.okCount + l.failCount
  const normSeconds = activeDays > 0 ? activeDays * NORM_SECONDS : 0
  const criticalOnline = activeDays > 0 && l.totalSeconds < normSeconds * 0.5
  const closeToRemoval = l.warnings.strict > 0
  const manyOral = l.warnings.oralLeft >= 2
  return criticalOnline || closeToRemoval || manyOral
}

/* ───────── Визуальный язык — насыщенный, с акцентными свечениями ───────── */
const IC = {
  medal:   <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  alert:   <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01m-8.51-1L10.27 4.5a2 2 0 013.46 0l6.77 11.5A2 2 0 0118.77 19H5.23a2 2 0 01-1.73-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  search:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cross:   <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/></svg>,
  moon:    <svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dash:    <svg viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  fire:    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1 3-3 4-3 8a3 3 0 006 0c1.5 1.5 2 3 2 5a5 5 0 01-10 0c0-4 3-6 5-13z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bolt:    <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  users:   <svg viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

// Насыщенные брендовые цвета — без полупрозрачной "пыли"
const C = {
  green: '#22e29a',
  red: '#ff5c72',
  amber: '#ffb84d',
  blue: '#5bb8ff',
  orange: '#fb923c',
  pink: '#f0468f',
}

const DAY_TYPE_STYLE = {
  ok:       { color: C.green, glow: 'rgba(34,226,154,.55)', bg: 'linear-gradient(145deg,#1c6b52,#0c3628)', icon: IC.check },
  fail:     { color: C.red,   glow: 'rgba(255,92,114,.55)', bg: 'linear-gradient(145deg,#7a2233,#3a0f18)', icon: IC.cross },
  inactive: { color: C.amber, glow: 'rgba(255,184,77,.4)',  bg: 'linear-gradient(145deg,#7a5215,#3a2708)', icon: IC.moon },
  excluded: { color: C.blue,  glow: 'rgba(91,184,255,.3)',  bg: 'linear-gradient(145deg,#1e4a72,#0d2438)', icon: null },
  none:     { color: 'rgba(255,255,255,.3)', glow: 'transparent', bg: 'rgba(255,255,255,.03)', icon: IC.dash },
}

const DAY_LABELS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function DayCells({ leader, dayNames, dayDates, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <div className="flex items-center gap-1.5">
      {leader.days.map((d, i) => {
        const style = DAY_TYPE_STYLE[d.type]
        const title = `${dayNames?.[i] || DAY_LABELS_SHORT[i]} ${dayDates?.[i] || ''} — ${d.label || 'нет данных'}`.trim()
        return (
          <div key={i} className="flex flex-col items-center gap-1" title={title}>
            <div
              className={`${dim} rounded-lg flex items-center justify-center transition-transform hover:scale-110`}
              style={{ background: style.bg, boxShadow: d.type !== 'none' ? `0 0 10px ${style.glow}` : 'none', color: style.color }}
            >
              {style.icon && <span className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}>{style.icon}</span>}
            </div>
            <span className="text-[9px] font-semibold text-white/30">{DAY_LABELS_SHORT[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function KpdRing({ value, hasData, size = 64 }) {
  const color = !hasData ? 'rgba(255,255,255,.2)' : value >= 80 ? C.green : value >= 50 ? C.orange : C.red
  const r = 24
  const c = 2 * Math.PI * r
  const offset = c - ((hasData ? value : 0) / 100) * c

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="30" cy="30" r={r} stroke="rgba(255,255,255,.08)" strokeWidth="6" fill="none" />
        <circle
          cx="30" cy="30" r={r} stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-base font-black text-white tabular-nums">
        {hasData ? value : '—'}
      </div>
    </div>
  )
}

function Chip({ label, tone = 'slate' }) {
  const tones = {
    slate: { bg: 'rgba(255,255,255,.08)', color: '#fff' },
    red: { bg: C.red, color: '#1a0509' },
    amber: { bg: C.amber, color: '#2a1a03' },
    green: { bg: C.green, color: '#052014' },
  }
  const t = tones[tone]
  return (
    <span
      className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm"
      style={{ background: t.bg, color: t.color }}
    >
      {label}
    </span>
  )
}

const TONE_ACCENT = { slate: '148,163,184', green: '34,226,154', red: '255,92,114', orange: '251,146,60' }

function StatCard({ label, value, sub, tone = 'orange', icon }) {
  const accent = TONE_ACCENT[tone]
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accent})` }} />
      <div className="flex items-center justify-between pl-5 pr-5 py-5">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <h2 className="text-3xl font-black mt-1.5 tabular-nums text-white">{value}</h2>
          {sub && <div className="text-xs text-white/40 mt-1 font-medium">{sub}</div>}
        </div>
        {icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(${accent},.12)`, color: `rgb(${accent})` }}>
            <span className="w-5 h-5 block">{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TopLeaderCard({ leader, dayNames, dayDates, rank, onClick }) {
  const kpd = calculateKPD(leader)
  const medal = ['🥇', '🥈', '🥉'][rank] || null
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 cursor-pointer"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${TONE_ACCENT.green})` }} />
      <div className="pl-5 pr-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
              style={{ background: `rgba(${TONE_ACCENT.green},.12)`, color: `rgb(${TONE_ACCENT.green})` }}
            >
              {leader.nickname[0]?.toUpperCase()}
            </div>
            {medal && <span className="absolute -top-2 -left-2 text-lg">{medal}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-[15px] truncate">{leader.nickname}</div>
            <div className="text-xs text-slate-400 truncate font-medium">{leader.fraction || 'Без фракции'}</div>
          </div>
          <KpdRing value={kpd.value} hasData={kpd.hasData} />
        </div>

        <div className="mt-4">
          <DayCells leader={leader} dayNames={dayNames} dayDates={dayDates} />
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <Chip label="0 нарушений" tone="green" />
          <Chip label={fmtDuration(leader.totalSeconds)} tone="slate" />
        </div>
      </div>
    </div>
  )
}

function RiskLeaderCard({ leader, dayNames, dayDates, onClick }) {
  const kpd = calculateKPD(leader)
  const activeDays = leader.okCount + leader.failCount
  const normSeconds = activeDays > 0 ? activeDays * NORM_SECONDS : 0
  const criticalOnline = activeDays > 0 && leader.totalSeconds < normSeconds * 0.5

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 cursor-pointer"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${TONE_ACCENT.red})` }} />
      <div className="pl-5 pr-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
            style={{ background: `rgba(${TONE_ACCENT.red},.12)`, color: `rgb(${TONE_ACCENT.red})` }}
          >
            {leader.nickname[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-[15px] truncate">{leader.nickname}</div>
            <div className="text-xs text-slate-400 truncate font-medium">{leader.fraction || 'Без фракции'}</div>
          </div>
          <span className="w-6 h-6 flex-shrink-0" style={{ color: C.red }}>{IC.alert}</span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <DayCells leader={leader} dayNames={dayNames} dayDates={dayDates} />
          <span className="text-xl font-black tabular-nums" style={{ color: C.red }}>{kpd.hasData ? kpd.value : '—'}</span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {criticalOnline && <Chip label={`Онлайн ${fmtDuration(leader.totalSeconds)}`} tone="red" />}
          {leader.warnings.strict > 0 && <Chip label={`СВ ×${leader.warnings.strict}`} tone="red" />}
          {leader.warnings.oralLeft >= 2 && <Chip label={`УВ ×${leader.warnings.oralLeft}`} tone="amber" />}
        </div>
      </div>
    </div>
  )
}

/* ───────── Модалка со статистикой конкретного лидера ─────────
   Открывается по клику на лидера (Стена Почёта / Зона Риска / Полный
   рейтинг). Показывает диаграмму онлайна по дням с фильтром
   7 / 14 / 31 день — при необходимости подтягивая предыдущие недели
   из той же Google-таблицы. Если данных так глубоко нет — просто
   показывает то, что реально нашлось. */

// Линейный график онлайна по дням — как на биржевых графиках: линия +
// заливка под ней, точки по дням, вертикальная «прицельная» линия и
// подсказка при наведении курсором. Дни без активности (нет данных /
// неактив / назначен и т.п.) не тянут линию к нулю — там она рвётся,
// как разрыв в котировках, а сам день отмечается точкой на нулевой
// отметке своим цветом/статусом.
function ActivityChart({ records }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  const maxSeconds = Math.max(NORM_SECONDS * 1.15, ...records.map((r) => r.seconds || 0), 1)
  const chartH = 150
  const padTop = 26
  const svgH = chartH + padTop
  const colW = records.length > 20 ? 34 : records.length > 10 ? 40 : 48
  const svgW = Math.max(colW * records.length, colW)

  const xFor = (i) => i * colW + colW / 2
  const yFor = (secs) => padTop + chartH - (secs / maxSeconds) * chartH
  const normY = yFor(NORM_SECONDS)
  const baseY = padTop + chartH

  const segments = []
  let current = []
  records.forEach((r, i) => {
    const hasBar = r.type === 'ok' || r.type === 'fail'
    if (hasBar) {
      current.push([xFor(i), yFor(r.seconds)])
    } else if (current.length) {
      segments.push(current)
      current = []
    }
  })
  if (current.length) segments.push(current)

  const linePath = segments.map((seg) => 'M' + seg.map(([x, y]) => `${x},${y}`).join(' L')).join(' ')
  const areaPath = segments
    .map((seg) => {
      const first = seg[0]
      const last = seg[seg.length - 1]
      return `M${first[0]},${baseY} L${seg.map(([x, y]) => `${x},${y}`).join(' L')} L${last[0]},${baseY} Z`
    })
    .join(' ')

  const hovered = hoverIdx != null ? records[hoverIdx] : null
  const hoveredHasBar = hovered && (hovered.type === 'ok' || hovered.type === 'fail')

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let idx = Math.floor(x / colW)
    idx = Math.max(0, Math.min(records.length - 1, idx))
    setHoverIdx(idx)
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col" style={{ minWidth: '100%' }}>
        <div
          className="relative"
          style={{ height: svgH, width: svgW }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <svg width={svgW} height={svgH} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.orange} stopOpacity="0.35" />
                <stop offset="100%" stopColor={C.orange} stopOpacity="0" />
              </linearGradient>
            </defs>

            <line x1={0} y1={normY} x2={svgW} y2={normY} stroke="rgba(255,255,255,.15)" strokeDasharray="4 4" />
            <text x={svgW} y={normY - 6} textAnchor="end" fontSize="9" fontWeight="700" fill="rgba(255,255,255,.3)">норма 2:30</text>

            {areaPath && <path d={areaPath} fill="url(#activityFill)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={C.orange}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,140,0,.45))' }}
              />
            )}

            {hoverIdx != null && (
              <line x1={xFor(hoverIdx)} y1={padTop} x2={xFor(hoverIdx)} y2={baseY} stroke="rgba(255,255,255,.15)" strokeDasharray="3 3" />
            )}

            {records.map((r, i) => {
              const hasBar = r.type === 'ok' || r.type === 'fail'
              const style = DAY_TYPE_STYLE[r.type]
              const isHover = hoverIdx === i
              return (
                <circle
                  key={r.iso}
                  cx={xFor(i)}
                  cy={hasBar ? yFor(r.seconds) : baseY}
                  r={isHover ? 5.5 : hasBar ? 3.5 : 3}
                  fill={style.color}
                  fillOpacity={hasBar ? 1 : isHover ? 1 : 0.55}
                  stroke="rgba(10,14,24,.9)"
                  strokeWidth={isHover ? 2 : 1.5}
                  style={{ transition: 'r .15s ease, fill-opacity .15s ease' }}
                />
              )
            })}
          </svg>

          {hovered && (
            <div
              className="absolute pointer-events-none rounded-lg px-2.5 py-1.5 text-[10px] font-bold whitespace-nowrap bg-[#0b0f1c] border border-white/15 shadow-xl z-10"
              style={{
                left: Math.min(Math.max(xFor(hoverIdx), 40), svgW - 40),
                top: hoveredHasBar ? yFor(hovered.seconds) - 12 : baseY - 12,
                transform: 'translate(-50%, -100%)',
                color: DAY_TYPE_STYLE[hovered.type].color,
              }}
            >
              <div>{hoveredHasBar ? fmtDuration(hovered.seconds) : (hovered.label || 'нет данных')}</div>
              <div className="text-white/40 font-semibold">
                {pad2(hovered.date.getDate())}.{pad2(hovered.date.getMonth() + 1)}.{hovered.date.getFullYear()}
              </div>
            </div>
          )}
        </div>

        <div className="flex mt-2">
          {records.map((r, i) => {
            const wd = DAY_LABELS_SHORT[(r.date.getDay() + 6) % 7]
            const isHover = hoverIdx === i
            return (
              <div key={r.iso} className="flex-shrink-0 text-center" style={{ width: colW }}>
                <div className={`text-[9px] font-bold ${isHover ? 'text-white' : 'text-white/40'}`}>
                  {pad2(r.date.getDate())}.{pad2(r.date.getMonth() + 1)}
                </div>
                <div className="text-[8px] font-semibold text-white/25">{wd}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone = 'slate' }) {
  const colorMap = { slate: '#fff', green: C.green, red: C.red, amber: C.amber }
  return (
    <div className="rounded-xl px-3.5 py-3 bg-white/[0.02] border border-white/[0.06]">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/35">{label}</div>
      <div className="text-base font-black mt-1 tabular-nums" style={{ color: colorMap[tone] }}>{value}</div>
    </div>
  )
}

const HISTORY_RANGES = [
  { days: 7, label: '7 дней' },
  { days: 14, label: '14 дней' },
  { days: 31, label: '31 день' },
]

// ── Сферы ──
// Пока данными реально наполнена только «Государственные организации»
// (та же таблица, что и раньше). Остальные сферы уже показываем в
// переключателе, чтобы люди видели, что они на подходе, но раздел для
// них временно недоступен — с провайдерами данных по ним ещё не
// договорились.
const SPHERES = [
  { id: 'gov', label: 'Государственные организации', ready: true },
  { id: 'business', label: 'Бизнес организации', ready: false },
  { id: 'bikers', label: 'Байкерские клубы', ready: false },
  { id: 'street', label: 'Уличные группировки', ready: false },
  { id: 'mafia', label: 'Мафиозные синдикаты', ready: false },
]

function LeaderStatsPanel({ leader, onClose }) {
  const [range, setRange] = useState(7)
  const [state, setState] = useState({ status: 'loading', records: [], weeksUsed: 0, foundCount: 0, error: '' })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading' }))
    getLeaderHistory(leader.nickname, range)
      .then((res) => { if (!cancelled) setState({ status: 'ready', records: res.records, weeksUsed: res.weeksUsed, foundCount: res.foundCount, error: '' }) })
      .catch((e) => { if (!cancelled) setState({ status: 'error', records: [], weeksUsed: 0, foundCount: 0, error: e.message || 'Ошибка загрузки' }) })
    return () => { cancelled = true }
  }, [leader.nickname, range])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const records = state.records
  const activeDays = records.filter((r) => r.type === 'ok' || r.type === 'fail')
  const okDays = records.filter((r) => r.type === 'ok').length
  const inactiveDays = records.filter((r) => r.type === 'inactive').length
  const totalSeconds = activeDays.reduce((s, r) => s + r.seconds, 0)
  const avgSeconds = activeDays.length ? totalSeconds / activeDays.length : 0
  const kpd = calculateKPD(leader)

  return (
    <div
      className="relative rounded-2xl border overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#141b30,#0b0f1c)', borderColor: `rgba(${TONE_ACCENT.orange},.35)` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${TONE_ACCENT.orange})` }} />

      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white flex-shrink-0"
            style={{ background: `rgba(${TONE_ACCENT.orange},.15)`, color: `rgb(${TONE_ACCENT.orange})` }}
          >
            {leader.nickname[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-white truncate">{leader.nickname}</div>
            <div className="text-xs text-white/45 font-medium truncate">{leader.fraction || 'Без фракции'} · КПД {kpd.hasData ? kpd.value : '—'}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-150"
        >
          <span className="w-3.5 h-3.5 block">{IC.cross}</span>
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {HISTORY_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                range === r.days
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {state.status === 'loading' && (
          <div className="h-48 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        )}

        {state.status === 'error' && (
          <div className="rounded-xl p-6 text-center text-sm bg-white/[0.015] border border-white/[0.08]" style={{ color: C.red }}>
            Не удалось загрузить историю: {state.error}
          </div>
        )}

        {state.status === 'ready' && records.length === 0 && (
          <div className="rounded-xl p-8 text-center text-white/35 text-sm bg-white/[0.015] border border-white/[0.08]">
            Данных по этому лидеру за выбранный период не найдено
          </div>
        )}

        {state.status === 'ready' && records.length > 0 && (
          <>
            <ActivityChart records={records} />

            {state.foundCount < range && (
              <div className="text-xs text-white/35 font-medium">
                Данные найдены за {state.foundCount} из {range} дней — за остальные дни записей в таблице нет
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Онлайн за период" value={fmtDuration(totalSeconds)} />
              <MiniStat label="В среднем/день" value={fmtDuration(avgSeconds)} />
              <MiniStat label="Норма выполнена" value={`${okDays}/${activeDays.length || 0}`} tone={okDays >= activeDays.length - okDays ? 'green' : 'red'} />
              <MiniStat label="Неактив" value={inactiveDays} tone="amber" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LeaderAnalytics() {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [week, setWeek] = useState(null)
  const [search, setSearch] = useState('')
  const [fractionFilter, setFractionFilter] = useState('all')
  const [sphere, setSphere] = useState('gov')
  const [sphereLoading, setSphereLoading] = useState(false)
  // { leader, section } — section нужна, чтобы панель разворачивалась
  // только под той карточкой, где кликнули (лидер может встречаться
  // сразу в нескольких списках: Стена Почёта / Зона Риска / Рейтинг).
  const [selected, setSelected] = useState(null)

  const selectLeader = useCallback((leader, section) => {
    setSelected((prev) => (prev && prev.section === section && prev.leader.rowId === leader.rowId ? null : { leader, section }))
  }, [])
  const closeLeader = useCallback(() => setSelected(null), [])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatus('loading')
    try {
      const data = await fetchWeek(DEFAULT_GID)
      setWeek(data)
      setStatus('ready')
      setError('')
    } catch (e) {
      setError(e.message || 'Не удалось загрузить данные')
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // При переключении на сферу, которая ещё не подключена, коротко
  // показываем «загрузку», чтобы не выглядело как будто кнопка просто
  // не работает, а затем — честное «временно недоступно».
  useEffect(() => {
    const meta = SPHERES.find((s) => s.id === sphere)
    if (!meta || meta.ready) { setSphereLoading(false); return }
    setSphereLoading(true)
    const t = setTimeout(() => setSphereLoading(false), 900)
    return () => clearTimeout(t)
  }, [sphere])

  const currentSphere = SPHERES.find((s) => s.id === sphere) || SPHERES[0]

  const leaders = week?.leaders || []

  const fractions = useMemo(
    () => ['all', ...Array.from(new Set(leaders.map((l) => l.fraction).filter(Boolean))).sort()],
    [leaders]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leaders.filter((l) => {
      const matchesQuery = !q || l.nickname.toLowerCase().includes(q) || (l.fraction || '').toLowerCase().includes(q)
      const matchesFraction = fractionFilter === 'all' || l.fraction === fractionFilter
      return matchesQuery && matchesFraction
    })
  }, [leaders, search, fractionFilter])

  const topLeaders = useMemo(() => filtered.filter(isTopLeader).sort((a, b) => b.totalSeconds - a.totalSeconds), [filtered])
  const riskLeaders = useMemo(
    () => filtered.filter(isAtRisk).sort((a, b) => (b.warnings.strict - a.warnings.strict) || (b.warnings.oralLeft - a.warnings.oralLeft)),
    [filtered]
  )
  const sortedAll = useMemo(
    () => [...filtered].sort((a, b) => calculateKPD(b).value - calculateKPD(a).value),
    [filtered]
  )

  const avgKpd = useMemo(() => {
    const withData = filtered.map((l) => calculateKPD(l)).filter((k) => k.hasData)
    if (withData.length === 0) return '—'
    return Math.round(withData.reduce((s, k) => s + k.value, 0) / withData.length)
  }, [filtered])

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 space-y-8">
        {/* HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Лидеры</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Аналитика и рейтинг</h1>
            <p className="text-slate-400 max-w-lg">КПД, «Стена Почёта» и «Зона Риска» — по той же таблице, что и «Активность лидеров»</p>
          </div>
          <button
            onClick={() => load()}
            style={{
              width: 44, height: 44,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, color: 'rgba(255,255,255,.45)',
              cursor: 'pointer', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,140,0,.1)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,.25)'; e.currentTarget.style.color = '#ff8c00' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.45)' }}
            title="Обновить данные"
          >
            <span className={`w-4 h-4 block ${status === 'loading' ? 'animate-spin' : ''}`}>{IC.refresh}</span>
          </button>
        </div>

        {/* СФЕРА */}
        <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Сфера</span>
          <div className="flex flex-wrap gap-2">
            {SPHERES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSphere(s.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                  sphere === s.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.label}
                {!s.ready && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                      sphere === s.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    скоро
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {!currentSphere.ready ? (
          /* СФЕРА ЕЩЁ НЕ ПОДКЛЮЧЕНА */
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-10 sm:p-14 text-center">
            {sphereLoading ? (
              <>
                <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#ff8c00' }} />
                <div className="text-sm font-bold text-white/70">Загружаем «{currentSphere.label}»…</div>
              </>
            ) : (
              <>
                <div
                  className="mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.35)' }}
                >
                  <span className="w-5 h-5 block">{IC.moon}</span>
                </div>
                <div className="text-sm font-black text-white/80 mb-1.5">Временно недоступно</div>
                <div className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                  Раздел «{currentSphere.label}» ещё готовится — аналитика по нему появится здесь позже.
                </div>
              </>
            )}
          </div>
        ) : (
        <>
        {/* ФИЛЬТРЫ */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Поиск</span>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40">{IC.search}</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ник или фракция..."
                className="w-full sm:w-64 pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-bold text-white placeholder:text-white/35 placeholder:font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all duration-150"
              />
            </div>
          </div>

          {fractions.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Фракция</span>
              <div className="flex flex-wrap gap-2">
                {fractions.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFractionFilter(f)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      fractionFilter === f
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Все фракции' : f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* СОСТОЯНИЕ ЗАГРУЗКИ / ОШИБКИ */}
        {status === 'loading' && !week && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-white/[0.015] border border-white/[0.08]" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 text-center">
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${TONE_ACCENT.red})` }} />
            <div className="text-sm font-bold" style={{ color: C.red }}>Не удалось загрузить данные</div>
            <div className="text-xs text-white/45 mt-1 mb-4">{error}</div>
            <button
              onClick={() => load()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors duration-150"
            >
              Повторить попытку
            </button>
          </div>
        )}

      {week && (
        <>
          {/* СТАТИСТИКА НЕДЕЛИ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Лидеров в выборке" value={filtered.length} tone="slate" icon={IC.users} />
            <StatCard label="Средний КПД" value={avgKpd} tone="orange" icon={IC.bolt} />
            <StatCard label="Стена почёта" value={topLeaders.length} tone="green" sub="без единого нарушения" icon={IC.medal} />
            <StatCard label="Зона риска" value={riskLeaders.length} tone="red" sub="требуют внимания" icon={IC.fire} />
          </div>

          {/* СТЕНА ПОЧЁТА */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35 whitespace-nowrap">Стена Почёта</span>
              <span className="text-xs text-white/35">— идеальный онлайн, без нарушений</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {topLeaders.length === 0 ? (
              <div className="rounded-xl p-8 text-center text-white/35 text-sm bg-white/[0.015] border border-white/[0.08]">
                Пока никто не соответствует критериям идеального лидера
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {topLeaders.map((l, i) => (
                  <Fragment key={l.rowId}>
                    <TopLeaderCard leader={l} dayNames={week.dayNames} dayDates={week.dayDates} rank={i} onClick={() => selectLeader(l, 'top')} />
                    {selected?.section === 'top' && selected.leader.rowId === l.rowId && (
                      <div className="col-span-full">
                        <LeaderStatsPanel leader={l} onClose={closeLeader} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          {/* ЗОНА РИСКА */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35 whitespace-nowrap">Зона Риска</span>
              <span className="text-xs text-white/35">— строгий выговор, УВ ×2+ или критический онлайн</span>
              <div className="flex-1 h-px bg-white/5" />
              {riskLeaders.length > 0 && (
                <span className="inline-flex items-center leading-none whitespace-nowrap text-[11px] font-extrabold px-3 py-2 rounded-full text-white bg-red-500/80">
                  {riskLeaders.length} требуют внимания
                </span>
              )}
            </div>

            {riskLeaders.length === 0 ? (
              <div className="rounded-xl p-8 text-center text-white/35 text-sm bg-white/[0.015] border border-white/[0.08]">
                Лидеров в зоне риска не найдено
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {riskLeaders.map((l) => (
                  <Fragment key={l.rowId}>
                    <RiskLeaderCard leader={l} dayNames={week.dayNames} dayDates={week.dayDates} onClick={() => selectLeader(l, 'risk')} />
                    {selected?.section === 'risk' && selected.leader.rowId === l.rowId && (
                      <div className="col-span-full">
                        <LeaderStatsPanel leader={l} onClose={closeLeader} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          {/* ПОЛНЫЙ РЕЙТИНГ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Полный рейтинг</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="rounded-xl overflow-hidden bg-white/[0.015] border border-white/[0.08]">
              <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 text-[11px] font-extrabold text-white/40 uppercase tracking-wider border-b border-white/[0.08]">
                <span>#</span>
                <span>Лидер</span>
                <span>Дни недели</span>
                <span>Нарушения</span>
                <span>КПД</span>
              </div>

              {sortedAll.length === 0 ? (
                <div className="px-5 py-10 text-center text-white/35 text-sm">Ничего не найдено</div>
              ) : (
                sortedAll.map((l, idx) => {
                  const kpd = calculateKPD(l)
                  const medalBg = idx === 0 ? 'linear-gradient(145deg,#ffd977,#a8760f)'
                    : idx === 1 ? 'linear-gradient(145deg,#e6e9ef,#8b93a3)'
                    : idx === 2 ? 'linear-gradient(145deg,#f0a86b,#8a4a1c)'
                    : 'linear-gradient(145deg,#fb923c,#c2410c)'
                  const barColor = kpd.value >= 80 ? C.green : kpd.value >= 50 ? C.orange : C.red
                  return (
                    <Fragment key={l.rowId}>
                    <div
                      onClick={() => selectLeader(l, 'all')}
                      className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto] gap-2 md:gap-4 items-center px-5 py-3.5 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer"
                    >
                      <span className="hidden md:flex items-center gap-1 text-sm font-black text-white/50 tabular-nums">
                        {idx < 3 && <span>{['🥇', '🥈', '🥉'][idx]}</span>}
                        {idx >= 3 && (idx + 1)}
                      </span>

                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                          style={{ background: medalBg }}
                        >
                          {l.nickname[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{l.nickname}</div>
                          <div className="text-xs text-white/45 truncate font-medium">{l.fraction || 'Без фракции'} · {fmtDuration(l.totalSeconds)}</div>
                        </div>
                      </div>

                      <DayCells leader={l} dayNames={week.dayNames} dayDates={week.dayDates} />

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {l.warnings.strict > 0 && <Chip label={`СВ ×${l.warnings.strict}`} tone="red" />}
                        {l.warnings.oralLeft > 0 && <Chip label={`УВ ×${l.warnings.oralLeft}`} tone="amber" />}
                        {l.warnings.strict === 0 && l.warnings.oralLeft === 0 && <Chip label="Без нарушений" tone="slate" />}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${kpd.hasData ? kpd.value : 0}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <span className="text-sm font-black text-white tabular-nums w-8 text-right">{kpd.hasData ? kpd.value : '—'}</span>
                      </div>
                    </div>
                    {selected?.section === 'all' && selected.leader.rowId === l.rowId && (
                      <div className="border-b border-white/[0.05] last:border-b-0 p-3">
                        <LeaderStatsPanel leader={l} onClose={closeLeader} />
                      </div>
                    )}
                    </Fragment>
                  )
                })
              )}
            </div>
          </section>
        </>
      )}
        </>
        )}
      </div>
    </div>
  )
}