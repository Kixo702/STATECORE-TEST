import { useEffect, useState } from 'react'
import { canRemoveLeader, SERVERS } from '../lib/roles'

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

// ── Icons (в стиле Dashboard.jsx — единый набор IC) ────────────
const IC = {
  shield:  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  speech:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  userPlus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  userX:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>,
  cal:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  user:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  link:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  crown:   <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
}

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

// ── Accent colors per org index (rgb-triplets, в стиле Dashboard.jsx) ──
const ORG_ACCENTS = [
  '96,165,250',   // blue
  '192,132,252',  // purple
  '34,211,238',   // cyan
  '251,191,36',   // amber
  '52,211,153',   // emerald
  '248,113,113',  // red
  '251,146,60',   // orange
  '167,139,250',  // violet
  '244,114,182',  // pink
]

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
  { server: 'florida', sphere: 'mafia' },
  { server: 'florida', sphere: 'bikers' },
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

// Florida — мафии: своя таблица, свои строки лидеров и совсем другая раскладка
// колонок (C-K), в отличие от Texas (см. loadFloridaMafia).
const FLORIDA_MAFIA_LEADER_ROWS = [8, 10, 12]

// Florida — байкеры: та же раскладка колонок (C-K), что и у Florida-мафий,
// но строки лидеров 7/8/9 (см. loadFloridaBikers).
const FLORIDA_BIKERS_LEADER_ROWS = [7, 8, 9]

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

