import { useEffect, useMemo, useState } from 'react'
import banner from '../assets/banner.png'
import {
  isPlayer,
  isLeaderOfFaction,
  getLeadershipDirection,
  isChief,
  isDeputy,
} from '../lib/roles'

/* ───────── ИКОНКИ В СТИЛЕ DASHBOARD ───────── */
const IC = {
  search: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M21 21l-4-4m1-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <path d="M6 2h9l5 5v15H6V2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <path d="M14.7 6.3a4 4 0 10-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spin: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="56" strokeDashoffset="14" strokeLinecap="round" />
    </svg>
  ),
}

/* ───────── ХЕЛПЕРЫ И ССЫЛКИ ───────── */
const clean = (v) => v?.replace(/"/g, '').trim() || ''

const normalizeExternalUrl = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`)

const confirmAndOpenExternal = (value) => {
  const url = normalizeExternalUrl(value)
  const ok = window.confirm(`Вы уверены, что хотите покинуть сайт и перейти на страницу «${url}»?`)
  if (ok) window.open(url, '_blank', 'noopener,noreferrer')
}

function ContactLink({ label, value, colorClass = "hover:text-orange-400" }) {
  if (!value || value === '-') return null
  return (
    <button
      onClick={() => confirmAndOpenExternal(value)}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 ${colorClass} transition-colors underline decoration-dotted underline-offset-2 cursor-pointer`}
    >
      {IC.link}
      {label}
    </button>
  )
}

const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

const parseDate = (d) => {
  if (!d) return null
  const [day, month, year] = d.split('.')
  if (!day || !month || !year) return null
  return new Date(`${year}-${month}-${day}`)
}

const isPermanent = (term) => (term || '').toLowerCase().includes('навсегда')

const LIFTED_RE = /вынесен|снят(а|о)?\s*(с|из)?\s*(чс|blacklist)|обжалован/i
const isLifted = (note) => LIFTED_RE.test(note || '')

const isDateExpired = (term, endDate) => {
  if (isPermanent(term)) return false
  const d = parseDate(endDate)
  return d ? d < new Date() : false
}

const getStatus = (p) => {
  if (isLifted(p.note)) return 'lifted'
  if (isDateExpired(p.term, p.endDate)) return 'expired'
  return 'active'
}

const CHSBO_DOCS_URL =
  'https://docs.google.com/document/d/1qVCFsoORgJY7y1q23te6ZGWoqlkiQDfHeA3xnYeTq3A/edit?tab=t.0'

const CHSMAFIA_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1491874856&single=true&output=csv'

const MAFIA_LEVELS = [
  { key: 'red', match: /красн/i, label: 'Красная степень', days: null, color: '248,113,113' },
  { key: 'yellow', match: /жел|жёл/i, label: 'Жёлтая степень', days: 90, color: '251,146,60' },
  { key: 'blue', match: /син/i, label: 'Синяя степень', days: 365, color: '56,189,248' },
]

const getMafiaLevel = (term) => {
  const t = (term || '').toLowerCase()
  return MAFIA_LEVELS.find((l) => l.match.test(t)) || null
}

const getMafiaStatus = (p) => {
  if (clean(p.amnesty)) return 'lifted'
  const end = parseDate(p.endDate)
  if (end) return end <= new Date() ? 'lifted' : 'active'

  const level = getMafiaLevel(p.term)
  if (level && level.days) {
    const added = parseDate(p.dateAdded)
    if (added) {
      const expiry = new Date(added)
      expiry.setDate(expiry.getDate() + level.days)
      if (expiry < new Date()) return 'expired'
    }
  }
  return 'active'
}

const mafiaExpectedEnd = (p, level) => {
  if (!level || !level.days) return null
  const added = parseDate(p.dateAdded)
  if (!added) return null
  const expiry = new Date(added)
  expiry.setDate(expiry.getDate() + level.days)
  return expiry.toLocaleDateString('ru-RU')
}

const CHSGHETTO_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1797494060&single=true&output=csv'

const parseGhettoNickname = (raw) => {
  const v = (raw || '').trim()
  const parts = v.split(/\s+I\s+/)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { nickname: parts[1].trim(), oldNickname: parts[0].trim() }
  }
  return { nickname: v, oldNickname: null }
}

