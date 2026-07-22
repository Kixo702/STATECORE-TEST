import { useEffect, useMemo, useState } from 'react'
import banner from '../assets/banner.png'
import {
  isLeaderOfFaction,
  getLeadershipDirection,
  isChief,
  isDeputy,
  SERVERS,
} from '../lib/roles'

/* ───────── ICONS ───────── */
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 21l-4-4m1-5a7 7 0 11-14 0 7 7 0 0114 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 6h16M7 12h10M10 18h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M6 2h9l5 5v15H6V2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconWrench = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M14.7 6.3a4 4 0 10-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/* ───────── HELPERS ───────── */
const clean = (v) => v?.replace(/"/g, '').trim() || ''

// Корректный построчный парсер CSV (учитывает запятые внутри кавычек)
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

// "Срок" может быть числом дней либо "Навсегда" — тогда запись не имеет даты окончания
const isPermanent = (term) => (term || '').toLowerCase().includes('навсегда')

// Запись считается снятой, если в примечании есть отметка об апелляции/выводе из ЧС
const LIFTED_RE = /вынесен|снят(а|о)?\s*(с|из)?\s*(чс|blacklist)|обжалован/i
const isLifted = (note) => LIFTED_RE.test(note || '')

const isDateExpired = (term, endDate) => {
  if (isPermanent(term)) return false
  const d = parseDate(endDate)
  return d ? d < new Date() : false
}

// Единый статус записи:
// 'lifted'  — снята по апелляции (видно из примечания)
// 'expired' — истёк срок (актуально только для не-"Навсегда" записей с датой)
// 'active'  — действует (в т.ч. все "Навсегда"-записи без отметки о снятии)
const getStatus = (p) => {
  if (isLifted(p.note)) return 'lifted'
  if (isDateExpired(p.term, p.endDate)) return 'expired'
  return 'active'
}

// Ссылка на документ ЧС БО — там список ведётся вручную в Google Docs,
// отдельной таблицы (как у ЧС гос) для этого направления пока нет
const CHSBO_DOCS_URL =
  'https://docs.google.com/document/d/1qVCFsoORgJY7y1q23te6ZGWoqlkiQDfHeA3xnYeTq3A/edit?tab=t.0'

// Таблица ЧС мафий — исходная ссылка дана в виде pubhtml, для CSV-экспорта
// меняем /pubhtml на /pub и добавляем output=csv (как и для BLACKLIST_URL в Sidebar)
const CHSMAFIA_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1491874856&single=true&output=csv'

// Степени ЧС мафий: цвет, подпись и срок в днях (null — навсегда)
const MAFIA_LEVELS = [
  { key: 'red', match: /красн/i, label: 'Красная степень', days: null, color: '239,68,68' },
  { key: 'yellow', match: /жел|жёл/i, label: 'Жёлтая степень', days: 90, color: '234,179,8' },
  { key: 'blue', match: /син/i, label: 'Синяя степень', days: 365, color: '59,130,246' },
]

const getMafiaLevel = (term) => {
  const t = (term || '').toLowerCase()
  return MAFIA_LEVELS.find((l) => l.match.test(t)) || null
}

// Статус записи ЧС мафий:
// 'lifted'  — есть отметка об амнистии либо заполнена "Дата вынесения"
// 'expired' — истёк срок степени (для Жёлтой/Синей), а "Дата вынесения" не проставлена
// 'active'  — действует (в т.ч. Красная степень, которая всегда навсегда)
const getMafiaStatus = (p) => {
  if (clean(p.amnesty)) return 'lifted'

  const end = parseDate(p.endDate)
  if (end) {
    // "Дата вынесения" уже наступила — ЧС реально снят.
    // Если дата в будущем, это плановая дата окончания степени, а не снятие.
    return end <= new Date() ? 'lifted' : 'active'
  }

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

// Ожидаемая дата окончания степени, если "Дата вынесения" ещё не проставлена
const mafiaExpectedEnd = (p, level) => {
  if (!level || !level.days) return null
  const added = parseDate(p.dateAdded)
  if (!added) return null
  const expiry = new Date(added)
  expiry.setDate(expiry.getDate() + level.days)
  return expiry.toLocaleDateString('ru-RU')
}

// Таблица ЧС Гетто — тот же документ, что и ЧС мафий, но другой лист (gid)
const CHSGHETTO_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1797494060&single=true&output=csv'

// В нике иногда встречается формат "СтарыйНик I НовыйНик" — второй ник
// актуальный, первый — старый (до смены). Разделитель — " I " (заглавная I).
const parseGhettoNickname = (raw) => {
  const v = (raw || '').trim()
  const parts = v.split(/\s+I\s+/)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { nickname: parts[1].trim(), oldNickname: parts[0].trim() }
  }
  return { nickname: v, oldNickname: null }
}

// Колонка "в чёрном списке до:" — либо дата (ДД.ММ.ГГГГ), либо "навсегда"
const parseGhettoUntil = (raw) => {
  const v = (raw || '').trim()
  if (!v) return { permanent: false, endDate: null, raw: v }
  if (/навсегда/i.test(v)) return { permanent: true, endDate: null, raw: v }
  const m = v.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/)
  return { permanent: false, endDate: m ? m[1] : null, raw: v }
}