// Кликабельная ссылка (вк) с иконкой и подтверждением перехода
const normalizeExternalUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`)
const confirmAndOpenExternal = (value) => {
  const url = normalizeExternalUrl(value)
  const ok = window.confirm(`Вы уверены, что хотите покинуть сайт и перейти на страницу «${url}»?`)
  if (ok) window.open(url, '_blank', 'noopener,noreferrer')
}

export default function Organizations({ user }) {
  //01 Техас, таблицы и скрипты для редакт.
  const GOV_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/export?format=csv'
  const GOV_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhZYSsvPt0QdbyYiAEfvyfu8XVQwOPeYapuG0HwV8CCngctz43msP9K_o4C-ck13Hy/exec'
  const BO_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRE89xZb9RxVOSfXbtQ4-fyu-FH9r-5ntI4AdPI6xPqmzRh0jVYd9qITXDCpWCEC0RFptElukEjhvD5/pub?gid=0&single=true&output=csv'
  const BO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznx-nXfeywlDhjZ5LHojMHRgsBygotKALwwguCLz_6DM6rCf6-uSfe2o1tGNa3VvwN/exec'
  const MAFIA_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhlLfLsJs2k5DwBm3Lu7B4EuH3b-5kZNNHMGZHhyfpb00XyuPcOIppSFuAGRQXzNR7fFYsPbM6CPuy/pub?gid=0&single=true&output=csv'
  const MAFIA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSyQHwsIouA4yU_CqI0WZRX3m0kfPQBfjnuock_mmSJXQYvaoRZivuUQSWLowHwjZw/exec'
  const BIKERS_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHseJAxV3J2Pyc5-2uvKT97k6Gmf01Oc5uddvZFXlP7FxdbSom1lNMWLsDar0SF66gT5ObWlIzQbaN/pub?gid=0&single=true&output=csv'
  const BIKERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0Q-vii_0uVqdNgwBtdRV9h8xP_46JvQInus5mQkz3yHcEihkBI1cBKZ4K7GA3SHU-/exec'
  const GHETTO_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlRt1hpLQy_7Z7G1PxISAmhgHcc9qS1QX4od1kG4BpM9x1QzPBffKNsA1J3FJwFoXo1rhxyJsGpIHF/pub?gid=0&single=true&output=csv'
  const GHETTO_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybb0LpyB_EL767lr-LNZmwGMTNrxULnUSdwkyXZULlBsOBxGbMF4GlWma_fMqOFvJR/exec'

  //02 Флорида, таблицы для редакт.
  const FLORIDA_MAFIA_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTW7Q7m29fHn6u9D-GYSHWe4NiXuK2ld2K8MOGEWQitE7jUzrTWi1aBl_ud6FbX2Vtl5ERZm9V-MvtC/pub?gid=0&single=true&output=csv'
  const FLORIDA_MAFIA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyqWwbrvdN4NWjebG-3NolDdrrRJd0ohBP2M620ZWG1lcibYVa6pYRB2cI_4T2XBYSu/exec'
  const FLORIDA_BIKERS_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0DhHN9TtdXH3xeRm_0Wec4P55UmQhAbLBOuLPLAGulKMMNnTFh3M8ORmmxwPxNeiPD60ba6cb0qr2/pub?gid=0&single=true&output=csv'
  const FLORIDA_BIKERS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxt34qyUDYBqNg4kmQaFvSMCLIa2VSpdlSkG_fEGdIeHMULJwGDGQNVC_iFrXn4aP94lQ/exec'

  const [serverId, setServerId] = useState(READY_SERVER_ID)
  const [sphereId, setSphereId] = useState('gov')
  const isReady = READY_COMBOS.some(c => c.server === serverId && c.sphere === sphereId)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('Сохранение…')

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
  // Florida — мафии: 3 организации, строки 8/10/12. Колонки: C-ник,
  // D-организация (название фракции), E-вк, F-строгие выговоры,
  // G-устные выговоры, H-штрафные баллы, I-баллы, J-дата назначения,
  // K-дата снятия. Без ГРП-чекбоксов (в отличие от Texas-мафий).
  const loadFloridaMafia = async () => {
    const res = await fetch(`${FLORIDA_MAFIA_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    return FLORIDA_MAFIA_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return {
        id: rowNum,
        name: c(row[3]) || `Мафия (стр. ${rowNum})`,                  // D
        leader: c(row[2]) || 'Вакантно',                               // C
        vk: c(row[4]) || '—',                                           // E
        penalty: c(row[7]) || '—',                                      // H — штрафные баллы
        points: c(row[8]) || '—',                                        // I — баллы
        strict: Number((c(row[5]) || '0/3').split('/')[0]) || 0,          // F
        oral:   Number((c(row[6]) || '0/3').split('/')[0]) || 0,          // G
        appointDate: c(row[9])  || '-',                                    // J
        expiryDate:  c(row[10]) || '-',                                    // K
      }
    })
  }
  // Florida — байкеры: 3 организации, строки 7/8/9. Колонки: B-ник,
  // C-организация (название байкерского клуба), D-вк, E-строгие выговоры,
  // F-устные выговоры, G-штрафные баллы, H-баллы, I-дата назначения,
  // J-дата снятия. "Стоит уже" — справочная формула, в парсинге не участвует.
  const loadFloridaBikers = async () => {
    const res = await fetch(`${FLORIDA_BIKERS_SHEETS_URL}&cacheBust=${Date.now()}`)
    const csv = await res.text()
    const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    const c = s => s?.replace(/"/g, '').trim() || ''
    return FLORIDA_BIKERS_LEADER_ROWS.map(rowNum => {
      const row = rows[rowNum - 1] || []
      return {
        id: rowNum,
        name: c(row[2]) || `Байкеры (стр. ${rowNum})`,                 // C
        leader: c(row[1]) || 'Вакантно',                                // B
        vk: c(row[3]) || '—',                                            // D
        penalty: c(row[6]) || '—',                                       // G — штрафные баллы
        points: c(row[7]) || '—',                                         // H — баллы
        strict: Number((c(row[4]) || '0/5').split('/')[0]) || 0,           // E
        oral:   Number((c(row[5]) || '0/5').split('/')[0]) || 0,           // F
        appointDate: c(row[8]) || '-',                                     // I
        expiryDate:  c(row[9]) || '-',                                     // J
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
    if (orgs.length === 0) setLoading(true)
    try {
      const parsed = serverId === 'florida' && sphereId === 'mafia' ? await loadFloridaMafia()
        : serverId === 'florida' && sphereId === 'bikers' ? await loadFloridaBikers()
        : sphereId === 'bo' ? await loadBo() : sphereId === 'mafia' ? await loadMafia() : sphereId === 'bikers' ? await loadBikers() : sphereId === 'ghetto' ? await loadGhetto() : await loadGov()
      setOrgs(parsed)
      setSel(prev => prev ? (parsed.find(o => o.name === prev.name) ?? null) : null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Отправка изменений: после подтверждения записи в таблицу делаем полный
  // reload страницы, чтобы гарантированно подхватить свежие данные — вместо
  // прежнего точечного повторного запроса (load()), который иногда возвращал
  // ещё не обновившийся кэш Google Sheets.
  const send = async payload => {
    setBusy(true)
    setBusyLabel('Сохранение…')
    try {
      const url = serverId === 'florida' && sphereId === 'mafia' ? FLORIDA_MAFIA_SCRIPT_URL
        : serverId === 'florida' && sphereId === 'bikers' ? FLORIDA_BIKERS_SCRIPT_URL
        : sphereId === 'bo' ? BO_SCRIPT_URL : sphereId === 'mafia' ? MAFIA_SCRIPT_URL : sphereId === 'bikers' ? BIKERS_SCRIPT_URL : sphereId === 'ghetto' ? GHETTO_SCRIPT_URL : GOV_SCRIPT_URL
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await new Promise(r => setTimeout(r, 1300))
      setBusyLabel('Обновление страницы…')
      window.location.reload()
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
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
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes db-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes db-spin     { to{transform:rotate(360deg)} }
        @keyframes db-fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-statPop  { 0%{opacity:0;transform:translateY(6px) scale(.94)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes db-fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes db-slideUp  { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }

        .skeleton-text {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: db-shimmer 1.6s infinite linear;
          border-radius: 6px;
        }
        .org-card { transition: border-color .2s ease, background .2s ease, transform .2s cubic-bezier(.25,1,.5,1); cursor: pointer; }
        .org-card:hover { transform: translateY(-3px); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.6); cursor: pointer; }
      `}</style>

      {/* ── STATUS STRIP ───────────────────────────────── */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-10 flex items-center justify-between text-[11px] font-semibold tracking-wide text-white/35">
          <div className="flex items-center gap-2 uppercase">
            <span>Реестр</span>
            <span className="opacity-35 w-2.5 h-2.5">{IC.chevron}</span>
            <span className="text-white/50">{SERVERS.find(s => s.id === serverId)?.label}</span>
            <span className="opacity-35 w-2.5 h-2.5">{IC.chevron}</span>
            <span className="text-white/50">{SPHERES.find(s => s.id === sphereId)?.label}</span>
          </div>
        </div>
      </div>

      {/* ── BANNER ── */}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Реестр организаций</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Организации</h1>
            <p className="text-slate-400 max-w-lg">
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
        </div>

        {/* ── FILTERS (SERVER & SPHERE) ────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          {/* Серверный дропдаун */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Сервер</span>
            <div className="relative">
              <select
                value={serverId}
                onChange={e => setServerId(e.target.value)}
                className="w-full appearance-none bg-white/5 text-slate-200 border border-white/10 hover:border-white/20 px-4 py-2.5 pr-10 rounded-xl text-xs font-bold transition-all duration-150 outline-none cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                style={{ colorScheme: 'dark' }}
              >
                {SERVERS.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0d1120] text-slate-200 py-2">
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Фильтр сфер */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">Сфера</span>
            <div className="flex flex-wrap gap-2">
              {SPHERES.map(s => {
                const active = sphereId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSphereId(s.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      active
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── NOT READY: IN DEVELOPMENT ── */}
        {!isReady ? (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]"
            style={{ minHeight: 260, animation: 'db-fadeUp .35s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="flex flex-col items-center justify-center text-center px-6 py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-white/5 text-orange-300/80">
                <span className="w-6 h-6 block">{IC.warning}</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Раздел в разработке</h3>
              <p className="text-sm text-slate-400 max-w-md">
                «{SPHERES.find(s => s.id === sphereId)?.label}» на сервере «{SERVERS.find(s => s.id === serverId)?.label}» пока не подключены к реестру организаций. Сейчас доступны «Государственные структуры», «Бизнес организации», «Мафии», «Байкеры» и «Гетто» на сервере «Texas».
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-7 items-start">
          {/* ── ORG CARDS ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">
                Организации ({SERVERS.find(s => s.id === serverId)?.label})
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden relative" style={{ height: 190 }}>
                    <div className="absolute inset-0 skeleton-text" style={{ borderRadius: 16 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {orgs.map((org, idx) => {
                  const isSel    = sel?.name === org.name
                  const isVacant = org.leader === 'Вакантно'
                  const accent   = ORG_ACCENTS[idx % ORG_ACCENTS.length]
                  const orgIcon  = ORG_ICONS[org.name]
                  const initials = isVacant ? '?' : org.leader.slice(0, 2).toUpperCase()

                  return (
                    <div
                      key={org.name}
                      onClick={() => setSel(org)}
                      className={`org-card relative overflow-hidden rounded-2xl border p-6 ${
                        isVacant && !isSel ? 'bg-red-400/[0.02]' : 'bg-white/[0.015]'
                      }`}
                      style={{
                        borderColor: isSel ? `rgba(${accent},.45)` : isVacant ? 'rgba(248,113,113,.15)' : 'rgba(255,255,255,.08)',
                        background: isSel ? `linear-gradient(150deg, rgba(${accent},.06) 0%, rgba(10,14,26,.6) 70%)` : undefined,
                        boxShadow: isSel ? `0 16px 40px rgba(${accent},.15)` : 'none',
                        animation: `db-fadeUp .35s cubic-bezier(0.16, 1, 0.3, 1) both ${idx * 0.04}s`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isSel ? `rgba(${accent},.12)` : 'rgba(255,255,255,.04)',
                            border: `1px solid ${isSel ? `rgba(${accent},.35)` : 'rgba(255,255,255,.07)'}`,
                          }}
                        >
                          {orgIcon ? (
                            <img
                              src={orgIcon}
                              alt={org.name}
                              width={org.name === 'Радио24' ? 32 : 24}
                              height={org.name === 'Радио24' ? 32 : 24}
                              style={{ objectFit: 'contain', filter: isSel ? 'none' : 'brightness(.5) saturate(0)', transition: 'all .2s' }}
                            />
                          ) : (
                            <span className="w-[18px] h-[18px] block" style={{ color: isSel ? `rgb(${accent})` : 'rgba(255,255,255,.25)' }}>{IC.shield}</span>
                          )}
                        </div>

                        <span
                          className="text-[9px] font-extrabold tracking-[1.5px] px-2 py-1 rounded-md"
                          style={{
                            color: isSel ? `rgb(${accent})` : 'rgba(255,255,255,.35)',
                            background: isSel ? `rgba(${accent},.1)` : 'rgba(255,255,255,.03)',
                            border: `1px solid ${isSel ? `rgba(${accent},.3)` : 'rgba(255,255,255,.06)'}`,
                          }}
                        >
                          #{org.id}
                        </span>
                      </div>

                      <div
                        className="text-sm font-bold tracking-[2px] uppercase mb-3"
                        style={{ color: isSel ? `rgb(${accent})` : 'rgba(255,255,255,.55)' }}
                      >
                        {org.name}
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-base"
                          style={{
                            background: isVacant ? 'rgba(248,113,113,.08)' : isSel ? `rgba(${accent},.1)` : 'rgba(255,255,255,.05)',
                            border: `1.5px solid ${isVacant ? 'rgba(248,113,113,.25)' : isSel ? `rgba(${accent},.35)` : 'rgba(255,255,255,.08)'}`,
                            color: isVacant ? '#f87171' : isSel ? `rgb(${accent})` : 'rgba(255,255,255,.45)',
                          }}
                        >
                          {isVacant ? '—' : initials}
                        </div>

                        <div className="min-w-0">
                          <div className={`text-[15px] font-bold truncate ${isVacant ? 'italic text-red-400/50' : 'text-slate-100'}`}>
                            {org.leader}
                          </div>
                          {!isVacant && (
                            <div
                              className="text-[10px] font-bold tracking-wider uppercase mt-0.5 flex items-center gap-1.5"
                              style={{ color: isSel ? `rgb(${accent})` : 'rgba(255,255,255,.35)' }}
                            >
                              <span className="w-3 h-3 block">{IC.crown}</span> Лидер
                            </div>
                          )}
                        </div>
                      </div>

                      {sphereId === 'mafia' && !isVacant && (
                        <div className="flex gap-1.5 mb-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border border-white/[0.08] text-slate-300 bg-white/[0.03]">Бизнесы · {org.biz}</span>
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border border-white/[0.08] text-slate-300 bg-white/[0.03]">Баллы · {org.points}</span>
                        </div>
                      )}
                      {sphereId === 'bikers' && !isVacant && (
                        <div className="flex gap-1.5 mb-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border border-white/[0.08] text-slate-300 bg-white/[0.03]">Баллы · {org.points}</span>
                        </div>
                      )}
                      {sphereId === 'ghetto' && !isVacant && (
                        <div className="flex gap-1.5 mb-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border border-white/[0.08] text-slate-300 bg-white/[0.03]">Баллы · {org.points}</span>
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border border-white/[0.08] text-slate-300 bg-white/[0.03]">Фракция · {org.faction}</span>
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        {[
                          { label: `${sphereId === 'bikers' || sphereId === 'ghetto' ? 'В' : 'СВ'} · ${org.strict}/${sphereId === 'bikers' || sphereId === 'ghetto' ? 5 : 3}`, active: org.strict > 0, accent: '248,113,113' },
                          { label: `${sphereId === 'bikers' || sphereId === 'ghetto' ? 'П' : 'УВ'} · ${org.oral}/${sphereId === 'bikers' || sphereId === 'ghetto' ? 5 : 3}`, active: org.oral > 0, accent: '251,191,36' },
                        ].map(b => (
                          <span
                            key={b.label}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold"
                            style={{
                              border: `1px solid ${b.active ? `rgba(${b.accent},.3)` : 'rgba(255,255,255,.06)'}`,
                              color: b.active ? `rgb(${b.accent})` : 'rgba(255,255,255,.25)',
                              background: b.active ? `rgba(${b.accent},.08)` : 'transparent',
                            }}
                          >
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
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 xl:sticky xl:top-6 max-h-[calc(100vh-48px)] overflow-y-auto">
            {sel ? (
              <div key={sel.name} style={{ animation: 'db-fadeUp .3s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                {/* ── PANEL HEADER ── */}
                <div className="mb-5">
                  <div className="text-[10px] font-extrabold tracking-[3px] uppercase text-white/30 mb-3">Управление</div>
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ background: `rgba(${selAccent},.1)`, border: `1px solid rgba(${selAccent},.35)`, boxShadow: `0 4px 14px rgba(${selAccent},.2)` }}
                    >
                      {ORG_ICONS[sel.name] ? (
                        <img src={ORG_ICONS[sel.name]} alt={sel.name} width={24} height={24} style={{ objectFit: 'contain' }} />
                      ) : (
                        <span className="w-5 h-5 block" style={{ color: `rgb(${selAccent})` }}>{IC.shield}</span>
                      )}
                    </div>
                    <div className="text-2xl font-black tracking-tight" style={{ color: `rgb(${selAccent})` }}>
                      {sel.name}
                    </div>
                  </div>
                </div>

                {/* ── CURRENT LEADER CARD ── */}
                <div
                  className="rounded-2xl p-4 mb-5 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, rgba(${selAccent},.06) 0%, rgba(255,255,255,.01) 100%)`, border: `1px solid rgba(${selAccent},.15)` }}
                >
                  <div className="text-[9px] font-bold tracking-[2px] uppercase mb-3 flex items-center gap-1.5" style={{ color: `rgb(${selAccent})` }}>
                    <span className="w-3.5 h-3.5 block">{IC.crown}</span> Текущий лидер
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-black text-base"
                      style={{
                        background: vacant ? 'rgba(248,113,113,.06)' : `rgba(${selAccent},.1)`,
                        border: `2px solid ${vacant ? 'rgba(248,113,113,.2)' : `rgba(${selAccent},.35)`}`,
                        color: vacant ? '#f87171' : `rgb(${selAccent})`,
                      }}
                    >
                      {vacant ? '—' : sel.leader.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-base font-bold truncate ${vacant ? 'italic text-red-400/40' : 'text-slate-100'}`}>
                        {sel.leader}
                      </div>
                      {sel.vk && sel.vk !== '—' && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{sel.vk}</div>
                      )}
                    </div>
                  </div>
                </div>

                {sphereId === 'mafia' && !vacant && (
                  <div className="flex gap-2.5 mb-5">
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
                      <div className="text-[9px] text-white/35 tracking-wider uppercase font-bold mb-1">Контроль бизнесов</div>
                      <div className="text-base font-extrabold text-slate-100">{sel.biz}</div>
                    </div>
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
                      <div className="text-[9px] text-white/35 tracking-wider uppercase font-bold mb-1">Баллы лидера</div>
                      <div className="text-base font-extrabold text-slate-100">{sel.points}</div>
                    </div>
                  </div>
                )}
                {sphereId === 'bikers' && !vacant && (
                  <div className="flex gap-2.5 mb-5">
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
                      <div className="text-[9px] text-white/35 tracking-wider uppercase font-bold mb-1">Баллы лидера</div>
                      <div className="text-base font-extrabold text-slate-100">{sel.points}</div>
                    </div>
                  </div>
                )}
                {sphereId === 'ghetto' && !vacant && (
                  <div className="flex gap-2.5 mb-5">
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
                      <div className="text-[9px] text-white/35 tracking-wider uppercase font-bold mb-1">Баллы лидера</div>
                      <div className="text-base font-extrabold text-slate-100">{sel.points}</div>
                    </div>
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.07] rounded-xl p-3">
                      <div className="text-[9px] text-white/35 tracking-wider uppercase font-bold mb-1">Фракция</div>
                      <div className="text-base font-extrabold text-slate-100">{sel.faction}</div>
                    </div>
                  </div>
                )}

                <div className="h-px my-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)' }} />

                {vacant ? (
                  /* ── FORM: APPOINT LEADER ── */
                  <>
                    <div className="text-[10px] font-extrabold tracking-[3px] uppercase text-white/30 mb-3">Назначение лидера</div>
                    <div className="flex flex-col gap-2.5 mb-4">
                      {[
                        { val: fNick,  set: setFNick,  ph: 'Ник лидера',       icon: IC.user },
                        { val: fVK,    set: setFVK,    ph: 'VK',               icon: IC.link },
                        ...(sphereId !== 'ghetto' ? [{ val: fForum, set: setFForum, ph: 'Форумный аккаунт', icon: IC.link }] : []),
                      ].map(f => (
                        <div key={f.ph} className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 block">{f.icon}</span>
                          <input
                            type="text" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.08] text-slate-100 rounded-xl text-[13px] pl-10 pr-3.5 py-3 outline-none transition-colors focus:border-white/30"
                          />
                        </div>
                      ))}

                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="text-[9px] text-white/25 tracking-wider uppercase font-bold mb-1.5">{f.label}</div>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 block">{IC.cal}</span>
                            <input
                              type="date" value={f.val} onChange={e => f.set(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-slate-100 rounded-xl text-[13px] pl-10 pr-3.5 py-3 outline-none transition-colors focus:border-white/30"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSetLeader}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-[11px] font-extrabold tracking-[1.5px] uppercase text-white transition-shadow"
                      style={{ background: 'linear-gradient(135deg, #22c55e 0%, #166534 100%)', border: '1px solid rgba(34,197,94,.25)', boxShadow: '0 4px 20px rgba(34,197,94,.2)' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,197,94,.35)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,197,94,.2)'}
                    >
                      <span className="w-4 h-4 block">{IC.userPlus}</span> Назначить лидера
                    </button>
                  </>
                ) : (
                  /* ── FORM: MANAGEMENT LEADER ── */
                  <>
                    <div className="text-[10px] font-extrabold tracking-[3px] uppercase text-white/30 mb-3">Взыскания</div>
                    <div className="flex flex-col gap-2.5 mb-5">
                      {[
                        { label: sphereId === 'ghetto' || (sphereId === 'bikers' && serverId !== 'florida') ? 'Выговор' : 'Строгий выговор', icon: IC.warning, type: 'CHANGE_STRICT', accent: '239,68,68', textColor: '#f87171' },
                        { label: sphereId === 'ghetto' || (sphereId === 'bikers' && serverId !== 'florida') ? 'Предупреждение' : 'Устный выговор', icon: IC.speech, type: 'CHANGE_ORAL', accent: '245,158,11', textColor: '#fbbf24' },
                      ].map(btn => (
                        <button
                          key={btn.type}
                          onClick={() => openWarnModal(btn)}
                          className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150"
                          style={{ background: `rgba(${btn.accent},.06)`, border: `1px solid rgba(${btn.accent},.2)`, color: btn.textColor }}
                          onMouseEnter={e => { e.currentTarget.style.background = `rgb(${btn.accent})`; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 6px 20px rgba(${btn.accent},.3)` }}
                          onMouseLeave={e => { e.currentTarget.style.background = `rgba(${btn.accent},.06)`; e.currentTarget.style.color = btn.textColor; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <span className="w-4 h-4 block">{btn.icon}</span> {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="h-px my-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)' }} />

                    <div className="text-[10px] font-extrabold tracking-[3px] uppercase text-white/30 mb-3">Изменить даты</div>
                    <div className="flex flex-col gap-2.5 mb-5">
                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="text-[9px] text-white/25 tracking-wider uppercase font-bold mb-1.5">{f.label}</div>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 block">{IC.cal}</span>
                            <input
                              type="date" value={f.val} onChange={e => f.set(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-slate-100 rounded-xl text-[13px] pl-10 pr-3.5 py-3 outline-none transition-colors focus:border-white/30"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {(sphereId === 'mafia' || sphereId === 'bikers') && (
                      <>
                        <div className="text-[10px] font-extrabold tracking-[3px] uppercase text-white/30 mb-3">Выполнение ГРП</div>
                        <div className="flex flex-col gap-2 mb-5">
                          {[
                            { key: 'grp1', label: '1-я ГРП за срок', type: 'TOGGLE_GRP1', checked: sel.grp1 },
                            { key: 'grp2', label: '2-я ГРП за срок', type: 'TOGGLE_GRP2', checked: sel.grp2 },
                          ].map(g => (
                            <label
                              key={g.key}
                              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer text-[13px] ${
                                g.checked ? 'border-white/[0.1] text-slate-100' : 'border-white/[0.06] text-white/45'
                              } bg-white/[0.02]`}
                            >
                              <input
                                type="checkbox" checked={g.checked}
                                onChange={() => send({ type: g.type, rowId: sel.id })}
                                className="w-4 h-4 cursor-pointer"
                                style={{ accentColor: `rgb(${selAccent})` }}
                              />
                              {g.label}
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => { if (!canRemoveLeader(user)) { alert('Недостаточно прав для снятия лидера'); return }; send({ type: 'KICK_LEADER', rowId: sel.id }) }}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-[11px] font-extrabold tracking-wider uppercase transition-all duration-150"
                      style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', color: '#f87171' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(239,68,68,.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.05)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <span className="w-4 h-4 block">{IC.userX}</span> Снять лидера
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ── EMPTY STATE ── */
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4 text-white/10">
                  <span className="w-6 h-6 block">{IC.shield}</span>
                </div>
                <div className="text-[13px] text-white/30 font-bold tracking-wide">Выберите организацию</div>
                <div className="text-xs text-white/15 mt-1">для управления</div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ── WARN NOTE MODAL ── */}
      {warnModal && (
        <div
          onClick={closeWarnModal}
          className="fixed inset-0 flex items-center justify-center p-5 z-[60]"
          style={{ background: 'rgba(3,5,10,.65)', backdropFilter: 'blur(10px)', animation: 'db-fadeIn .2s ease both' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-[20px] p-7 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #111625 0%, #070911 100%)', border: `1px solid rgba(${warnModal.accent},.2)`, boxShadow: '0 40px 80px rgba(0,0,0,.7)' }}
          >
            <div className="absolute top-0 left-5 right-5 h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, rgba(${warnModal.accent},.4), transparent)` }} />

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: `rgba(${warnModal.accent},.08)`, border: `1px solid rgba(${warnModal.accent},.25)`, color: warnModal.textColor }}
              >
                <span className="w-4 h-4 block">{warnModal.type === 'CHANGE_STRICT' ? IC.warning : IC.speech}</span>
              </div>
              <div>
                <div className="text-[9px] tracking-[2px] uppercase font-bold mb-0.5" style={{ color: warnModal.textColor }}>
                  {sphereId === 'bikers' || sphereId === 'ghetto' ? 'Взыскание' : 'Выговор'}
                </div>
                <div className="text-lg font-extrabold text-slate-100">{warnModal.label}</div>
              </div>
            </div>

            <div className="text-[9px] text-white/30 tracking-wider uppercase font-bold mb-2">Примечание к выговору</div>

            <textarea
              autoFocus placeholder="Опишите причину выговора…" value={warnNote} onChange={e => setWarnNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) confirmWarn() }} rows={4}
              className="w-full resize-none bg-white/[0.03] text-slate-100 rounded-xl p-3 text-[13px] leading-relaxed outline-none mb-1.5"
              style={{ border: `1px solid ${warnNote.trim() ? `rgba(${warnModal.accent},.4)` : 'rgba(255,255,255,.07)'}`, colorScheme: 'dark' }}
            />
            <div className="text-[10px] text-white/15 text-right mb-5">Ctrl+Enter — подтвердить</div>

            <div className="flex gap-2.5">
              <button
                onClick={closeWarnModal}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] text-white/40 rounded-[11px] py-3 text-[11px] font-extrabold tracking-wider uppercase transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Назад
              </button>

              <button
                onClick={confirmWarn} disabled={!warnNote.trim()}
                className="flex-[2] rounded-[11px] py-3 text-[11px] font-extrabold tracking-wider uppercase text-white transition-shadow"
                style={{
                  background: warnNote.trim()
                    ? warnModal.type === 'CHANGE_STRICT' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'rgba(255,255,255,.02)',
                  border: `1px solid ${warnNote.trim() ? `rgba(${warnModal.accent},.4)` : 'rgba(255,255,255,.04)'}`,
                  color: warnNote.trim() ? '#fff' : 'rgba(255,255,255,.15)',
                  boxShadow: warnNote.trim() ? `0 4px 14px rgba(${warnModal.accent},.25)` : 'none',
                  cursor: warnNote.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {sphereId === 'bikers' || sphereId === 'ghetto' ? 'Подтвердить' : 'Выдать выговор'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUSY OVERLAY ── */}
      {busy && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(3,5,10,.75)', backdropFilter: 'blur(8px)', animation: 'db-fadeIn .15s ease both' }}>
          <div className="rounded-[20px] px-14 py-9 text-center" style={{ background: 'linear-gradient(160deg, #0e1220 0%, #06080e 100%)', border: '1px solid rgba(255,255,255,.06)', boxShadow: '0 30px 60px rgba(0,0,0,.6)' }}>
            <div className="w-8 h-8 mx-auto mb-4 rounded-full" style={{ border: '2px solid rgba(255,255,255,.05)', borderTopColor: '#fbbf24', animation: 'db-spin .6s linear infinite' }} />
            <div className="text-white/30 text-[10px] tracking-[3px] uppercase font-extrabold">{busyLabel}</div>
          </div>
        </div>
      )}
    </div>
  )
}