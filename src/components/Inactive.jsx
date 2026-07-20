import { useEffect, useMemo, useState } from 'react'

/*
  ── Неактивы ─────────────────────────────────────────────────────
  Страница для лидеров: самостоятельно взять неактив на сегодня.

  Правила:
   • До 15:00 по МСК — неактив ставится сразу в таблицу LeaderActivity
     (статус «Неактив» на сегодняшнюю дату, в свою колонку дня).
   • После 15:00 по МСК — форма не отправляется, показывается
     тост/баннер с просьбой обращаться к администрации.
   • Сопоставление пользователя со строкой в таблице — по user.nickname
     (колонка B, «Никнейм») в текущей активной неделе.
*/

// ── Тот же источник данных, что и в «Активности лидеров» ──
const SPREADSHEET_ID = '1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M'
const SHEETS_API_KEY = 'AIzaSyCVGbcNXOGpKm0lQnHKRNdJ9kIIV26FqZE'
const DEFAULT_GID = '1783162861'
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

const clean = (v) => (v || '').toString().replace(/^"|"$/g, '').trim()

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

// Структура листа (как в LeaderActivity.jsx):
//  A — пусто · B — никнейм · C — фракция · D — пусто
//  E..K — 7 дней (пн..вс)
const NICK_COL = 1
const DAY_START_COL = 4

function pad2(n) { return String(n).padStart(2, '0') }
function fmtDateRu(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}
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

