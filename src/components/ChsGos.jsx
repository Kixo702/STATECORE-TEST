import { useEffect, useMemo, useState } from 'react'
import banner from '../assets/banner.png'

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

/* ───────── MAIN ───────── */
export default function ChsGos({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])

  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

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
  }, [search, filter, setPageNumber])

  const filterLabel =
    filter === 'ALL'
      ? 'Все'
      : filter === 'ACTIVE'
      ? 'Активные'
      : 'Неактивные'

  return (
    <>
      {/* BACKGROUND */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(168,85,247,.25), transparent 40%),' +
            'radial-gradient(circle at 80% 60%, rgba(239,68,68,.25), transparent 45%)',
        }}
      />

      {/* MAIN WRAPPER */}
      <div className="min-h-screen bg-[#0b0f17] text-white relative">
        {/* BANNER HEADER */}
        <div className="w-full bg-[#0b0f19] pt-4 pb-2 border-b border-white/5">
          <div className="px-8">
            <div className="relative w-full max-h-[140px] overflow-hidden rounded-2xl">
              <img
                src={banner}
                alt="banner"
                className="w-full object-contain block"
              />

              <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0b0f19] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 sm:p-6 md:p-10 relative z-10">
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
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loading ? (
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
        </div>
      </div>
    </>
  )
}