// Колонка "снят ли ЧС или нет" — заполняется не всегда. Пусто/"нет"/"-" —
// ЧС не снят, любое другое значение (например "да", "снят") — снят.
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

// Таблица ЧС Байкеров — тот же документ, ещё один лист (gid)
const CHSBIKERS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1VeCFjnEockkuf3EFBZPnVAOfWqe8NjadnUv-2XyF2z12R_EwzPXzhr91nYK0pbcTYSTfAvkJp6co/pub?gid=1668268846&single=true&output=csv'

// Уровни ЧС Байкеров: цвет и подпись (в отличие от мафий — без фиксированного срока в днях)
const BIKER_LEVELS = [
  { key: 'high', match: /высок/i, label: 'Высокий уровень', color: '239,68,68' },
  { key: 'medium', match: /средн/i, label: 'Средний уровень', color: '234,179,8' },
]

const getBikerLevel = (level) => {
  const t = (level || '').toLowerCase()
  return BIKER_LEVELS.find((l) => l.match.test(t)) || null
}

// Статус записи ЧС Байкеров:
// 'lifted' — "Дата вынесения" проставлена и уже наступила (ЧС реально снят)
// 'active' — дата вынесения не наступила либо не проставлена вовсе
const getBikerStatus = (p) => {
  const end = parseDate(p.endDate)
  if (end) {
    return end <= new Date() ? 'lifted' : 'active'
  }
  return 'active'
}

// Сферы ЧС, доступные игроку через фильтр. hasSource=true — уже подключён
// реальный источник (таблица или документ), иначе показывается "в разработке"
const SPHERES = [
  { id: 'gov', label: 'Гос.', hasSource: true },
  { id: 'bo', label: 'БО', hasSource: true },
  { id: 'mafia', label: 'Мафия', hasSource: true },
  { id: 'ghetto', label: 'Гетто', hasSource: true },
  { id: 'bikers', label: 'Байкеры', hasSource: true },
]

/* ───────── Общий каркас страницы (фон + баннер) ───────── */
function PageChrome({ children }) {
  return (
    <>
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(168,85,247,.25), transparent 40%),' +
            'radial-gradient(circle at 80% 60%, rgba(239,68,68,.25), transparent 45%)',
        }}
      />

      <div className="min-h-screen bg-[#0b0f17] text-white relative">
        <div className="w-full bg-[#0b0f19] pt-4 pb-2 border-b border-white/5">
          <div className="px-8">
            <div className="relative w-full max-h-[140px] overflow-hidden rounded-2xl">
              <img src={banner} alt="banner" className="w-full object-contain block" />
              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0b0f19] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-10 relative z-10">{children}</div>
      </div>
    </>
  )
}

/* ───────── Заглушка "в разработке" для сфер без подключённого источника ───────── */
function InDevelopmentCard({ sphereLabel }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-black">Чёрный список · {sphereLabel}</h1>
      <p className="text-gray-400 mt-1">Раздел для этой сферы пока не подключён</p>

      <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.015] p-10 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
          <IconWrench />
        </div>
        <div className="text-gray-300 font-semibold">В разработке</div>
        <p className="text-gray-500 text-sm max-w-sm">
          Таблица или документ ЧС для этого направления ещё не подключены. Загляните позже.
        </p>
      </div>
    </div>
  )
}