// Находит строку текущего лидера (по никнейму) в текущей неделе таблицы.
async function findLeaderRow(gid, nickname) {
  const sheetTitle = await resolveSheetTitle(gid)
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:N2000`
  const data = await sheetsApiGet(`/values/${encodeURIComponent(range)}`, {
    valueRenderOption: 'FORMATTED_VALUE',
  })
  const rows = data.values || []
  if (rows.length === 0) throw new Error('Таблица пуста')

  const rangeRe = /(\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\s*-\s*\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4})/
  const currentWeekRange = getCurrentWeekRangeStr()

  let titleRowIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].join(' ').includes(currentWeekRange)) { titleRowIdx = i; break }
  }
  if (titleRowIdx === -1) {
    for (let i = 0; i < rows.length; i++) {
      if (rangeRe.exec(rows[i].join(' '))) { titleRowIdx = i; break }
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
  if (dataStartRowIdx === -1) throw new Error('Не удалось найти строки с никнеймами лидеров')

  const dateRow = rows[dataStartRowIdx - 1] || []
  const dayDates = []
  for (let i = 0; i < 7; i++) dayDates.push(clean(dateRow[DAY_START_COL + i]) || '')

  const target = nickname.trim().toLowerCase()
  let rowId = null
  let currentValue = ''
  for (let r = dataStartRowIdx; r < rows.length; r++) {
    const nick = clean(rows[r][NICK_COL])
    if (!nick) break
    if (nick.toLowerCase() === target) {
      rowId = r + 1 // 1-based индекс строки листа
      break
    }
  }

  return { rowId, dayDates }
}

// Индекс сегодняшнего дня недели в формате пн=0..вс=6
function todayDayIndex(now) {
  const day = now.getDay() // 0 = вс
  return day === 0 ? 6 : day - 1
}

// Текущее время в МСК (UTC+3, без перевода часов)
function nowMsk() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 3 * 3600000)
}

const IC = {
  moon: <svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 004.18 21h15.64a2 2 0 001.87-2.96L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
}

const CUTOFF_HOUR = 18 // 15:00 МСК

export default function Inactive({ user }) {
  const [mskNow, setMskNow] = useState(nowMsk())
  const [status, setStatus] = useState('idle') // idle | loading | ready | error | done | already
  const [error, setError] = useState('')
  const [rowId, setRowId] = useState(null)
  const [todayLabel, setTodayLabel] = useState('')
  const [alreadyValue, setAlreadyValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const t = setInterval(() => setMskNow(nowMsk()), 1000)
    return () => clearInterval(t)
  }, [])

  const isPastCutoff = mskNow.getHours() >= CUTOFF_HOUR

  const nickname = user?.nickname || ''

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!nickname) {
        setStatus('error')
        setError('У вашего профиля не указан никнейм — обратитесь к администрации.')
        return
      }
      setStatus('loading')
      setError('')
      try {
        const { rowId: id, dayDates } = await findLeaderRow(DEFAULT_GID, nickname)
        if (cancelled) return
        if (!id) {
          setStatus('error')
          setError('Ваш никнейм не найден в таблице активности лидеров текущей недели.')
          return
        }
        const idx = todayDayIndex(new Date())
        setRowId(id)
        setTodayLabel(dayDates[idx] || '')
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(e.message || 'Не удалось загрузить данные таблицы')
      }
    }
    load()
    return () => { cancelled = true }
  }, [nickname])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const mskTimeStr = useMemo(
    () => `${pad2(mskNow.getHours())}:${pad2(mskNow.getMinutes())}:${pad2(mskNow.getSeconds())}`,
    [mskNow]
  )

  const handleTakeInactive = async () => {
    // Перепроверяем время прямо перед отправкой — на случай, если страница
    // была открыта заранее и 15:00 наступило, пока пользователь читал.
    const freshMsk = nowMsk()
    if (freshMsk.getHours() >= CUTOFF_HOUR) {
      setToast('За неактивом после 18:00 по МСК обращайтесь к администрации.')
      return
    }
    if (!rowId) return

    setSubmitting(true)
    try {
      const idx = todayDayIndex(new Date())
      await postToScript({
        type: 'SET_DAY_TIME',
        rowId,
        dayCol: idx,
        value: 'Неактив',
      })
      setStatus('done')
    } catch (e) {
      setToast(e.message || 'Не удалось отправить неактив')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div
        className="rounded-2xl p-6 md:p-8"
        style={{ background: 'linear-gradient(160deg, #141a2e 0%, #0a0e18 100%)', border: '1px solid rgba(255,255,255,.08)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.3)', color: '#fb923c' }}
          >
            <span className="w-5 h-5">{IC.moon}</span>
          </div>
          <div>
            <div className="text-lg font-black text-white">Взять неактив</div>
            <div className="text-xs text-white/40">На сегодня, {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className="w-4 h-4 text-white/40 flex-shrink-0">{IC.clock}</span>
          <div className="text-xs text-white/50">
            Серверное время (МСК): <span className="font-bold text-white/80 tabular-nums">{mskTimeStr}</span>
          </div>
          <div className={`ml-auto text-[10.5px] font-extrabold px-2.5 py-1 rounded-full ${
            isPastCutoff
              ? 'bg-red-500/10 text-red-400 border border-red-500/25'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
          }`}>
            {isPastCutoff ? 'Приём закрыт' : 'Приём открыт до 15:00'}
          </div>
        </div>

        <p className="mt-4 text-sm text-white/50 leading-relaxed">
          До 18:00 по МСК вы можете самостоятельно взять неактив на сегодняшний день —
          статус «Неактив» будет автоматически проставлен в таблице активности лидеров.
          После 18:00 по МСК самостоятельная отметка недоступна — по вопросам неактива
          обращайтесь к администрации.
        </p>

        <div className="mt-6">
          {status === 'loading' && (
            <div className="text-xs text-white/40 flex items-center gap-2 py-3">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-orange-500 animate-spin" />
              Проверяем ваш профиль в таблице…
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-400 text-xs font-semibold">
              <span className="w-4 h-4 flex-shrink-0 mt-0.5">{IC.alert}</span>
              {error}
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="text-[11px] text-white/35 mb-3">
                Ячейка дня: <span className="text-white/60 font-bold">{todayLabel || 'сегодня'}</span>
              </div>
              <button
                onClick={handleTakeInactive}
                disabled={submitting || isPastCutoff}
                className={`w-full py-3.5 rounded-xl text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                  isPastCutoff
                    ? 'bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.06]'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:brightness-110 shadow-lg shadow-orange-500/20'
                }`}
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Отправляем…
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4">{IC.moon}</span>
                    Взять неактив на сегодня
                  </>
                )}
              </button>
            </>
          )}

          {status === 'done' && (
            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <span className="w-4 h-4 flex-shrink-0 mt-0.5">{IC.check}</span>
              Неактив на сегодня взят. Статус «Неактив» проставлен в таблице активности лидеров.
            </div>
          )}
        </div>
      </div>

      {/* ── ТОСТ: попытка взять неактив после 15:00 МСК ────────── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[260] max-w-[360px] px-4 py-3.5 rounded-xl flex items-start gap-2.5 shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #1a1014 0%, #0a0e18 100%)', border: '1px solid rgba(251,146,60,.35)' }}
        >
          <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400">{IC.alert}</span>
          <div className="text-xs font-semibold text-orange-300 leading-relaxed">{toast}</div>
          <button onClick={() => setToast('')} className="ml-auto text-white/30 hover:text-white transition-colors flex-shrink-0">
            <span className="w-3.5 h-3.5 block">{IC.x}</span>
          </button>
        </div>
      )}
    </div>
  )
}