import { useEffect, useMemo, useState } from 'react'

// ── SVG Иконки ────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconCrown = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/>
  </svg>
)
const IconWarn = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconFileText = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IconUserX = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
)
const IconLock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const TYPE_CONFIG = {
  leader: { label: 'Назначения', icon: <IconCrown size={18} />, main: '#34d399', bg: 'rgba(52,211,153,.06)', border: 'rgba(52,211,153,.15)', glow: 'rgba(52,211,153,.15)' },
  warn: { label: 'Выговоры', icon: <IconWarn size={16} />, main: '#f87171', bg: 'rgba(248,113,113,.06)', border: 'rgba(248,113,113,.15)', glow: 'rgba(248,113,113,.15)' },
  blacklist: { label: 'Черный список', icon: <IconLock size={16} />, main: '#fb923c', bg: 'rgba(251,146,60,.06)', border: 'rgba(251,146,60,.15)', glow: 'rgba(251,146,60,.15)' },
  remove: { label: 'Снятия', icon: <IconUserX size={16} />, main: '#ef4444', bg: 'rgba(239,68,68,.06)', border: 'rgba(239,68,68,.15)', glow: 'rgba(239,68,68,.15)' },
  default: { label: 'Другое', icon: <IconFileText size={16} />, main: '#60a5fa', bg: 'rgba(96,165,250,.06)', border: 'rgba(96,165,250,.15)', glow: 'rgba(96,165,250,.15)' }
}