/* ───────── Карточка со ссылкой на ЧС, который ведётся в документе (сейчас — БО) ───────── */
function DocsLinkCard({ sphereLabel, url }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-black">Чёрный список · {sphereLabel}</h1>
      <p className="text-gray-400 mt-1">Ведётся в документе — отдельной таблицы для этой сферы пока нет</p>

      <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.015] p-10 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
          <IconDoc />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/30 text-purple-200 font-semibold hover:bg-purple-500/25 transition"
        >
          Открыть документ ЧС ↗
        </a>
      </div>
    </div>
  )
}

/* ───────── Таблица ЧС гос — прежняя логика, вынесена в отдельный компонент ───────── */
function ChsGosTable({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])

  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const [serverFilterOpen, setServerFilterOpen] = useState(false)
  const [serverFilter, setServerFilter] = useState('texas')

  // Таблица ЧС гос — экспорт конкретного листа (gid) в CSV через gviz
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
        .slice(1) // пропускаем заголовок
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
        filter === 'ALL'
          ? true
          : filter === 'ACTIVE'
          ? status === 'active'
          : status !== 'active' // INACTIVE: снят или истёк

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
    if (pageNumber !== currentPage) {
      setPageNumber(currentPage)
    }
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, serverFilter, setPageNumber])

  const filterLabel =
    filter === 'ALL'
      ? 'Все'
      : filter === 'ACTIVE'
      ? 'Активные'
      : 'Неактивные'

  const activeServer = SERVERS.find((s) => s.id === serverFilter) || SERVERS[0]
  // Таблица ЧС гос сейчас ведётся только для Техаса — для остальных
  // серверов данных пока нет, показываем заглушку "в разработке"
  const serverHasData = serverFilter === 'texas'

  return (
    <>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black">
          Чёрный список гос. игроков (ЧС гос)
        </h1>
        <p className="text-gray-400 mt-1">
          Запрет на вступление во все государственные фракции сервера
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="bg-transparent outline-none w-full"
          />
        </div>

        <div className="relative z-20">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <IconFilter />
            {filterLabel}
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl z-50">
              {[
                { id: 'ALL', label: 'Все' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition ${
                    filter === f.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-2 border-purple-500'
                      : ''
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-20">
          <button
            onClick={() => setServerFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <IconFilter />
            {activeServer.label}
          </button>

          {serverFilterOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl z-50">
              {SERVERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServerFilter(s.id)
                    setServerFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition flex items-center justify-between gap-2 ${
                    serverFilter === s.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-2 border-purple-500'
                      : ''
                  }`}
                >
                  <span>{s.label}</span>
                  {s.id !== 'texas' && (
                    <span className="text-[10px] text-gray-500">в разработке</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {!serverHasData ? (
          <div className="col-span-full rounded-xl border border-white/[0.08] bg-white/[0.015] p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
              <IconWrench />
            </div>
            <div className="text-gray-300 font-semibold">В разработке</div>
            <p className="text-gray-500 text-sm max-w-sm">
              ЧС гос для сервера «{activeServer.label}» пока не подключён. Загляните позже.
            </p>
          </div>
        ) : loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">Ничего не найдено</div>
        ) : (
          pageItems.map((p) => {
            const permanent = isPermanent(p.term)
            const status = getStatus(p) // 'active' | 'lifted' | 'expired'

            const accentColor =
              status === 'lifted'
                ? '96,165,250' // синий — снят по апелляции
                : status === 'expired'
                ? '34,197,94' // зелёный — истёк по сроку
                : '239,68,68' // красный — активен (в т.ч. навсегда)

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : permanent
                ? 'Навсегда'
                : 'Активен'

            const hasLinks = (p.vk && p.vk !== '-') || (p.forum && p.forum !== '-')

            return (
              <div
                key={p.id}
                className="group relative rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 overflow-hidden"
              >
                {/* Тонкая статусная полоса слева */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: `rgb(${accentColor})` }}
                />

                <div className="pl-[22px] pr-5 py-5">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-white truncate">
                        {p.nickname}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono tracking-tight">
                        ID {p.id || '—'}
                      </p>
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `rgb(${accentColor})` }}
                      />
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Причина */}
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300 border-l-2 border-white/[0.08] pl-3">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {p.note && (
                    <p className="mt-1.5 text-[12px] text-gray-500 italic pl-3">
                      {p.note}
                    </p>
                  )}

                  {/* Данные */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
                    <div>
                      <div className="text-gray-500">Внесён</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.dateAdded || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500">Срок</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.term || '—'}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-gray-500">Окончание</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {permanent ? 'N/A · бессрочно' : p.endDate || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Подвал: ссылки + автор */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      {p.vk && p.vk !== '-' && (
                        <a
                          href={p.vk.startsWith('http') ? p.vk : `https://${p.vk}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-gray-500 hover:text-blue-300 transition-colors"
                        >
                          VK ↗
                        </a>
                      )}
                      {p.forum && p.forum !== '-' && (
                        <a
                          href={p.forum.startsWith('http') ? p.forum : `https://${p.forum}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-gray-500 hover:text-orange-300 transition-colors"
                        >
                          Форум ↗
                        </a>
                      )}
                      {!hasLinks && (
                        <span className="text-[11px] text-gray-600">Нет ссылок</span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Внёс: <span className="text-gray-300 font-medium">{p.admin || '—'}</span>
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
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition ${
                page === currentPage
                  ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── Таблица ЧС мафий ─────────
   Раскладка колонок отличается от ЧС гос: данные с 8-й строки,
   C — ник, D — амнистия, E — ВК, F — степень, G — дата внесения,
   H — дата вынесения, I — причина, J — ник внёсшего.
*/
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
        .slice(7) // данные начинаются с 8-й строки
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
        filter === 'ALL'
          ? true
          : filter === 'ACTIVE'
          ? status === 'active'
          : status !== 'active' // INACTIVE: снят или истёк

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
    if (pageNumber !== currentPage) {
      setPageNumber(currentPage)
    }
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel =
    filter === 'ALL'
      ? 'Все'
      : filter === 'ACTIVE'
      ? 'Активные'
      : 'Неактивные'

  return (
    <>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black">
          Чёрный список мафий (ЧС мафий)
        </h1>
        <p className="text-gray-400 mt-1">
          Запрет на вступление во фракции мафий сервера
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="bg-transparent outline-none w-full"
          />
        </div>

        <div className="relative z-20">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <IconFilter />
            {filterLabel}
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl z-50">
              {[
                { id: 'ALL', label: 'Все' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition ${
                    filter === f.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-2 border-purple-500'
                      : ''
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">Ничего не найдено</div>
        ) : (
          pageItems.map((p) => {
            const level = getMafiaLevel(p.term)
            const status = getMafiaStatus(p) // 'active' | 'lifted' | 'expired'

            const accentColor =
              status === 'lifted'
                ? '96,165,250' // синий — снят (амнистия/дата вынесения)
                : status === 'expired'
                ? '34,197,94' // зелёный — истёк по сроку степени
                : level?.color || '239,68,68'

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : level?.label || p.term || 'Активен'

            const hasLinks = p.vk && p.vk !== '-'
            const expectedEnd = mafiaExpectedEnd(p, level)

            return (
              <div
                key={p.id}
                className="group relative rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 overflow-hidden"
              >
                {/* Тонкая статусная полоса слева */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: `rgb(${accentColor})` }}
                />

                <div className="pl-[22px] pr-5 py-5">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-white truncate">
                        {p.nickname}
                      </h3>
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `rgb(${accentColor})` }}
                      />
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Причина */}
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300 border-l-2 border-white/[0.08] pl-3">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {p.amnesty && (
                    <p className="mt-1.5 text-[12px] text-gray-500 italic pl-3">
                      Амнистия: {p.amnesty}
                    </p>
                  )}

                  {/* Данные */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
                    <div>
                      <div className="text-gray-500">Внесён</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.dateAdded || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500">Степень</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.term || '—'}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-gray-500">Вынесен</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.endDate || (level && !level.days ? 'Бессрочно' : expectedEnd || '—')}
                      </div>
                    </div>
                  </div>

                  {/* Подвал: ссылки + автор */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      {p.vk && p.vk !== '-' && (
                        <a
                          href={p.vk.startsWith('http') ? p.vk : `https://${p.vk}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-gray-500 hover:text-blue-300 transition-colors"
                        >
                          VK ↗
                        </a>
                      )}
                      {!hasLinks && (
                        <span className="text-[11px] text-gray-600">Нет ссылок</span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Внёс: <span className="text-gray-300 font-medium">{p.admin || '—'}</span>
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
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition ${
                page === currentPage
                  ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── Таблица ЧС Гетто ─────────
   Раскладка колонок отличается от ЧС гос/мафий: данные с 3-й строки,
   A — ник (возможен формат "СтарыйНик I НовыйНик"), B — ВК, C — в ЧС до
   (дата либо "навсегда"), D — причина, E — кто внёс, F — снят ли ЧС.
*/
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
        .slice(2) // данные начинаются с 3-й строки
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
        filter === 'ALL'
          ? true
          : filter === 'ACTIVE'
          ? status === 'active'
          : status !== 'active' // INACTIVE: снят или истёк

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
    if (pageNumber !== currentPage) {
      setPageNumber(currentPage)
    }
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel =
    filter === 'ALL'
      ? 'Все'
      : filter === 'ACTIVE'
      ? 'Активные'
      : 'Неактивные'

  return (
    <>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black">
          Чёрный список Гетто (ЧС Гетто)
        </h1>
        <p className="text-gray-400 mt-1">
          Запрет на вступление во фракции Гетто сервера
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="bg-transparent outline-none w-full"
          />
        </div>

        <div className="relative z-20">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <IconFilter />
            {filterLabel}
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl z-50">
              {[
                { id: 'ALL', label: 'Все' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition ${
                    filter === f.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-2 border-purple-500'
                      : ''
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">Ничего не найдено</div>
        ) : (
          pageItems.map((p) => {
            const status = getGhettoStatus(p) // 'active' | 'lifted' | 'expired'

            const accentColor =
              status === 'lifted'
                ? '96,165,250' // синий — снят
                : status === 'expired'
                ? '34,197,94' // зелёный — истёк по сроку
                : '239,68,68' // красный — активен (в т.ч. навсегда)

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : status === 'expired'
                ? 'Истёк'
                : p.permanent
                ? 'Навсегда'
                : 'Активен'

            const hasLinks = p.vk && p.vk !== '-'

            return (
              <div
                key={p.id}
                className="group relative rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 overflow-hidden"
              >
                {/* Тонкая статусная полоса слева */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: `rgb(${accentColor})` }}
                />

                <div className="pl-[22px] pr-5 py-5">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-white truncate">
                        {p.nickname}
                      </h3>
                      {p.oldNickname && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          Старый ник: {p.oldNickname}
                        </p>
                      )}
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `rgb(${accentColor})` }}
                      />
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Причина */}
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300 border-l-2 border-white/[0.08] pl-3">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {/* Данные */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
                    <div className="col-span-2">
                      <div className="text-gray-500">В ЧС до</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.permanent ? 'Навсегда' : p.endDate || p.untilRaw || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Подвал: ссылки + автор */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      {p.vk && p.vk !== '-' && (
                        <a
                          href={p.vk.startsWith('http') ? p.vk : `https://${p.vk}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-gray-500 hover:text-blue-300 transition-colors"
                        >
                          VK ↗
                        </a>
                      )}
                      {!hasLinks && (
                        <span className="text-[11px] text-gray-600">Нет ссылок</span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Внёс: <span className="text-gray-300 font-medium">{p.admin || '—'}</span>
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
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition ${
                page === currentPage
                  ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── Таблица ЧС Байкеров ─────────
   Раскладка колонок: данные с 4-й строки, A — ник, B — ВК, C — уровень ЧС
   (высокий/средний), D — дата внесения, E — дата вынесения,
   F — "Столбец 1" (служебный/не используется), G — причина, H — кем внесён.
*/
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
        .slice(3) // данные начинаются с 4-й строки
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
        filter === 'ALL'
          ? true
          : filter === 'ACTIVE'
          ? status === 'active'
          : status !== 'active' // INACTIVE: снят

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
    if (pageNumber !== currentPage) {
      setPageNumber(currentPage)
    }
  }, [pageNumber, currentPage, setPageNumber])

  useEffect(() => {
    setPageNumber(1)
  }, [search, filter, setPageNumber])

  const filterLabel =
    filter === 'ALL'
      ? 'Все'
      : filter === 'ACTIVE'
      ? 'Активные'
      : 'Неактивные'

  return (
    <>
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black">
          Чёрный список Байкеров (ЧС Байкеров)
        </h1>
        <p className="text-gray-400 mt-1">
          Запрет на вступление во фракции байкеров сервера
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="bg-transparent outline-none w-full"
          />
        </div>

        <div className="relative z-20">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <IconFilter />
            {filterLabel}
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl z-50">
              {[
                { id: 'ALL', label: 'Все' },
                { id: 'ACTIVE', label: 'Активные' },
                { id: 'INACTIVE', label: 'Неактивные' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition ${
                    filter === f.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-2 border-purple-500'
                      : ''
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">Ничего не найдено</div>
        ) : (
          pageItems.map((p) => {
            const level = getBikerLevel(p.level)
            const status = getBikerStatus(p) // 'active' | 'lifted'

            const accentColor =
              status === 'lifted'
                ? '96,165,250' // синий — снят
                : level?.color || '239,68,68'

            const badgeLabel =
              status === 'lifted'
                ? 'Снят'
                : level?.label || p.level || 'Активен'

            const hasLinks = p.vk && p.vk !== '-'

            return (
              <div
                key={p.id}
                className="group relative rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200 overflow-hidden"
              >
                {/* Тонкая статусная полоса слева */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: `rgb(${accentColor})` }}
                />

                <div className="pl-[22px] pr-5 py-5">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-white truncate">
                        {p.nickname}
                      </h3>
                    </div>

                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        color: `rgb(${accentColor})`,
                        background: `rgba(${accentColor},.12)`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `rgb(${accentColor})` }}
                      />
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Причина */}
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-300 border-l-2 border-white/[0.08] pl-3">
                    {p.reason || 'Причина не указана'}
                  </p>

                  {/* Данные */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
                    <div>
                      <div className="text-gray-500">Внесён</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.dateAdded || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500">Вынесен</div>
                      <div className="text-gray-200 font-medium mt-0.5">
                        {p.endDate || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Подвал: ссылки + автор */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      {p.vk && p.vk !== '-' && (
                        <a
                          href={p.vk.startsWith('http') ? p.vk : `https://${p.vk}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-gray-500 hover:text-blue-300 transition-colors"
                        >
                          VK ↗
                        </a>
                      )}
                      {!hasLinks && (
                        <span className="text-[11px] text-gray-600">Нет ссылок</span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Внёс: <span className="text-gray-300 font-medium">{p.admin || '—'}</span>
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
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            ←
          </button>

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition ${
                page === currentPage
                  ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                  : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setPageNumber(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition"
          >
            →
          </button>
        </div>
      )}
    </>
  )
}

/* ───────── ГЛАВНЫЙ ЭКСПОРТ ─────────
   Содержимое страницы зависит от роли пользователя:
   - ГС/ЗГС БО и лидер Radio24            → только ссылка на документ ЧС БО
   - ГС/ЗГС мафий                          → полная таблица ЧС мафий
   - ГС/ЗГС Гетто                          → полная таблица ЧС Гетто
   - ГС/ЗГС Байкеров                       → полная таблица ЧС Байкеров
   - Все остальные (Игрок, ГС/ЗГС Гос.,
     полный доступ, следящие, прочие
     лидеры)                               → фильтр по сферам
     (Гос/БО/Мафия/Гетто/Байкеры работают), виден всем одинаково
*/
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
        <DocsLinkCard sphereLabel="БО" url={CHSBO_DOCS_URL} />
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

  const activeSphere = SPHERES.find((s) => s.id === sphere) || SPHERES[0]

  return (
    <PageChrome>
      <div className="mb-6 flex flex-wrap gap-2">
        {SPHERES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSphere(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              sphere === s.id
                ? 'bg-gradient-to-r from-purple-500/25 to-purple-600/10 border-purple-500/40 text-purple-100'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSphere.id === 'gov' && (
        <ChsGosTable pageNumber={pageNumber} setPageNumber={setPageNumber} />
      )}
      {activeSphere.id === 'bo' && (
        <DocsLinkCard sphereLabel="БО" url={CHSBO_DOCS_URL} />
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
      {!activeSphere.hasSource && (
        <InDevelopmentCard sphereLabel={activeSphere.label} />
      )}
    </PageChrome>
  )
}