const parseGhettoUntil = (raw) => {
  const v = (raw || '').trim()
  if (!v) return { permanent: false, endDate: null, raw: v }
  if (/навсегда/i.test(v)) return { permanent: true, endDate: null, raw: v }
  const m = v.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/)
  return { permanent: false, endDate: m ? m[1] : null, raw: v }
}

const isGhettoLifted = (raw) => {
  const v = (raw || '').trim().toLowerCase()
  if (!v || v === '-') return false
  if (/^нет$/.test(v)) return false
  return true
}

const getGhettoStatus = (p) => {
  if (isGhettoLifted(p.liftedRaw)) return 'lifted'
  if (!p.permanent && p.endDate) {
    const d = parseDate(p.endDate)
    if (d && d < new Date()) return 'expired'
  }
  return 'active'
}

const CHSBIKERS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1668268846&single=true&output=csv'

const BIKER_LEVELS = [
  { key: 'high', match: /высок/i, label: 'Высокий уровень', color: '248,113,113' },
  { key: 'medium', match: /средн/i, label: 'Средний уровень', color: '251,146,60' },
]

const getBikerLevel = (level) => {
  const t = (level || '').toLowerCase()
  return BIKER_LEVELS.find((l) => l.match.test(t)) || null
}

const getBikerStatus = (p) => {
  const end = parseDate(p.endDate)
  if (end) return end <= new Date() ? 'lifted' : 'active'
  return 'active'
}

const SPHERES = [
  { id: 'gov', label: 'Государственные', hasSource: true },
  { id: 'bo', label: 'Бизнес организации', hasSource: true },
  { id: 'mafia', label: 'Синдикаты', hasSource: true },
  { id: 'ghetto', label: 'Уличные группировки', hasSource: true },
  { id: 'bikers', label: 'Байкерские клубы', hasSource: true },
]

/* ───────── КАРКАС СТРАНИЦЫ (ТЕМАТИКА DASHBOARD) ───────── */
function PageChrome({ children }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })

  return (
    <div
      className="text-white min-h-screen relative"
      style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}
    >
      {/* Upper Status Strip */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-10 flex items-center justify-between text-[11px] font-semibold tracking-wide text-white/35">
          <div className="uppercase">
            {dateStr}, {timeStr}
          </div>
          <div className="flex items-center gap-1.5 text-orange-400/80">
            {IC.shield}
            <span>STATECORE SECURITY SYSTEM</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="w-full bg-[#0a0e18] border-b border-white/5 pt-4 pb-2">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="relative w-full max-h-[140px] overflow-hidden rounded-2xl border border-white/5">
            <img src={banner} alt="banner" className="w-full object-contain block opacity-90" />
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0a0e18] to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-8 relative z-10">{children}</div>
    </div>
  )
}

/* ───────── ЗАГЛУШКА В РАЗРАБОТКЕ ───────── */
function InDevelopmentCard({ sphereLabel }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Черный список
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">{sphereLabel}</h1>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-12 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
          {IC.wrench}
        </div>
        <h3 className="text-lg font-bold text-slate-200 mt-2">Раздел в разработке</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Единая база взысканий для данного направления подключается. Загляните позже.
        </p>
      </div>
    </div>
  )
}

/* ───────── ССЫЛКА НА GOOGLE DOCS ───────── */
function DocsLinkCard({ sphereLabel, url }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Черный список
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">{sphereLabel}</h1>
        <p className="text-slate-400 text-sm mt-1">
          Официальный Реестр занесённых лиц ведётся во внешнем регламентированном документе
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.015] p-12 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
          {IC.doc}
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-slate-100">Документ сферы {sphereLabel}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Нажмите на кнопку ниже для перехода к просмотру онлайн-документа
          </p>
        </div>
        <button
          onClick={() => confirmAndOpenExternal(url)}
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 cursor-pointer"
        >
          <span>Открыть Google Docs</span>
          {IC.link}
        </button>
      </div>
    </div>
  )
}

