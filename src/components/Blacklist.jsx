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

const parseDate = (d) => {
  if (!d) return null
  const [day, month, year] = d.split('.')
  if (!day || !month || !year) return null
  return new Date(`${year}-${month}-${day}`)
}

const isExpired = (endDate) => {
  const d = parseDate(endDate)
  return d ? d < new Date() : false
}

/* ───────── MAIN ───────── */
export default function Blacklist({ pageNumber = 1, setPageNumber = () => {} }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [blacklist, setBlacklist] = useState([])

  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const BLACKLIST_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vScK5HNQA_dCCQcgADjGHhxAmDJQo3rcIHtoFWPNTyhQWJvoEO-uzPVfYFRnEOjtJqcIVovmSzFaNRp/pub?gid=1376095683&single=true&output=csv'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch(`${BLACKLIST_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()

      const rows = csv.split('\n').map((r) =>
        r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      )

      const parsed = rows
        .slice(1)
        .map((r) => ({
          id: clean(r[0]),
          nickname: clean(r[1]),
          decisionDate: clean(r[2]),
          startDate: clean(r[3]),
          endDate: clean(r[4]),
          reason: clean(r[5]),
          days: clean(r[6]),
          admin: clean(r[7]),
          proofs: clean(r[8]),
          status: clean(r[9]),
          passport: clean(r[10]),
        }))
        .filter((x) => x.nickname)

      setBlacklist(parsed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase()

    return blacklist.filter((p) => {
      const matchSearch = p.nickname?.toLowerCase().includes(s)

      const statusOk =
        filter === 'ALL'
          ? true
          : filter === 'ACTIVE'
          ? !isExpired(p.endDate)
          : isExpired(p.endDate)

      return matchSearch && statusOk
    })
  }, [blacklist, search, filter])

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
      : 'Истёкшие'

  return (
    <>
      {/* BACKGROUND */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(255,80,80,.25), transparent 40%),' +
            'radial-gradient(circle at 80% 60%, rgba(80,120,255,.25), transparent 45%)',
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
              Запреты на вступление в гос.организации
            </h1>
            <p className="text-gray-400 mt-1">
              Система запретов на вступление
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
                    { id: 'EXPIRED', label: 'Истёкшие' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFilter(f.id)
                        setFilterOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition ${
                        filter === f.id
                          ? 'bg-gradient-to-r from-orange-500/20 to-transparent border-l-2 border-orange-500'
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
                const expired = isExpired(p.endDate)

                return (
                  <div
                    key={p.id}
                    className="group relative rounded-2xl border overflow-hidden transition duration-300 hover:scale-[1.02]"
                    style={{
                      borderColor: expired
                        ? 'rgba(34,197,94,.2)'
                        : 'rgba(239,68,68,.2)',
                      background: '#0b0f17',
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: expired
                          ? 'radial-gradient(circle at 20% 20%, rgba(34,197,94,.25), transparent 55%)'
                          : 'radial-gradient(circle at 20% 20%, rgba(239,68,68,.25), transparent 55%)',
                      }}
                    />

                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-30 transition duration-500"
                      style={{
                        background: expired
                          ? 'linear-gradient(120deg, transparent, rgba(34,197,94,.35), transparent)'
                          : 'linear-gradient(120deg, transparent, rgba(239,68,68,.35), transparent)',
                        animation: 'moveGlow 3s linear infinite',
                      }}
                    />

                    <div className="relative p-5">
                      <div className="flex justify-between">
                        <h3 className="text-xl font-black">{p.nickname}</h3>

                        <span
                          className={`text-xs px-3 py-1 rounded-xl border font-bold ${
                            expired
                              ? 'text-green-300 border-green-500/30 bg-green-500/10'
                              : 'text-red-300 border-red-500/30 bg-red-500/10'
                          }`}
                        >
                          {expired ? 'ИСТЁК' : 'АКТИВЕН'}
                        </span>
                      </div>

                      <p className="mt-2 text-gray-300 text-sm">{p.reason}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                          <div className="text-gray-400">Начало</div>
                          <div className="font-semibold">{p.startDate}</div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                          <div className="text-gray-400">Конец</div>
                          <div className="font-semibold">{p.endDate}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-gray-400">Занёс:</span>
                        <span className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                          {p.admin}
                        </span>
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
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-200'
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

          <style>{`
            @keyframes moveGlow {
              0% { transform: translateX(-60%); }
              100% { transform: translateX(60%); }
            }
          `}</style>
        </div>
      </div>
    </>
  )
}