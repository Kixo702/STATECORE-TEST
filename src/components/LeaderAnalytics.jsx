import { useEffect, useMemo, useState, useCallback } from 'react'

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

async function fetchWeek(gid) {
  const sheetTitle = await resolveSheetTitle(gid)
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:N2000`
  const data = await sheetsApiGet(`/values/${encodeURIComponent(range)}`, { valueRenderOption: 'FORMATTED_VALUE' })
  const rows = data.values || []
  if (rows.length === 0) throw new Error('Таблица пуста')

  const rangeRe = /(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\s*-\s*\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/
  const currentWeekRange = getCurrentWeekRangeStr()

  let title = ''
  let titleRowIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].join(' ').includes(currentWeekRange)) { title = currentWeekRange; titleRowIdx = i; break }
  }
  if (titleRowIdx === -1) {
    for (let i = 0; i < rows.length; i++) {
      const m = rangeRe.exec(rows[i].join(' '))
      if (m) { title = m[1].replace(/\s+/g, ' '); titleRowIdx = i; break }
    }
  }
  if (titleRowIdx === -1) titleRowIdx = 3

  let dayNameRowIdx = -1
  for (let i = titleRowIdx; i < Math.min(rows.length, titleRowIdx + 10); i++) {
    if (rows[i].some((c) => /понедельник/i.test(clean(c)))) { dayNameRowIdx = i; break }
  }
  if (dayNameRowIdx === -1) dayNameRowIdx = titleRowIdx + 1

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
  for (let r = dataStartRowIdx; r < rows.length; r++) {
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

  return { title: title || 'Неделя', dayDates, dayNames, leaders }
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

function TopLeaderCard({ leader, dayNames, dayDates, rank }) {
  const kpd = calculateKPD(leader)
  const medal = ['🥇', '🥈', '🥉'][rank] || null
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
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

function RiskLeaderCard({ leader, dayNames, dayDates }) {
  const kpd = calculateKPD(leader)
  const activeDays = leader.okCount + leader.failCount
  const normSeconds = activeDays > 0 ? activeDays * NORM_SECONDS : 0
  const criticalOnline = activeDays > 0 && leader.totalSeconds < normSeconds * 0.5

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
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

export default function LeaderAnalytics() {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [week, setWeek] = useState(null)
  const [search, setSearch] = useState('')
  const [fractionFilter, setFractionFilter] = useState('all')

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
                  <TopLeaderCard key={l.rowId} leader={l} dayNames={week.dayNames} dayDates={week.dayDates} rank={i} />
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
                  <RiskLeaderCard key={l.rowId} leader={l} dayNames={week.dayNames} dayDates={week.dayDates} />
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
                    <div
                      key={l.rowId}
                      className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto] gap-2 md:gap-4 items-center px-5 py-3.5 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.03] transition-colors duration-200"
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
                  )
                })
              )}
            </div>
          </section>
        </>
      )}
      </div>
    </div>
  )
}