/* ───────── ТАБЛИЦА ЧС ГОС ───────── */
function ChsGosTable({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const CHSGOS_URL =
    'https://docs.google.com/spreadsheets/d/1U8Af3WFz7LafeJeSh8TACam9Rs7ACa_haUMJjRjfRTg/gviz/tq?tqx=out:csv&gid=1094292304'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CHSGOS_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()
      const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
      if (lines.length === 0) {
        setEntries([])
        return
      }

      const parsed = lines
        .slice(1)
        .map((line) => {
          const r = parseCSVLine(line)
          return {
            id: clean(r[0]),
            nickname: clean(r[1]),
            vk: clean(r[2]),
            forum: clean(r[3]),
            dateAdded: clean(r[4]),
            term: clean(r[5]),
            endDate: clean(r[6]),
            reason: clean(r[7]),
            note: clean(r[8]),
            admin: clean(r[9]),
          }
        })
        .filter((x) => x.nickname && !x.nickname.toLowerCase().includes('никнейм'))

      setEntries(parsed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return entries.filter((p) => {
      const matchSearch = p.nickname?.toLowerCase().includes(s)
      const status = getStatus(p)
      const statusOk =
        filter === 'ALL' ? true : filter === 'ACTIVE' ? status === 'active' : status !== 'active'
      return matchSearch && statusOk
    })
  }, [entries, search, filter])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(pageNumber, 1), totalPages)
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (page === 1 || page === totalPages) return true
    return page >= currentPage - 1 && page <= currentPage + 1
  })

  useEffect(() => {
    if (pageNumber !== currentPage) setPageNumber(currentPage)
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel = filter === 'ALL' ? 'Все статусы' : filter === 'ACTIVE' ? 'Активные' : 'Снятые / Истёкшие'

  return (
    <>
      <div className="mb-8">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Дисциплинарный реестр
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Государственные структуры (ЧС Гос)</h1>
        <p className="text-slate-400 text-sm mt-1">
          Единый запрет на вступление и нахождение в структурах государственной исполнительной власти
        </p>
      </div>

      {/* CONTROL BAR */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl w-full">
          <span className="text-slate-400">{IC.search}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по никнейму..."
            className="bg-transparent outline-none w-full text-xs text-slate-200 placeholder-slate-500 font-medium"
          />
        </div>

        <div className="relative z-20 shrink-0">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              {IC.filter}
              <span>{filterLabel}</span>
            </div>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden bg-[#0d1120] border border-white/10 shadow-2xl z-50 p-1">
              {[
                { id: 'ALL', label: 'Все статусы' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные / Снятые' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    filter === f.id ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            {IC.spin}
            <span className="text-xs font-bold tracking-wider uppercase">Синхронизация данных...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            Записи не найдены
          </div>
        ) : (
          pageItems.map((p) => {
            const permanent = isPermanent(p.term)
            const status = getStatus(p)

            const accentColor =
              status === 'lifted'
                ? '56,189,248'
                : status === 'expired'
                ? '34,197,94'
                : '248,113,113'

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : permanent
                ? 'Навсегда'
                : 'Активен'

            return (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-all duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accentColor})` }} />

                <div className="pl-5 pr-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate">{p.nickname}</h3>
                      <p className="text-[10px] font-mono text-slate-500 tracking-wider">ID #{p.id || '—'}</p>
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accentColor})` }} />
                      {badgeLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300 border-l-2 border-white/10 pl-3 italic">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {p.note && <p className="mt-2 text-[11px] text-slate-500 pl-3">Примечание: {p.note}</p>}

                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Внесён</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.dateAdded || '—'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Срок</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.term || '—'}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Окончание</div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {permanent ? 'Бессрочно' : p.endDate || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <ContactLink label="VK" value={p.vk} />
                      <ContactLink label="Форум" value={p.forum} colorClass="hover:text-amber-400" />
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Внёс: <span className="text-slate-300 font-semibold">{p.admin || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PAGINATION */}
      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-[36px] h-9 px-3 rounded-xl border text-xs font-bold transition ${
                page === currentPage
                  ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── ТАБЛИЦА ЧС МАФИЙ ───────── */
function ChsMafiaTable({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CHSMAFIA_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()
      const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
      if (lines.length === 0) {
        setEntries([])
        return
      }

      const parsed = lines
        .slice(7)
        .map((line, idx) => {
          const r = parseCSVLine(line)
          return {
            id: `mafia-${idx}`,
            nickname: clean(r[2]),
            amnesty: clean(r[3]),
            vk: clean(r[4]),
            term: clean(r[5]),
            dateAdded: clean(r[6]),
            endDate: clean(r[7]),
            reason: clean(r[8]),
            admin: clean(r[9]),
          }
        })
        .filter((x) => x.nickname && !x.nickname.toLowerCase().includes('никнейм'))

      setEntries(parsed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return entries.filter((p) => {
      const matchSearch = p.nickname?.toLowerCase().includes(s)
      const status = getMafiaStatus(p)
      const statusOk =
        filter === 'ALL' ? true : filter === 'ACTIVE' ? status === 'active' : status !== 'active'
      return matchSearch && statusOk
    })
  }, [entries, search, filter])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(pageNumber, 1), totalPages)
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (page === 1 || page === totalPages) return true
    return page >= currentPage - 1 && page <= currentPage + 1
  })

  useEffect(() => {
    if (pageNumber !== currentPage) setPageNumber(currentPage)
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel = filter === 'ALL' ? 'Все статусы' : filter === 'ACTIVE' ? 'Активные' : 'Снятые / Истёкшие'

  return (
    <>
      <div className="mb-8">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Дисциплинарный реестр
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Преступные синдикаты (ЧС Мафий)</h1>
        <p className="text-slate-400 text-sm mt-1">
          Официальный список ограничений на участие в структурах мафиозных синдикатов
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl w-full">
          <span className="text-slate-400">{IC.search}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по никнейму..."
            className="bg-transparent outline-none w-full text-xs text-slate-200 placeholder-slate-500 font-medium"
          />
        </div>

        <div className="relative z-20 shrink-0">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              {IC.filter}
              <span>{filterLabel}</span>
            </div>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden bg-[#0d1120] border border-white/10 shadow-2xl z-50 p-1">
              {[
                { id: 'ALL', label: 'Все статусы' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные / Снятые' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    filter === f.id ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            {IC.spin}
            <span className="text-xs font-bold tracking-wider uppercase">Синхронизация данных...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            Записи не найдены
          </div>
        ) : (
          pageItems.map((p) => {
            const level = getMafiaLevel(p.term)
            const status = getMafiaStatus(p)

            const accentColor =
              status === 'lifted'
                ? '56,189,248'
                : status === 'expired'
                ? '34,197,94'
                : level?.color || '248,113,113'

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : level?.label || p.term || 'Активен'

            const expectedEnd = mafiaExpectedEnd(p, level)

            return (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-all duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accentColor})` }} />

                <div className="pl-5 pr-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-black text-white truncate">{p.nickname}</h3>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accentColor})` }} />
                      {badgeLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300 border-l-2 border-white/10 pl-3 italic">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {p.amnesty && <p className="mt-2 text-[11px] text-slate-500 pl-3">Амнистия: {p.amnesty}</p>}

                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Внесён</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.dateAdded || '—'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Степень</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.term || '—'}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Вынесен</div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {p.endDate || (level && !level.days ? 'Бессрочно' : expectedEnd || '—')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <ContactLink label="VK" value={p.vk} />
                    <div className="text-[11px] text-slate-500">
                      Внёс: <span className="text-slate-300 font-semibold">{p.admin || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-[36px] h-9 px-3 rounded-xl border text-xs font-bold transition ${
                page === currentPage
                  ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── ТАБЛИЦА ЧС ГЕТТО ───────── */
function ChsGhettoTable({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CHSGHETTO_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()
      const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
      if (lines.length === 0) {
        setEntries([])
        return
      }

      const parsed = lines
        .slice(2)
        .map((line, idx) => {
          const r = parseCSVLine(line)
          const { nickname, oldNickname } = parseGhettoNickname(clean(r[0]))
          const until = parseGhettoUntil(clean(r[2]))

          return {
            id: `ghetto-${idx}`,
            nickname,
            oldNickname,
            vk: clean(r[1]),
            permanent: until.permanent,
            endDate: until.endDate,
            untilRaw: until.raw,
            reason: clean(r[3]),
            admin: clean(r[4]),
            liftedRaw: clean(r[5]),
          }
        })
        .filter((x) => x.nickname && !x.nickname.toLowerCase().includes('ник'))

      setEntries(parsed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return entries.filter((p) => {
      const matchSearch =
        p.nickname?.toLowerCase().includes(s) || p.oldNickname?.toLowerCase().includes(s)
      const status = getGhettoStatus(p)
      const statusOk =
        filter === 'ALL' ? true : filter === 'ACTIVE' ? status === 'active' : status !== 'active'
      return matchSearch && statusOk
    })
  }, [entries, search, filter])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(pageNumber, 1), totalPages)
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (page === 1 || page === totalPages) return true
    return page >= currentPage - 1 && page <= currentPage + 1
  })

  useEffect(() => {
    if (pageNumber !== currentPage) setPageNumber(currentPage)
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel = filter === 'ALL' ? 'Все статусы' : filter === 'ACTIVE' ? 'Активные' : 'Снятые / Истёкшие'

  return (
    <>
      <div className="mb-8">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Дисциплинарный реестр
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Уличные группировки (ЧС Гетто)</h1>
        <p className="text-slate-400 text-sm mt-1">
          Реестр заблокированных участников в сферах уличных банд и капт-составов
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl w-full">
          <span className="text-slate-400">{IC.search}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по никнейму или старому нику..."
            className="bg-transparent outline-none w-full text-xs text-slate-200 placeholder-slate-500 font-medium"
          />
        </div>

        <div className="relative z-20 shrink-0">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              {IC.filter}
              <span>{filterLabel}</span>
            </div>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden bg-[#0d1120] border border-white/10 shadow-2xl z-50 p-1">
              {[
                { id: 'ALL', label: 'Все статусы' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные / Снятые' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    filter === f.id ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            {IC.spin}
            <span className="text-xs font-bold tracking-wider uppercase">Синхронизация данных...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            Записи не найдены
          </div>
        ) : (
          pageItems.map((p) => {
            const status = getGhettoStatus(p)

            const accentColor =
              status === 'lifted'
                ? '56,189,248'
                : status === 'expired'
                ? '34,197,94'
                : '248,113,113'

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : p.permanent
                ? 'Навсегда'
                : 'Активен'

            return (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-all duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accentColor})` }} />

                <div className="pl-5 pr-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate">{p.nickname}</h3>
                      {p.oldNickname && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                          Пред. ник: {p.oldNickname}
                        </p>
                      )}
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accentColor})` }} />
                      {badgeLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300 border-l-2 border-white/10 pl-3 italic">
                    {p.reason || 'Причина не указана'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Действует до</div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {p.permanent ? 'Бессрочно' : p.endDate || p.untilRaw || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <ContactLink label="VK" value={p.vk} />
                    <div className="text-[11px] text-slate-500">
                      Внёс: <span className="text-slate-300 font-semibold">{p.admin || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-[36px] h-9 px-3 rounded-xl border text-xs font-bold transition ${
                page === currentPage
                  ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── ТАБЛИЦА ЧС БАЙКЕРОВ ───────── */
function ChsBikersTable({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CHSBIKERS_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()
      const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
      if (lines.length === 0) {
        setEntries([])
        return
      }

      const parsed = lines
        .slice(3)
        .map((line, idx) => {
          const r = parseCSVLine(line)
          return {
            id: `bikers-${idx}`,
            nickname: clean(r[0]),
            vk: clean(r[1]),
            level: clean(r[2]),
            dateAdded: clean(r[3]),
            endDate: clean(r[4]),
            reason: clean(r[6]),
            admin: clean(r[7]),
          }
        })
        .filter((x) => x.nickname && !x.nickname.toLowerCase().includes('ник'))

      setEntries(parsed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return entries.filter((p) => {
      const matchSearch = p.nickname?.toLowerCase().includes(s)
      const status = getBikerStatus(p)
      const statusOk =
        filter === 'ALL' ? true : filter === 'ACTIVE' ? status === 'active' : status !== 'active'
      return matchSearch && statusOk
    })
  }, [entries, search, filter])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(pageNumber, 1), totalPages)
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (page === 1 || page === totalPages) return true
    return page >= currentPage - 1 && page <= currentPage + 1
  })

  useEffect(() => {
    if (pageNumber !== currentPage) setPageNumber(currentPage)
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel = filter === 'ALL' ? 'Все статусы' : filter === 'ACTIVE' ? 'Активные' : 'Снятые / Истёкшие'

  return (
    <>
      <div className="mb-8">
        <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-1">
          Дисциплинарный реестр
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Байкерские клубы (ЧС Байкеров)</h1>
        <p className="text-slate-400 text-sm mt-1">
          Запрет на вступление и участие в структурах мотоклубов сервера
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl w-full">
          <span className="text-slate-400">{IC.search}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по никнейму..."
            className="bg-transparent outline-none w-full text-xs text-slate-200 placeholder-slate-500 font-medium"
          />
        </div>

        <div className="relative z-20 shrink-0">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              {IC.filter}
              <span>{filterLabel}</span>
            </div>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden bg-[#0d1120] border border-white/10 shadow-2xl z-50 p-1">
              {[
                { id: 'ALL', label: 'Все статусы' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные / Снятые' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    filter === f.id ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            {IC.spin}
            <span className="text-xs font-bold tracking-wider uppercase">Синхронизация данных...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            Записи не найдены
          </div>
        ) : (
          pageItems.map((p) => {
            const level = getBikerLevel(p.level)
            const status = getBikerStatus(p)

            const accentColor =
              status === 'lifted' ? '56,189,248' : level?.color || '248,113,113'

            const badgeLabel = status === 'lifted' ? 'Снят' : level?.label || p.level || 'Активен'

            return (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-all duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accentColor})` }} />

                <div className="pl-5 pr-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-black text-white truncate">{p.nickname}</h3>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accentColor})` }} />
                      {badgeLabel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300 border-l-2 border-white/10 pl-3 italic">
                    {p.reason || 'Причина не указана'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Внесён</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.dateAdded || '—'}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Вынесен</div>
                      <div className="text-slate-200 font-medium mt-0.5">{p.endDate || '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <ContactLink label="VK" value={p.vk} />
                    <div className="text-[11px] text-slate-500">
                      Внёс: <span className="text-slate-300 font-semibold">{p.admin || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-[36px] h-9 px-3 rounded-xl border text-xs font-bold transition ${
                page === currentPage
                  ? 'border-orange-500/50 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── ОСНОВНОЙ ЭКСПОРТ ───────── */
export default function ChsGos({ user, pageNumber = 1, setPageNumber = () => {} }) {
  const [sphere, setSphere] = useState('gov')

  const direction = getLeadershipDirection(user)
  const isBoLeadership = (isChief(user) || isDeputy(user)) && direction === 'bo'
  const isMafiaLeadership = (isChief(user) || isDeputy(user)) && direction === 'mafia'
  const isGhettoLeadership = (isChief(user) || isDeputy(user)) && direction === 'ghetto'
  const isBikersLeadership = (isChief(user) || isDeputy(user)) && direction === 'bikers'
  const isRadioLeader = isLeaderOfFaction(user, 'radio24')

  if (isBoLeadership || isRadioLeader) {
    return (
      <PageChrome>
        <DocsLinkCard sphereLabel="Бизнес организации (БО)" url={CHSBO_DOCS_URL} />
      </PageChrome>
    )
  }

  if (isMafiaLeadership) {
    return (
      <PageChrome>
        <ChsMafiaTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
      </PageChrome>
    )
  }

  if (isGhettoLeadership) {
    return (
      <PageChrome>
        <ChsGhettoTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
      </PageChrome>
    )
  }

  if (isBikersLeadership) {
    return (
      <PageChrome>
        <ChsBikersTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
      </PageChrome>
    )
  }

  if (isPlayer(user)) {
    const activeSphere = SPHERES.find((s) => s.id === sphere) || SPHERES[0]

    return (
      <PageChrome>
        {/* Фильтр сфер в точном стиле Dashboard */}
        <div className="flex flex-col gap-2 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35">
            Сфера фракций
          </span>
          <div className="flex flex-wrap gap-2">
            {SPHERES.map((s) => {
              const active = sphere === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSphere(s.id)}
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

        {activeSphere.id === 'gov' && (
          <ChsGosTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
        )}
        {activeSphere.id === 'bo' && (
          <DocsLinkCard sphereLabel="Бизнес организации (БО)" url={CHSBO_DOCS_URL} />
        )}
        {activeSphere.id === 'mafia' && (
          <ChsMafiaTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
        )}
        {activeSphere.id === 'ghetto' && (
          <ChsGhettoTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
        )}
        {activeSphere.id === 'bikers' && (
          <ChsBikersTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
        )}
        {!activeSphere.hasSource && <InDevelopmentCard sphereLabel={activeSphere.label} />}
      </PageChrome>
    )
  }

  return (
    <PageChrome>
      <ChsGosTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
    </PageChrome>
  )
}