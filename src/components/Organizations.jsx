import { useEffect, useState } from 'react'
import banner from '../assets/banner.png'

// ── Org icons ────────────────────────────────────────────────
import icPolice  from '../assets/org-icons/police.png'
import icGov     from '../assets/org-icons/gov.png'
import icArmy    from '../assets/org-icons/army.png'
import icFbi     from '../assets/org-icons/fbi.png'
import icMedical from '../assets/org-icons/medical.png'
import R24 from '../assets/org-icons/r24.png'

const ORG_ICONS = {
  'LSPD':  icPolice,
  'SFPD':  icPolice,
  'LVmPD':  icPolice,
  'GOV':     icGov,
  'USMC':    icArmy,
  'FBI':     icFbi,
  'MCLS': icMedical,
  'MCSF': icMedical,
  'MCLV': icMedical,
  'Радио24': R24,
}

// ── SVG Icons ────────────────────────────────────────────────
const IconShield = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconRefresh = ({ spinning }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'org-spin 0.7s linear infinite' : 'none' }}>
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconWarn = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconSpeech = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUserPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
)
const IconUserX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconCrown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/>
  </svg>
)
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ── Helpers ──────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0]
const addDays = (iso, n) => {
  const d = new Date(iso); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
const fmtDate = iso => {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return `${day}.${m}.${y}`
}
// Обратное преобразование: "дд.мм.гггг" -> "гггг-мм-дд" (для <input type="date">).
// Возвращает null, если строка не похожа на дату (например "-" для вакантной строки).
const parseDateToISO = str => {
  if (!str) return null
  const m = str.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const [, day, month, year] = m
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// ── Accent colors per org index ──────────────────────────────
const ORG_ACCENTS = [
  { main: '#60a5fa', glow: 'rgba(96,165,250,.25)',   light: 'rgba(96,165,250,.08)',   dark: 'rgba(96,165,250,.04)'  },
  { main: '#c084fc', glow: 'rgba(192,132,252,.25)',  light: 'rgba(192,132,252,.08)',  dark: 'rgba(192,132,252,.04)' },
  { main: '#22d3ee', glow: 'rgba(34,211,238,.25)',   light: 'rgba(34,211,238,.08)',   dark: 'rgba(34,211,238,.04)'  },
  { main: '#fbbf24', glow: 'rgba(251,191,36,.25)',   light: 'rgba(251,191,36,.08)',   dark: 'rgba(251,191,36,.04)'  },
  { main: '#34d399', glow: 'rgba(52,211,153,.25)',   light: 'rgba(52,211,153,.08)',   dark: 'rgba(52,211,153,.04)'  },
  { main: '#f87171', glow: 'rgba(248,113,113,.25)',  light: 'rgba(248,113,113,.08)',  dark: 'rgba(248,113,113,.04)' },
  { main: '#fb923c', glow: 'rgba(251,146,60,.25)',   light: 'rgba(251,146,60,.08)',   dark: 'rgba(251,146,60,.04)'  },
  { main: '#a78bfa', glow: 'rgba(167,139,250,.25)',  light: 'rgba(167,139,250,.08)',  dark: 'rgba(167,139,250,.04)' },
  { main: '#f472b6', glow: 'rgba(244,114,182,.25)',  light: 'rgba(244,114,182,.08)',  dark: 'rgba(244,114,182,.04)' },
]

import { canRemoveLeader, SERVERS } from '../lib/roles'

// ── Фильтр по сфере ──────────────────────────────────────────
const SPHERES = [
  { id: 'gov',    label: 'Государственные структуры' },
  { id: 'ghetto', label: 'Гетто' },
  { id: 'mafia',  label: 'Мафии' },
  { id: 'bikers', label: 'Байкеры' },
  { id: 'bo',     label: 'Бизнес организации' },
]

// Пока данные подключены только для Государственных структур и Бизнес
// организаций сервера Texas — остальные комбинации сервер×сфера считаются
// "в разработке".
const READY_SERVER_ID = 'texas'
const READY_COMBOS = [
  { server: 'texas', sphere: 'gov' },
  { server: 'texas', sphere: 'bo' },
  { server: 'texas', sphere: 'mafia' },
  { server: 'texas', sphere: 'bikers' },
  { server: 'texas', sphere: 'ghetto' },
]

// Байкеры: как и у мафий, лидеры сидят в фиксированных строках 14/16/18.
// Но в отличие от мафий, каждая логическая колонка занимает ПАРУ ячеек
// (напр. D+E), т.к. в таблице использовано визуальное объединение — при
// экспорте в CSV значение иногда "уезжает" во вторую ячейку пары вместо
// первой, поэтому обе ячейки пары нужно проверять и брать непустую.
const BIKERS_LEADER_ROWS = [14, 16, 18]

// Мафии: фиксированные строки лидеров в таблице (см. MAFIA_SHEETS_URL) —
// у каждой из 3 организаций лидер всегда сидит в одной и той же строке.
const MAFIA_LEADER_ROWS = [14, 16, 18]

// Гетто: фиксированные строки лидеров в таблице (см. GHETTO_SHEETS_URL) —
// у каждого из 5 гетто-лидеров данные всегда сидят в одной и той же строке.
const GHETTO_LEADER_ROWS = [13, 15, 17, 19, 21]

// БО: колонка C в таблице хранит только должность (нужен только "Директор"),
// а не название организации — поэтому имя карточки сопоставляем вручную по
// номеру строки. При добавлении новых организаций с директором сюда нужно
// добавить соответствующую строку.
const BO_ORG_NAMES = {
  9: 'Радио24',
}

export default function Organizations({ user }) {
  const GOV_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/export?format=csv'
  const BO_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRE89xZb9RxVOSfXbtQ4-fyu-FH9r-5ntI4AdPI6xPqmzRh0jVYd9qITXDCpWCEC0RFptElukEjhvD5/pub?gid=0&single=true&output=csv'
  const MAFIA_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhlLfLsJs2k5DwBm3Lu7B4EuH3b-5kZNNHMGZHhyfpb00XyuPcOIppSFuAGRQXzNR7fFYsPbM6CPuy/pub?gid=0&single=true&output=csv'
  const GOV_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhZYSsvPt0QdbyYiAEfvyfu8XVQwOPeYapuG0HwV8CCngctz43msP9K_o4C-ck13Hy/exec'
  const BO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbza0Kft9sI27q3OQtotzItO8unNViHN5yi8H8RU7xElghaSbOjJ9HYdak7u8J_XYvTH/exec'
  // TODO: вставь сюда ссылку на веб-приложение Apps Script для таблицы мафий
  // (получишь после деплоя скрипта из раздела "Скрипт для таблицы Мафии" в инструкции)
  const MAFIA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSyQHwsIouA4yU_CqI0WZRX3m0kfPQBfjnuock_mmSJXQYvaoRZivuUQSWLowHwjZw/exec'
  const BIKERS_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHseJAxV3J2Pyc5-2uvKT97k6Gmf01Oc5uddvZFXlP7FxdbSom1lNMWLsDar0SF66gT5ObWlIzQbaN/pub?gid=0&single=true&output=csv'
  // TODO: вставь сюда ссылку на веб-приложение Apps Script для таблицы байкеров
  // (задеплой скрипт из раздела "Скрипт для таблицы Байкеры" в инструкции)
  const BIKERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIMACv0scPzBapr1QMDgoQDqYya3vjRaDJ_FBfbHO63AGIG4IMvV2QZ-eVunzcJ96OQQ/exec'
  const GHETTO_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlRt1hpLQy_7Z7G1PxISAmhgHcc9qS1QX4od1kG4BpM9x1QzPBffKNsA1J3FJwFoXo1rhxyJsGpIHF/pub?gid=0&single=true&output=csv'
  // TODO: вставь сюда ссылку на веб-приложение Apps Script для таблицы гетто
  // (задеплой скрипт из раздела "Скрипт для таблицы Гетто" в инструкции)
  const GHETTO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjeEaoYUBLQxu0GESATvDYtpKeRjM2VY0ICjB86Saqr7BBbIP80RcBImYFcD0vNPq4/exec'

  const [serverId, setServerId] = useState(READY_SERVER_ID)
  const [sphereId, setSphereId] = useState('gov')
  const isReady = READY_COMBOS.some(c => c.server === serverId && c.sphere === sphereId)

  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)

  const [fNick, setFNick] = useState('')
  const [fVK, setFVK]     = useState('')
  const [fForum, setFForum] = useState('')
  const [fAppoint, setFAppoint] = useState(todayISO())
  const [fExpiry, setFExpiry]   = useState(addDays(todayISO(), 28))

  const [warnModal, setWarnModal] = useState(null) 
  const [warnNote, setWarnNote]   = useState('')

  const openWarnModal  = (btn) => { setWarnModal(btn); setWarnNote('') }
  const closeWarnModal = ()    => { setWarnModal(null); setWarnNote('') }
  const confirmWarn    = ()    => {
    if (!warnNote.trim()) return
    send({ type: warnModal.type, rowId: sel.id, value: 1, note: warnNote.trim() })
    closeWarnModal()
  }

  useEffect(() => {
    if (!isReady) {
      setOrgs([])
      setSel(null)
      setLoading(false)
      setRefreshing(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, sphereId])
  useEffect(() => {
    setFExpiry(addDays(fAppoint, sel?.name === 'GOV' ? 30 : 28))
  }, [fAppoint, sel?.name])

  // При выборе организации подставляем в поля формы реально сохранённые
  // даты назначения/снятия лидера (а не дефолтные "сегодня" / "+28 дней").
  // Для вакантной организации оставляем дефолт — там ещё нет сохранённых дат.
  useEffect(() => {
    if (!sel || sel.leader === 'Вакантно') return
    const appointISO = parseDateToISO(sel.appointDate)
    const expiryISO  = parseDateToISO(sel.expiryDate)
    if (appointISO) setFAppoint(appointISO)
    if (expiryISO)  setFExpiry(expiryISO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id, sel?.name])

  const loadGov = async () => {
    const res = await fetch(`${GOV_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    return rows.slice(5, 14).map((row, i) => ({
      id: i + 6,
      name: c(row[3]),
      leader: c(row[2]) || 'Вакантно',
      vk: c(row[4]) || '—',
      strict: Number((c(row[8]) || '0/3').split('/')[0]) || 0,
      oral:   Number((c(row[9]) || '0/3').split('/')[0]) || 0,
    }))
  }

  const loadBo = async () => {
    const res = await fetch(`${BO_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    const parsed = []
    rows.forEach((row, i) => {
      // Должности идут через строку в колонке C — нам нужны только "Директор"
      if (c(row[2]) !== 'Директор') return
      const rowNumber = i + 1 // 1-based номер строки в таблице
      parsed.push({
        id: rowNumber,
        name: BO_ORG_NAMES[rowNumber] || `Организация (стр. ${rowNumber})`,
        leader: c(row[4]) || 'Вакантно', // E
        vk: c(row[6]) || '—',            // G
        strict: Number((c(row[10]) || '0/3').split('/')[0]) || 0, // K
        oral:   Number((c(row[12]) || '0/3').split('/')[0]) || 0, // M
      })
    })
    return parsed
  }

  // Мафии: 3 организации, каждая занимает свою фиксированную строку
  // (14 / 16 / 18). Колонки: D-ник, F-название, H-вк, J-контроль бизнесов,
  // L-баллы лидера, O/P-выговоры, R/T-даты, V/W-чекбоксы выполнения ГРП.
  const loadMafia = async () => {
    const res = await fetch(`${MAFIA_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    const isTrue = s => ['TRUE', 'ИСТИНА', '1', 'TRUE'].includes((s || '').toUpperCase())
    return MAFIA_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return {
        id: rowNum,
        name: c(row[5]) || `Мафия (стр. ${rowNum})`,               // F
        leader: c(row[3]) || 'Вакантно',                            // D
        vk: c(row[7]) || '—',                                        // H
        biz: c(row[9]) || '—',                                        // J — контроль бизнесов
        points: c(row[11]) || '—',                                     // L — баллы лидера
        strict: Number((c(row[14]) || '0/3').split('/')[0]) || 0,     // O
        oral:   Number((c(row[15]) || '0/3').split('/')[0]) || 0,     // P
        appointDate: c(row[17]) || '-',                                // R
        expiryDate:  c(row[19]) || '-',                                // T
        grp1: isTrue(c(row[21])),                                       // V
        grp2: isTrue(c(row[22])),                                       // W
      }
    })
  }
  // Байкеры: 3 организации в строках 14/16/18, но колонки идут парами из-за
  // визуального объединения ячеек в таблице — при экспорте CSV значение
  // может оказаться в любой из двух ячеек пары, поэтому берём первую непустую.
  // D/E — ник лидера, G/H — название организации, J/K — страница вк (гиперссылка),
  // M — баллы лидера, P/Q — выговоры/предупреждения, S/T — дата назначения,
  // V/W — дата снятия, Y — чекбокс 1-й ГРП, Z — чекбокс 2-й ГРП.
  const loadBikers = async () => {
    const res = await fetch(`${BIKERS_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    const isTrue = s => ['TRUE', 'ИСТИНА', '1'].includes((s || '').toUpperCase())
    // Берёт первое непустое значение из пары ячеек (индексы 0-based)
    const pair = (row, i1, i2) => c(row[i1]) || c(row[i2])
    return BIKERS_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return {
        id: rowNum,
        leader: pair(row, 3, 4) || 'Вакантно',                    // D/E
        name:   pair(row, 6, 7) || `Байкеры (стр. ${rowNum})`,     // G/H
        vk:     pair(row, 9, 10) || '—',                            // J/K
        points: c(row[12]) || '—',                                  // M
        strict: Number((c(row[15]) || '0/3').split('/')[0]) || 0,   // P
        oral:   Number((c(row[16]) || '0/3').split('/')[0]) || 0,   // Q
        appointDate: pair(row, 18, 19) || '-',                       // S/T
        expiryDate:  pair(row, 21, 22) || '-',                       // V/W
        grp1: isTrue(c(row[24])),                                    // Y
        grp2: isTrue(c(row[25])),                                    // Z
      }
    })
  }
  // Гетто: 5 лидеров в строках 13/15/17/19/21. Колонки: D-ник, F-фракция,
  // H-вк (гиперссылка), J-баллы лидера, L-выговоры (макс:5),
  // M-предупреждения (макс:5), N-дата назначения, P-дата снятия.
  const loadGhetto = async () => {
    const res = await fetch(`${GHETTO_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    return GHETTO_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      const faction = c(row[5]) || `Гетто (стр. ${rowNum})` // F
      // В таблице ячейки L/M объединены, и обе цифры (выговоры и
      // предупреждения) фактически лежат в одной строке L вида
      // "В: 0/5              П: 2/5" — вытаскиваем их регуляркой.
      const strictWarnCell = c(row[11]) || c(row[12]) || ''
      const strictMatch = strictWarnCell.match(/В\s*:?\s*(\d+)\s*\/\s*5/i)
      const oralMatch   = strictWarnCell.match(/П\s*:?\s*(\d+)\s*\/\s*5/i)
      return {
        id: rowNum,
        name: faction,                                              // F — используется как название карточки
        faction,                                                     // F
        leader: c(row[3]) || 'Вакантно',                             // D
        vk: c(row[7]) || '—',                                         // H
        points: c(row[9]) || '—',                                     // J — баллы лидера
        strict: strictMatch ? Number(strictMatch[1]) : 0,             // L (выговоры)
        oral:   oralMatch   ? Number(oralMatch[1])   : 0,             // L (предупреждения)
        appointDate: c(row[13]) || '-',                                // N
        expiryDate:  c(row[15]) || '-',                                // P
      }
    })
  }
  const load = async () => {
    if (!isReady) return
    setRefreshing(true)
    if (orgs.length === 0) setLoading(true)
    try {
      const parsed = sphereId === 'bo' ? await loadBo() : sphereId === 'mafia' ? await loadMafia() : sphereId === 'bikers' ? await loadBikers() : sphereId === 'ghetto' ? await loadGhetto() : await loadGov()
      setOrgs(parsed)
      setSel(prev => prev ? (parsed.find(o => o.name === prev.name) ?? null) : null)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const send = async payload => {
    setBusy(true)
    try {
      const url = sphereId === 'bo' ? BO_SCRIPT_URL : sphereId === 'mafia' ? MAFIA_SCRIPT_URL : sphereId === 'bikers' ? BIKERS_SCRIPT_URL : sphereId === 'ghetto' ? GHETTO_SCRIPT_URL : GOV_SCRIPT_URL
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await new Promise(r => setTimeout(r, 1300))
      await load()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  const handleSetLeader = () => {
    if (!canRemoveLeader(user)) {
      alert('Недостаточно прав для назначения лидера')
      return
    }
    send({
      type: 'SET_LEADER',
      rowId: sel.id,
      name:  fNick,
      vk:    fVK,
      ...(sphereId !== 'ghetto' ? { forum: fForum } : {}),
      appointDate: fmtDate(fAppoint),
      expiryDate:  fmtDate(fExpiry),
    })
    setFNick(''); setFVK(''); setFForum(''); setFAppoint(todayISO())
  }

  const vacant = sel?.leader === 'Вакантно'
  const selIdx = sel ? orgs.findIndex(o => o.name === sel.name) : 0
  const selAccent = ORG_ACCENTS[selIdx % ORG_ACCENTS.length] || ORG_ACCENTS[0]

  return (
    <div style={{
      fontFamily: "'Syne', 'Onest', 'Segoe UI', sans-serif",
      color: '#e8edf5',
      background: '#060810',
      minHeight: '100vh',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@400;500;600;700;800;900&display=swap');

        @keyframes org-spin    { to { transform: rotate(360deg); } }
        @keyframes org-fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes org-fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes float-orb   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.03)} }
        @keyframes glow-pulse  { 0%,100%{opacity:.5} 50%{opacity:.85} }
        @keyframes shimmer     { 100% { transform: translateX(100%); } }

        * { box-sizing: border-box; }

        /* ── Скелетон загрузки с эффектом волны ── */
        .skeleton-loader {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          height: 140px;
        }
        .skeleton-loader::after {
          position: absolute; top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          animation: shimmer 1.6s infinite;
          content: '';
        }

        /* ── Card ── */
        .org-card {
          transition: border-color .25s ease, background .25s ease, transform .25s cubic-bezier(.25, 1, .5, 1), box-shadow .25s ease;
          cursor: pointer;
          font-family: inherit;
        }
        .org-card:hover { 
          transform: translateY(-4px) scale(1.01); 
        }

        /* ── Button ── */
        .org-btn {
          transition: background .2s ease, border-color .2s ease, box-shadow .2s ease, transform .15s cubic-bezier(.25, 1, .5, 1), color .2s ease, filter .2s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }
        .org-btn:hover { transform: translateY(-1.5px); }
        .org-btn:active { transform: translateY(0) scale(.98); }

        /* ── Input ── */
        .org-input {
          transition: border-color .2s, background .2s, box-shadow .2s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .org-input:focus { outline: none; background: rgba(255,255,255,.07) !important; }
        .org-input::placeholder { color: rgba(255,255,255,.2); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.45); cursor: pointer; transition: filter .2s; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { filter: invert(.85); }

        /* ── Layout & Responsive ── */
        .org-page-body { max-width: 1600px; margin: 0 auto; padding: 36px 48px; }
        .org-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 20px; margin-bottom: 44px; flex-wrap: wrap;
        }
        .org-layout {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 28px;
          align-items: start;
        }
        .org-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .org-panel {
          background: linear-gradient(160deg, rgba(13,17,30,.98) 0%, rgba(7,9,16,1) 100%);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 24px;
          padding: 28px;
          position: sticky;
          top: 24px;
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.04);
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          transition: all 0.3s ease;
        }
        .org-section-label {
          font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(255,255,255,.3); font-weight: 700; margin-bottom: 12px;
          font-family: 'Onest', sans-serif;
        }
        .org-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
          margin: 24px 0;
        }
        .leader-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800; flex-shrink: 0;
          font-family: 'Onest', sans-serif; position: relative;
        }

        @media (max-width: 900px) {
          .org-page-body { padding: 24px 20px 32px; }
          .org-layout { grid-template-columns: 1fr; }
          .org-panel { position: static; top: auto; max-height: none; }
        }
        @media (max-width: 768px) {
          .org-card-grid { gap: 14px; }
          .org-panel { border-radius: 20px; padding: 24px; }
        }
        @media (max-width: 640px) {
          .org-page-body { padding: 16px 14px 48px; }
          .org-card-grid { grid-template-columns: 1fr; gap: 12px; }
          .org-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .org-header-refresh { width: 100% !important; justify-content: center !important; }
          .org-title { font-size: 36px !important; }
        }
        @keyframes org-slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (max-width: 640px) {
          .org-warn-modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .org-warn-modal-box {
            border-radius: 24px 24px 0 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 28px 20px 36px !important;
            animation: org-slideUp .25s cubic-bezier(0, 0, 0.2, 1) both !important;
          }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div style={{ width: '100%', background: '#060810', paddingTop: '20px', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
        <div className="org-banner-wrap" style={{ padding: '0 48px' }}>
          <div style={{ position: 'relative', width: '100%', maxHeight: '140px', overflow: 'hidden', borderRadius: '16px' }}>
            <img src={banner} alt="banner" style={{ width: '100%', objectFit: 'contain', display: 'block' }}/>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', background: 'linear-gradient(to top, #060810, transparent)', pointerEvents: 'none' }}/>
          </div>
        </div>
      </div>

      <div className="org-page-body">
        {/* ── HEADER ── */}
        <div className="org-header">
          <div>
            <div className="org-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,.25)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>
              <span>Реестр</span>
              <span style={{ opacity: .35 }}><IconChevron /></span>
              <span style={{ color: 'rgba(255,255,255,.4)' }}>{SERVERS.find(s => s.id === serverId)?.label}</span>
              <span style={{ opacity: .35 }}><IconChevron /></span>
              <span style={{ color: 'rgba(255,255,255,.4)' }}>{SPHERES.find(s => s.id === sphereId)?.label}</span>
            </div>
            <h1 className="org-title" style={{ margin: 0, fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, background: 'linear-gradient(125deg, #ffffff 30%, rgba(255,255,255,.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Syne, sans-serif' }}>
              Организации
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>
              {isReady
                ? (sphereId === 'bo'
                    ? 'Управление и контроль бизнес организаций'
                    : sphereId === 'mafia'
                      ? 'Управление и контроль мафиозных группировок'
                      : sphereId === 'bikers'
                        ? 'Управление и контроль байкерских клубов'
                        : sphereId === 'ghetto'
                          ? 'Управление и контроль лидеров гетто'
                          : 'Управление и контроль государственных структур')
                : `${SPHERES.find(s => s.id === sphereId)?.label} · ${SERVERS.find(s => s.id === serverId)?.label}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="org-input"
              value={serverId}
              onChange={e => setServerId(e.target.value)}
              style={{
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.75)', padding: '12px 16px', borderRadius: '12px',
                fontSize: '11px', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase',
                fontFamily: 'Onest, sans-serif', cursor: 'pointer',
              }}
            >
              {SERVERS.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#0e1220', color: '#eef2f8' }}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              className="org-input"
              value={sphereId}
              onChange={e => setSphereId(e.target.value)}
              style={{
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.75)', padding: '12px 16px', borderRadius: '12px',
                fontSize: '11px', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase',
                fontFamily: 'Onest, sans-serif', cursor: 'pointer',
              }}
            >
              {SPHERES.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#0e1220', color: '#eef2f8' }}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={load}
              className="org-btn org-header-refresh"
              disabled={!isReady}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                color: 'rgba(255,255,255,.6)', padding: '12px 22px', borderRadius: '12px',
                fontSize: '11px', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Onest, sans-serif',
                opacity: isReady ? 1 : .4, cursor: isReady ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => {
                if (!isReady) return
                e.currentTarget.style.background = 'rgba(255,255,255,.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'
                e.currentTarget.style.color = 'rgba(255,255,255,.6)'
              }}
            >
              <IconRefresh spinning={refreshing} />
              Обновить
            </button>
          </div>
        </div>

        {/* ── NOT READY: IN DEVELOPMENT ── */}
        {!isReady ? (
          <div style={{
            background: 'linear-gradient(160deg, rgba(13,17,30,.98) 0%, rgba(7,9,16,1) 100%)',
            border: '1px solid rgba(255,255,255,.06)', borderRadius: '24px',
            padding: '80px 24px', textAlign: 'center',
            boxShadow: '0 30px 90px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04)',
            animation: 'org-fadeUp .35s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'rgba(251,191,36,.7)' }}>
              <IconWarn />
            </div>
            <div style={{ fontSize: '16px', color: '#eef2f8', fontWeight: 800, letterSpacing: '.3px', fontFamily: 'Syne, sans-serif', marginBottom: '8px' }}>
              Раздел в разработке
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
              «{SPHERES.find(s => s.id === sphereId)?.label}» на сервере «{SERVERS.find(s => s.id === serverId)?.label}» пока не подключены к реестру организаций. Сейчас доступны «Государственные структуры», «Бизнес организации», «Мафии» и «Байкеры» на сервере «Texas».
            </div>
          </div>
        ) : (
        <div className="org-layout">
          {/* ── ORG CARDS ── */}
          <div>
            {loading ? (
              <div className="org-card-grid">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton-loader" />)}
              </div>
            ) : (
              <div className="org-card-grid">
                {orgs.map((org, idx) => {
                  const isSel    = sel?.name === org.name
                  const isVacant = org.leader === 'Вакантно'
                  const accent   = ORG_ACCENTS[idx % ORG_ACCENTS.length]
                  const orgIcon  = ORG_ICONS[org.name]
                  const initials = isVacant ? '?' : org.leader.slice(0, 2).toUpperCase()

                  return (
                    <div
                      key={org.name}
                      className="org-card"
                      onClick={() => setSel(org)}
                      style={{
                        background: isSel
                          ? `linear-gradient(150deg, ${accent.dark} 0%, rgba(10,14,26,0.99) 70%)`
                          : isVacant
                            ? 'linear-gradient(160deg, rgba(248,113,113,.02) 0%, rgba(8,10,18,.95) 100%)'
                            : 'linear-gradient(160deg, rgba(255,255,255,.015) 0%, rgba(8,10,18,.95) 100%)',
                        border: `1px solid ${
                          isSel ? accent.main + '60'
                            : isVacant ? 'rgba(248,113,113,.15)'
                            : 'rgba(255,255,255,.06)'
                        }`,
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: isSel
                          ? `0 16px 40px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,.05)`
                          : '0 4px 20px rgba(0,0,0,.25)',
                        animation: `org-fadeUp .4s cubic-bezier(0.16, 1, 0.3, 1) both ${idx * 0.04}s`,
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {isSel && (
                        <div style={{
                          position: 'absolute', top: 0, left: '20px', right: '20px', height: '1.5px',
                          background: `linear-gradient(90deg, transparent, ${accent.main}aa, transparent)`,
                          animation: 'glow-pulse 2s ease-in-out infinite',
                        }}/>
                      )}

                      {isSel && (
                        <div style={{
                          position: 'absolute', top: '-60px', right: '-60px', width: '160px', height: '160px',
                          background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
                          pointerEvents: 'none', animation: 'float-orb 4s ease-in-out infinite',
                        }}/>
                      )}

                      <div style={{ display: 'flex', Jackie: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: isSel ? `${accent.light}` : 'rgba(255,255,255,.03)',
                          border: `1px solid ${isSel ? accent.main + '40' : 'rgba(255,255,255,.06)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s',
                        }}>
                          {orgIcon ? (
                            <img 
                              src={orgIcon} 
                              alt={org.name} 
                              width={org.name === 'Радио24' ? 32 : 24} 
                              height={org.name === 'Радио24' ? 32 : 24} 
                              style={{ 
                                objectFit: 'contain', 
                                filter: isSel ? 'none' : 'brightness(.5) saturate(0)', 
                                transition: 'all .25s' 
                              }} 
                            />
                          ) : (
                            <span style={{ color: isSel ? accent.main : 'rgba(255,255,255,.2)', transition: 'all .25s' }}><IconShield size={18} /></span>
                          )}
                        </div>

                        <span style={{
                          fontSize: '9px', fontWeight: 800, color: isSel ? accent.main : 'rgba(255,255,255,.3)',
                          letterSpacing: '1.5px', background: isSel ? `${accent.light}` : 'rgba(255,255,255,.03)',
                          padding: '4px 8px', borderRadius: '6px', border: `1px solid ${isSel ? accent.main + '30' : 'rgba(255,255,255,.05)'}`,
                          fontFamily: 'Onest, sans-serif', transition: 'all .25s'
                        }}>
                          #{org.id}
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: isSel ? accent.main : 'rgba(255,255,255,.5)', marginBottom: '12px', transition: 'color .25s', fontFamily: 'Onest, sans-serif' }}>
                        {org.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div className="leader-avatar" style={{
                          background: isVacant ? 'rgba(248,113,113,.08)' : isSel ? accent.light : 'rgba(255,255,255,.05)',
                          border: `1.5px solid ${isVacant ? 'rgba(248,113,113,.25)' : isSel ? accent.main + '40' : 'rgba(255,255,255,.08)'}`,
                          color: isVacant ? '#f87171' : isSel ? accent.main : 'rgba(255,255,255,.4)',
                          transition: 'all .25s',
                        }}>
                          {isVacant ? '—' : initials}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: isVacant ? 'rgba(248,113,113,.5)' : '#eef2f5', fontStyle: isVacant ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Onest, sans-serif' }}>
                            {org.leader}
                          </div>
                          {!isVacant && (
                            <div style={{ fontSize: '10px', color: isSel ? accent.main : 'rgba(255,255,255,.3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Onest, sans-serif' }}>
                              <IconCrown /> Лидер
                            </div>
                          )}
                        </div>
                      </div>

                      {sphereId === 'mafia' && !isVacant && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.03)', fontFamily: 'Onest, sans-serif' }}>
                            Бизнесы · {org.biz}
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.03)', fontFamily: 'Onest, sans-serif' }}>
                            Баллы · {org.points}
                          </span>
                        </div>
                      )}

                      {sphereId === 'bikers' && !isVacant && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.03)', fontFamily: 'Onest, sans-serif' }}>
                            Баллы · {org.points}
                          </span>
                        </div>
                      )}

                      {sphereId === 'ghetto' && !isVacant && (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.03)', fontFamily: 'Onest, sans-serif' }}>
                            Баллы · {org.points}
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800, border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.03)', fontFamily: 'Onest, sans-serif' }}>
                            Фракция · {org.faction}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { label: `${sphereId === 'bikers' || sphereId === 'ghetto' ? 'В' : 'СВ'} · ${org.strict}/${sphereId === 'bikers' || sphereId === 'ghetto' ? 5 : 3}`, active: org.strict > 0, color: '#f87171', border: 'rgba(248,113,113,.25)', bg: 'rgba(248,113,113,.08)' },
                          { label: `${sphereId === 'bikers' || sphereId === 'ghetto' ? 'П' : 'УВ'} · ${org.oral}/${sphereId === 'bikers' || sphereId === 'ghetto' ? 5 : 3}`, active: org.oral > 0, color: '#fbbf24', border: 'rgba(251,191,36,.2)', bg: 'rgba(251,191,36,.06)' },
                        ].map(b => (
                          <span key={b.label} style={{
                            padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 800,
                            border: `1px solid ${b.active ? b.border : 'rgba(255,255,255,.05)'}`,
                            color: b.active ? b.color : 'rgba(255,255,255,.2)',
                            background: b.active ? b.bg : 'transparent',
                            fontFamily: 'Onest, sans-serif', transition: 'all .25s'
                          }}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="org-panel org-panel-scroll">
            {sel ? (
              <div key={sel.name} style={{ animation: 'org-fadeUp .35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                {/* ── PANEL HEADER ── */}
                <div style={{ marginBottom: '20px' }}>
                  <div className="org-section-label">Управление</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', background: selAccent.light,
                      border: `1px solid ${selAccent.main}35`, display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 14px ${selAccent.glow}`, overflow: 'hidden', flexShrink: 0,
                    }}>
                      {ORG_ICONS[sel.name] ? (
                        <img src={ORG_ICONS[sel.name]} alt={sel.name} width={24} height={24} style={{ objectFit: 'contain' }} />
                      ) : (
                        <span style={{ color: selAccent.main }}><IconShield size={20}/></span>
                      )}
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', color: selAccent.main, fontFamily: 'Syne, sans-serif' }}>
                      {sel.name}
                    </div>
                  </div>
                </div>

                {/* ── CURRENT LEADER CARD ── */}
                <div style={{
                  background: `linear-gradient(135deg, ${selAccent.dark} 0%, rgba(255,255,255,.01) 100%)`,
                  border: `1px solid ${selAccent.main}20`, borderRadius: '16px', padding: '16px', marginBottom: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,.2)', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: '9px', color: selAccent.main, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>
                    <IconCrown /> Текущий лидер
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                      background: vacant ? 'rgba(248,113,113,.06)' : selAccent.light,
                      border: `2px solid ${vacant ? 'rgba(248,113,113,.2)' : selAccent.main + '40'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900,
                      color: vacant ? '#f87171' : selAccent.main, fontFamily: 'Onest, sans-serif',
                    }}>
                      {vacant ? '—' : sel.leader.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: vacant ? 'rgba(248,113,113,.4)' : '#f0f4fa', fontStyle: vacant ? 'italic' : 'normal', fontFamily: 'Onest, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sel.leader}
                      </div>
                      {sel.vk && sel.vk !== '—' && (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '2px' }}>{sel.vk}</div>
                      )}
                    </div>
                  </div>
                </div>

                {sphereId === 'mafia' && !vacant && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', fontFamily: 'Onest, sans-serif' }}>Контроль бизнесов</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eef2f8', fontFamily: 'Syne, sans-serif' }}>{sel.biz}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', fontFamily: 'Onest, sans-serif' }}>Баллы лидера</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eef2f8', fontFamily: 'Syne, sans-serif' }}>{sel.points}</div>
                    </div>
                  </div>
                )}

                {sphereId === 'bikers' && !vacant && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', fontFamily: 'Onest, sans-serif' }}>Баллы лидера</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eef2f8', fontFamily: 'Syne, sans-serif' }}>{sel.points}</div>
                    </div>
                  </div>
                )}

                {sphereId === 'ghetto' && !vacant && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', fontFamily: 'Onest, sans-serif' }}>Баллы лидера</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eef2f8', fontFamily: 'Syne, sans-serif' }}>{sel.points}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', fontFamily: 'Onest, sans-serif' }}>Фракция</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#eef2f8', fontFamily: 'Syne, sans-serif' }}>{sel.faction}</div>
                    </div>
                  </div>
                )}

                <div className="org-divider" />

                {vacant ? (
                  /* ── FORM: APPOINT LEADER ── */
                  <>
                    <div className="org-section-label">Назначение лидера</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { val: fNick,  set: setFNick,  ph: 'Ник лидера',       icon: <IconUser/> },
                        { val: fVK,    set: setFVK,    ph: 'VK',               icon: <IconLink/> },
                        ...(sphereId !== 'ghetto' ? [{ val: fForum, set: setFForum, ph: 'Форумный аккаунт', icon: <IconLink/> }] : []),
                      ].map(f => (
                        <div key={f.ph} style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.2)', display: 'flex' }}>{f.icon}</span>
                          <input
                            type="text" className="org-input" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: '#eef2f8', padding: '12px 14px 12px 38px', borderRadius: '12px', fontSize: '13px', width: '100%' }}
                            onFocus={e => { e.currentTarget.style.borderColor = selAccent.main + '60'; e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}10` }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.boxShadow = 'none' }}
                          />
                        </div>
                      ))}

                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.25)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>{f.label}</div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.2)', display: 'flex' }}><IconCalendar /></span>
                            <input
                              type="date" className="org-input" value={f.val} onChange={e => f.set(e.target.value)}
                              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: '#eef2f8', padding: '12px 14px 12px 38px', borderRadius: '12px', fontSize: '13px', width: '100%', colorScheme: 'dark' }}
                              onFocus={e => { e.currentTarget.style.borderColor = selAccent.main + '60'; e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}10` }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.boxShadow = 'none' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="org-btn" onClick={handleSetLeader}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, #22c55e 0%, #166534 100%)', border: '1px solid rgba(34,197,94,.2)', color: '#fff', padding: '14px', borderRadius: '12px', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 800, width: '100%', textTransform: 'uppercase', boxShadow: '0 4px 20px rgba(34,197,94,.2)', fontFamily: 'Onest, sans-serif' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,197,94,.35)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,197,94,.2)'}
                    >
                      <IconUserPlus /> Назначить лидера
                    </button>
                  </>
                ) : (
                  /* ── FORM: MANAGEMENT LEADER ── */
                  <>
                    <div className="org-section-label">Взыскания</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { label: sphereId === 'bikers' || sphereId === 'ghetto' ? 'Выговор' : 'Строгий выговор', icon: <IconWarn/>, type: 'CHANGE_STRICT', bg: 'rgba(248,113,113,.06)', bgHover: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', border: 'rgba(248,113,113,.2)', borderHover: 'rgba(248,113,113,.4)', color: '#f87171', glow: 'rgba(239,68,68,.25)' },
                        { label: sphereId === 'bikers' || sphereId === 'ghetto' ? 'Предупреждение' : 'Устный выговор', icon: <IconSpeech/>, type: 'CHANGE_ORAL', bg: 'rgba(251,191,36,.04)', bgHover: 'linear-gradient(135deg, #f59e0b 0%, #92400e 100%)', border: 'rgba(251,191,36,.15)', borderHover: 'rgba(251,191,36,.4)', color: '#fbbf24', glow: 'rgba(245,158,11,.2)' },
                      ].map(btn => (
                        <button
                          key={btn.type} className="org-btn" onClick={() => openWarnModal(btn)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, padding: '13px 16px', borderRadius: '12px', fontSize: '11px', letterSpacing: '1px', fontWeight: 800, width: '100%', textTransform: 'uppercase', fontFamily: 'Onest, sans-serif' }}
                          onMouseEnter={e => { e.currentTarget.style.background = btn.bgHover; e.currentTarget.style.borderColor = btn.borderHover; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 6px 20px ${btn.glow}` }}
                          onMouseLeave={e => { e.currentTarget.style.background = btn.bg; e.currentTarget.style.borderColor = btn.border; e.currentTarget.style.color = btn.color; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          {btn.icon} {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="org-divider" />

                    <div className="org-section-label">Изменить даты</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.25)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>{f.label}</div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.2)', display: 'flex' }}><IconCalendar /></span>
                            <input
                              type="date" className="org-input" value={f.val} onChange={e => f.set(e.target.value)}
                              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: '#eef2f8', padding: '12px 14px 12px 38px', borderRadius: '12px', fontSize: '13px', width: '100%', colorScheme: 'dark' }}
                              onFocus={e => { e.currentTarget.style.borderColor = selAccent.main + '60'; e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}10` }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.boxShadow = 'none' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {(sphereId === 'mafia' || sphereId === 'bikers') && (
                      <>
                        <div className="org-section-label">Выполнение ГРП</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                          {[
                            { key: 'grp1', label: '1-я ГРП за срок', type: 'TOGGLE_GRP1', checked: sel.grp1 },
                            { key: 'grp2', label: '2-я ГРП за срок', type: 'TOGGLE_GRP2', checked: sel.grp2 },
                          ].map(g => (
                            <label
                              key={g.key}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'Onest, sans-serif', fontSize: '13px', color: g.checked ? '#eef2f8' : 'rgba(255,255,255,.45)' }}
                            >
                              <input
                                type="checkbox" checked={g.checked}
                                onChange={() => send({ type: g.type, rowId: sel.id })}
                                style={{ width: '16px', height: '16px', accentColor: selAccent.main, cursor: 'pointer' }}
                              />
                              {g.label}
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    <button
                      className="org-btn"
                      onClick={() => { if (!canRemoveLeader(user)) { alert('Недостаточно прав для снятия лидера'); return }; send({ type: 'KICK_LEADER', rowId: sel.id }) }}
                      style={{ display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', color: '#f87171', padding: '14px', borderRadius: '12px', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 800, width: '100%', textTransform: 'uppercase', fontFamily: 'Onest, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.3)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(239,68,68,.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.05)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.15)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <IconUserX /> Снять лидера
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ── EMPTY STATE ── */
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'rgba(255,255,255,.12)' }}>
                  <IconShield size={24} />
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.3)', fontWeight: 700, letterSpacing: '.5px', fontFamily: 'Onest, sans-serif' }}>
                  Выберите организацию
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.15)', marginTop: '4px' }}>для управления</div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ── WARN NOTE MODAL ── */}
      {warnModal && (
        <div
          className="org-warn-modal-overlay" onClick={closeWarnModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(3, 5, 10, 0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center', zIndex: 60, animation: 'org-fadeIn .2s ease both', padding: '20px' }}
        >
          <div
            className="org-warn-modal-box" onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(160deg, #111625 0%, #070911 100%)', border: `1px solid ${warnModal.color}25`, borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 40px 80px rgba(0,0,0,.7)', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '20px', right: '20px', height: '1.5px', background: `linear-gradient(90deg, transparent, ${warnModal.color}50, transparent)` }}/>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, background: `rgba(${warnModal.color === '#f87171' ? '248,113,113' : '251,191,36'},.08)`, border: `1px solid ${warnModal.color}25`, display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center', color: warnModal.color }}>
                {warnModal.type === 'CHANGE_STRICT' ? <IconWarn /> : <IconSpeech />}
              </div>
              <div>
                <div style={{ fontSize: '9px', color: warnModal.color, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px', fontFamily: 'Onest, sans-serif' }}>{sphereId === 'bikers' || sphereId === 'ghetto' ? 'Взыскание' : 'Выговор'}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f0f4fa', fontFamily: 'Syne, sans-serif' }}>{warnModal.label}</div>
              </div>
            </div>

            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', fontFamily: 'Onest, sans-serif' }}>Примечание к выговору</div>

            <textarea
              autoFocus placeholder="Опишите причину выговора…" value={warnNote} onChange={e => setWarnNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) confirmWarn() }} rows={4}
              style={{ width: '100%', resize: 'none', background: 'rgba(255,255,255,.03)', border: `1px solid ${warnNote.trim() ? warnModal.color + '40' : 'rgba(255,255,255,.07)'}`, color: '#eef2f8', padding: '12px', borderRadius: '12px', fontSize: '13px', fontFamily: 'Onest, sans-serif', lineHeight: 1.5, colorScheme: 'dark', outline: 'none', transition: 'all .2s', marginBottom: '6px' }}
            />
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.15)', textAlign: 'right', marginBottom: '20px', fontFamily: 'Onest, sans-serif' }}>Ctrl+Enter — подтвердить</div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="org-btn" onClick={closeWarnModal}
                style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)', padding: '12px 0', borderRadius: '11px', fontSize: '11px', letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Onest, sans-serif' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)' }}
              >
                Назад
              </button>

              <button
                className="org-btn" onClick={confirmWarn} disabled={!warnNote.trim()}
                style={{
                  flex: 2,
                  background: warnNote.trim()
                    ? warnModal.type === 'CHANGE_STRICT' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'rgba(255,255,255,.02)',
                  border: `1px solid ${warnNote.trim() ? warnModal.color + '40' : 'rgba(255,255,255,.04)'}`,
                  color: warnNote.trim() ? '#fff' : 'rgba(255,255,255,.15)',
                  padding: '12px 0', borderRadius: '11px', fontSize: '11px', letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Onest, sans-serif',
                  boxShadow: warnNote.trim() ? `0 4px 14px ${warnModal.glow}` : 'none',
                  cursor: warnNote.trim() ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={e => { if (!warnNote.trim()) return; e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
              >
                {sphereId === 'bikers' || sphereId === 'ghetto' ? 'Подтвердить' : 'Выдать выговор'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUSY OVERLAY ── */}
      {busy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 5, 10, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyJackie: 'center', justifyContent: 'center', zIndex: 50, animation: 'org-fadeIn .15s ease both' }}>
          <div style={{ background: 'linear-gradient(160deg, #0e1220 0%, #06080e 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '20px', padding: '36px 54px', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,.6)' }}>
            <div style={{ width: '32px', height: '32px', margin: '0 auto 16px', border: '2px solid rgba(255,255,255,.05)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'org-spin .6s linear infinite' }}/>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 800, fontFamily: 'Onest, sans-serif' }}>Сохранение…</div>
          </div>
        </div>
      )}
    </div>
  )
}