export default function Logs() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // Основной тип ('all', 'remove', 'warn'...)
  const [reasonFilter, setReasonFilter] = useState('all') // Фильтр конкретно по причинам снятия
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const LOGS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/gviz/tq?tqx=out:csv&sheet=Logs'

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${LOGS_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()

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

      const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '')
      if (lines.length === 0) { setLogs([]); return }

      const parsed = lines.map((line) => {
        const r = parseCSVLine(line)
        if (r.length < 5) return null

        const targetNick = r[0]
        const fraction = r[1]
        const targetVk = r[2]
        const targetForum = r[3]
        const rawAction = r[4]
        const dateStart = r[5]
        const dateEnd = r[6]
        const warnsStrict = r[7]
        const warnsOral = r[8]
        const authorName = r[9]

        if (!targetNick || targetNick.toLowerCase().includes('ник') || (rawAction && rawAction.toLowerCase().includes('причина'))) {
          return null
        }

        let type = 'default'
        const actionLower = (rawAction || '').toLowerCase().replace(/[\s\+]/g, '') // убираем плюсы и пробелы для точечной сверки
        
        // Категоризация
        if (
          actionLower.includes('импичмент') || actionLower.includes('снят') || 
          actionLower.includes('псж') || actionLower.includes('срок') || 
          actionLower.includes('cpok') || actionLower.includes('cpok') || 
          actionLower.includes('слив') || actionLower.includes('блат') || 
          actionLower.includes('неадекват') || actionLower.includes('халатн') ||
          actionLower.includes('активн') || actionLower.includes('переворот') ||
          /^\d\/\d/.test(actionLower) // если начинается с дроби выговоров типа 3/3, 4/3
        ) {
          type = 'remove'
        } else if (actionLower.includes('выгово') || actionLower.includes('warn') || actionLower.includes('пред')) {
          type = 'warn'
        } else if (actionLower.includes('чс') || actionLower.includes('blacklist')) {
          type = 'blacklist'
        } else if (actionLower.includes('назначен') || actionLower.includes('лидер')) {
          type = 'leader'
        }

        // Выделение чистой группы причины (для кнопок-счетчиков)
        let cleanReason = 'Другое'
        const rawLower = (rawAction || '').toLowerCase()
        if (rawLower.includes('срок') || rawLower.includes('cpok') || rawLower.includes('cpoк')) cleanReason = 'Срок'
        else if (rawLower.includes('псж') || rawLower.includes('пс 1.33')) cleanReason = 'ПСЖ'
        else if (rawLower.includes('импичмент') || rawLower.includes('иск')) cleanReason = 'Импичмент'
        else if (rawLower.includes('слив')) cleanReason = 'Слив'
        else if (rawLower.includes('блат') || rawLower.includes('халатн')) cleanReason = 'Блат/Халатность'
        else if (rawLower.includes('неадекват') || rawLower.includes('оск')) cleanReason = 'Неадекватность'
        else if (rawLower.includes('неактив')) cleanReason = 'Неактивность'
        else if (/3\/3|4\/3|5\/3/.test(rawLower)) cleanReason = '3/3 Выговоров'
        else if (rawLower.includes('снят')) cleanReason = 'Снят'

        return {
          type,
          cleanReason,
          admin: authorName || 'Система', 
          action: rawAction || 'Действие не указано',
          fraction: fraction && fraction !== '—' && fraction !== '-' ? fraction : null,
          target: targetNick,
          targetVk: targetVk && targetVk !== '—' && targetVk !== '-' ? targetVk : null,
          targetForum: targetForum && targetForum !== '—' && targetForum !== '-' ? targetForum : null,
          date: dateStart || '—',
          dateEnd: dateEnd && dateEnd !== '—' && dateEnd !== '-' ? dateEnd : null,
          warnsStrict: warnsStrict && warnsStrict !== '—' && warnsStrict !== '-' && warnsStrict !== '0/3' ? warnsStrict : null,
          warnsOral: warnsOral && warnsOral !== '—' && warnsOral !== '-' && warnsOral !== '0/3' ? warnsOral : null,
        }
      }).filter(Boolean)

      setLogs(parsed)
    } catch (e) {
      console.error("Ошибка загрузки логов:", e)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // ── Подсчет точного количества по каждой причине снятия ──
  const reasonStats = useMemo(() => {
    const counts = { 'Срок': 0, 'ПСЖ': 0, 'Импичмент': 0, '3/3 Выговоров': 0, 'Слив': 0, 'Блат/Халатность': 0, 'Неадекватность': 0, 'Неактивность': 0, 'Снят': 0, 'Другое': 0 }
    let totalRemoves = 0

    logs.forEach(l => {
      if (l.type === 'remove') {
        totalRemoves++
        if (counts[l.cleanReason] !== undefined) {
          counts[l.cleanReason]++
        } else {
          counts['Другое']++
        }
      }
    })

    return { totalRemoves, counts }
  }, [logs])

  // ── Фильтрация данных ──
  const filteredLogs = useMemo(() => {
    const s = search.toLowerCase()
    return logs.filter((log) => {
      // 1. Проверка по вкладке главного типа
      if (activeFilter !== 'all' && log.type !== activeFilter) return false
      
      // 2. Проверка по кнопкам причин снятия (если активна вкладка "Снятия" или "Все")
      if (reasonFilter !== 'all' && log.cleanReason !== reasonFilter) return false

      // 3. Живой поиск
      return (
        (log.target || '').toLowerCase().includes(s) || 
        (log.action || '').toLowerCase().includes(s) || 
        (log.admin || '').toLowerCase().includes(s) ||
        (log.fraction || '').toLowerCase().includes(s) ||
        (log.targetVk || '').toLowerCase().includes(s) ||
        (log.targetForum || '').toLowerCase().includes(s)
      )
    })
  }, [logs, search, activeFilter, reasonFilter])

  const getCfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default

  return (
    <div style={{
      fontFamily: "'Syne', 'Onest', 'Segoe UI', sans-serif",
      color: '#e8edf5',
      background: '#060810',
      minHeight: '100vh',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@400;500;600;700;800;900&display=swap');

        @keyframes log-fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes log-shimmer { 100% { transform: translateX(100%); } }

        * { box-sizing: border-box; }
        .log-container { max-width: 1600px; margin: 0 auto; padding: 40px 48px; }
        
        .log-input-wrap { position: relative; width: 100%; }
        .log-input {
          width: 100%; background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 16px 20px 16px 48px; color: #fff; font-size: 14px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 16px; font-family: inherit;
        }
        .log-input:focus {
          outline: none; background: rgba(255, 255, 255, 0.04);
          border-color: rgba(96, 165, 250, 0.5); box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.08);
        }

        /* Кнопки причин снятия */
        .reason-grid {
          display: grid; gridTemplateColumns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 32px;
        }
        .reason-card-btn {
          background: linear-gradient(160deg, rgba(255,255,255,.01) 0%, rgba(8,10,18,.3) 100%);
          border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 14px;
          padding: 16px; cursor: pointer; text-align: left; display: flex; flex-direction: column;
          justify-content: space-between; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reason-card-btn:hover {
          background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1); transform: translateY(-2px);
        }
        .reason-card-btn.active {
          background: rgba(239, 68, 68, 0.04); border-color: rgba(239, 68, 68, 0.4);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
        }

        .log-filter-btn {
          padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s ease; font-family: 'Onest', sans-serif;
        }
        .log-filter-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .log-filter-btn.active {
          background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3); color: #60a5fa;
        }

        .log-main-panel {
          background: linear-gradient(160deg, rgba(13,17,30,.7) 0%, rgba(7,9,16,.9) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 24px;
          padding: 32px; backdrop-filter: blur(20px); box-shadow: 0 30px 90px rgba(0,0,0,.4);
        }

        .log-row {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px; padding: 18px 22px; gap: 16px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .log-row:hover {
          background: rgba(255, 255, 255, 0.025); border-color: rgba(255, 255, 255, 0.07); transform: translateX(4px);
        }

        .log-skeleton {
          position: relative; overflow: hidden; background: rgba(255, 255, 255, 0.02); border-radius: 16px; height: 86px;
        }
        .log-skeleton::after {
          position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          animation: log-shimmer 1.5s infinite; content: '';
        }

        @media (max-width: 992px) {
          .log-container { padding: 24px 20px; }
          .log-row { flex-direction: column; align-items: flex-start; gap: 16px; }
          .log-row-right { text-align: left !important; width: 100%; padding-left: 58px; }
          .log-main-panel { padding: 20px; border-radius: 20px; }
        }
      `}</style>

      <div className="log-container">
        {/* ── HEADER ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,.25)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>
            <span>Панель управления</span>
            <span style={{ opacity: .35 }}><IconChevron /></span>
            <span style={{ color: 'rgba(255,255,255,.4)' }}>Статистика снятий лидеров</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', background: 'linear-gradient(125deg, #ffffff 30%, rgba(255,255,255,.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Syne, sans-serif' }}>
            Причины снятия
          </h1>
        </div>

        {/* ── НОВЫЕ КНОПКИ ФИЛЬТРАЦИИ И ПОДСЧЕТА ПРИЧИН СНЯТИЯ ── */}
        <div className="reason-grid">
          {/* Общая кнопка "Все снятия" */}
          <button 
            className={`reason-card-btn ${reasonFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setReasonFilter('all'); setActiveFilter('remove'); }}
          >
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Всего снято</span>
            <h3 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, color: '#ef4444', fontFamily: 'Syne, sans-serif' }}>
              {loading ? '...' : reasonStats.totalRemoves} <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.2)' }}>чел.</span>
            </h3>
          </button>

          {/* Генерация кнопок под каждую причину */}
          {Object.entries(reasonStats.counts).map(([name, count]) => (
            <button 
              key={name}
              className={`reason-card-btn ${reasonFilter === name ? 'active' : ''}`}
              onClick={() => { setReasonFilter(name); setActiveFilter('remove'); }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', fontWeight: 600, textTransform: 'none' }}>{name}</span>
              <h3 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, color: count > 0 ? '#fff' : 'rgba(255,255,255,.15)', fontFamily: 'Syne, sans-serif' }}>
                {loading ? '...' : count} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', fontWeight: 500 }}>раз</span>
              </h3>
            </button>
          ))}
        </div>

        {/* ── УПРАВЛЕНИЕ: ЖИВОЙ ПОИСК И ГЛАВНЫЕ ТИПЫ ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div className="log-input-wrap">
            <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.25)', display: 'flex', pointerEvents: 'none' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Поиск по нику лидера, фракции, ВК, автору лога или точной причине..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="log-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className={`log-filter-btn ${activeFilter === 'all' && reasonFilter === 'all' ? 'active' : ''}`} onClick={() => { setActiveFilter('all'); setReasonFilter('all'); }}>Все типы логов</button>
            <button className={`log-filter-btn ${activeFilter === 'remove' ? 'active' : ''}`} onClick={() => { setActiveFilter('remove'); }}>Только снятия</button>
            <button className={`log-filter-btn ${activeFilter === 'warn' ? 'active' : ''}`} onClick={() => { setActiveFilter('warn'); setReasonFilter('all'); }}>Только выговоры</button>
            <button className={`log-filter-btn ${activeFilter === 'leader' ? 'active' : ''}`} onClick={() => { setActiveFilter('leader'); setReasonFilter('all'); }}>Назначения лидеров</button>
            <button className={`log-filter-btn ${activeFilter === 'blacklist' ? 'active' : ''}`} onClick={() => { setActiveFilter('blacklist'); setReasonFilter('all'); }}>Черный список</button>
          </div>
        </div>

        {/* ── ГЛАВНЫЙ СПИСОК ── */}
        <div className="log-main-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px' }}>
              {reasonFilter !== 'all' ? `История снятий: ${reasonFilter}` : 'Реестр изменений'}
            </h2>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Onest, sans-serif' }}>
              Найдено строк: {filteredLogs.length}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              [...Array(5)].map((_, i) => <div key={i} className="log-skeleton" />)
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,.2)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Onest, sans-serif' }}>Записи не найдены</div>
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>Попробуйте сбросить фильтры причин снятия</div>
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const cfg = getCfg(log.type)
                const isRemoveLog = log.type === 'remove'

                return (
                  <div
                    key={index}
                    className="log-row"
                    style={{
                      animation: `log-fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both ${index * 0.012}s`
                    }}
                  >
                    {/* ЛЕВАЯ ЧАСТЬ: Иконка + Какое действие */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: cfg.main, boxShadow: `0 4px 12px ${cfg.glow}`
                      }}>
                        {cfg.icon}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: cfg.main, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '2px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Onest, sans-serif' }}>
                            {log.action}
                          </span>
                          {log.fraction && (
                            <span style={{ fontSize: '11px', color: '#93c5fd', background: 'rgba(147,197,253,0.06)', border: 'rgba(147,197,253,0.15) 1px solid', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              {log.fraction}
                            </span>
                          )}
                        </div>
                        
                        {/* Выговоры (Скрыты, если строка относится к категории Снятия) */}
                        {!isRemoveLog && (log.warnsStrict || log.warnsOral) && (
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', fontFamily: 'Onest, sans-serif' }}>
                            {log.warnsStrict && (
                              <span style={{ color: '#f87171', fontWeight: 600 }}>строгие: <b style={{ background: 'rgba(248,113,113,0.1)', padding: '1px 4px', borderRadius: '4px' }}>{log.warnsStrict}</b></span>
                            )}
                            {log.warnsOral && (
                              <span style={{ color: '#fb923c', fontWeight: 600 }}>устные: <b style={{ background: 'rgba(251,146,60,0.1)', padding: '1px 4px', borderRadius: '4px' }}>{log.warnsOral}</b></span>
                            )}
                          </div>
                        )}

                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>
                          Запись внес: <strong style={{ color: 'rgba(255,255,255,.6)' }}>{log.admin}</strong>
                        </p>
                      </div>
                    </div>

                    {/* ПРАВАЯ ЧАСТЬ: Информация о лидере */}
                    <div className="log-row-right" style={{ textAlign: 'right', flexShrink: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f0f4fa', fontFamily: 'Onest, sans-serif' }}>
                        {log.target}
                      </h4>
                      
                      {(log.targetVk || log.targetForum) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', opacity: 0.5, fontSize: '11px', flexWrap: 'wrap' }}>
                          {log.targetVk && <span style={{ color: '#60a5fa' }}>vk: {log.targetVk}</span>}
                          {log.targetForum && <span style={{ color: '#94a3b8' }}>forum: {log.targetForum}</span>}
                        </div>
                      )}

                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'rgba(255,255,255,.25)', fontWeight: 600, fontFamily: 'Onest, sans-serif' }}>
                        {log.date} {log.dateEnd ? ` → ${log.dateEnd}` : ''}
                      </p>
                    </div>

                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}