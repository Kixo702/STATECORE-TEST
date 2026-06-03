import { useEffect, useMemo, useState } from 'react'

export default function Logs() {

  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Подставь сюда свою таблицу/лист логов при необходимости
  const LOGS_URL =
    'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/gviz/tq?tqx=out:csv&sheet=Logs'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${LOGS_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()

      const rows = csv.split('\n').map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
      if (rows.length === 0) {
        setLogs([])
        return
      }

      const headers = rows[0].map((h) => (h || '').replace(/"/g, '').trim().toLowerCase())

      const parsed = rows.slice(1).map((r) => {
        const obj = {}
        r.forEach((c, i) => {
          obj[headers[i] || `col${i}`] = (c || '').replace(/"/g, '').trim()
        })
        return obj
      }).filter((x) => Object.keys(x).length > 0)

      // Нормализуем поля к ожидаемым
      const normalized = parsed.map((p) => ({
        type: (p.type || p.action_type || p['action type'] || '').toLowerCase(),
        admin: p.admin || p.administrator || p['performed by'] || p.user || '',
        action: p.action || p.event || p.description || '',
        target: p.target || p.entity || p.subject || '',
        date: p.date || p.datetime || p.time || p.timestamp || '',
      }))

      setLogs(normalized)
    } catch (e) {
      console.error(e)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    const s = search.toLowerCase()
    return logs.filter((log) => (log.target || '').toLowerCase().includes(s) || (log.action || '').toLowerCase().includes(s) || (log.admin || '').toLowerCase().includes(s))
  }, [logs, search])

  const stats = useMemo(() => {
    const total = logs.length
    const byType = logs.reduce((acc, l) => {
      const t = l.type || 'other'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    return { total, byType }
  }, [logs])

  const getTypeColor = (type) => {

    switch(type) {

      case 'warn':
        return 'border-red-500/20 bg-red-500/10'

      case 'leader':
        return 'border-emerald-500/20 bg-emerald-500/10'

      case 'blacklist':
        return 'border-orange-500/20 bg-orange-500/10'

      case 'remove':
        return 'border-slate-500/20 bg-slate-500/10'

      default:
        return 'border-white/10 bg-white/5'
    }
  }

  const getTypeIcon = (type) => {

    switch(type) {

      case 'warn':
        return '⚠️'

      case 'leader':
        return '👑'

      case 'blacklist':
        return '⛔'

      case 'remove':
        return '❌'

      default:
        return '📜'
    }
  }

  return (
    <div className="text-white bg-[#0b0f19] min-h-screen">

      <div className="px-4 sm:px-6 md:px-10 py-10 mt-2">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
            Логи системы
          </h1>
          <p className="text-slate-400">История действий следящей администрации</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Поиск по логам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111827] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-orange-500/20 hover:shadow-xl transition-all duration-300">
            <p className="text-slate-400 text-sm">Всего действий</p>
            <h2 className="text-4xl font-black mt-2">{loading ? '...' : stats.total}</h2>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-orange-500/20 hover:shadow-xl transition-all duration-300">
            <p className="text-slate-400 text-sm">Назначений</p>
            <h2 className="text-4xl font-black mt-2 text-emerald-400">{stats.byType.leader || 0}</h2>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-orange-500/20 hover:shadow-xl transition-all duration-300">
            <p className="text-slate-400 text-sm">Выговоров</p>
            <h2 className="text-4xl font-black mt-2 text-red-400">{stats.byType.warn || 0}</h2>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-orange-500/20 hover:shadow-xl transition-all duration-300">
            <p className="text-slate-400 text-sm">Blacklist</p>
            <h2 className="text-4xl font-black mt-2 text-orange-400">{stats.byType.blacklist || 0}</h2>
          </div>
        </div>

        {/* Logs list */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">Последние логи</h2>
            <button className="text-blue-400 hover:text-blue-300 transition">Все логи →</button>
          </div>

          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-black/20 rounded-2xl p-4 hover:bg-black/30 hover:translate-x-1 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getTypeColor(log.type)}`}>
                    <div className="text-2xl">{getTypeIcon(log.type)}</div>
                  </div>

                  <div>
                    <h4 className="font-bold">{log.admin}</h4>
                    <p className="text-slate-400 text-sm">{log.action}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold">{log.target}</p>
                  <p className="text-xs text-slate-500">{log.date}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  )
}