import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { canViewMenu, canReviewNickRequests } from '../lib/roles'
import { getPendingNickRequests } from '../lib/requests'

const DROPDOWN_WIDTH = 300

const NAV_ITEMS = [
  { id: 'dashboard',       title: 'Мониторинг',            group: 'Основное' },
  { id: 'organizations',   title: 'Организации',           group: 'Управление' },
  { id: 'users',           title: 'Пользователи',          group: 'Управление', alwaysVisible: true },
  { id: 'blacklist',       title: 'Запрет госструктур',    group: 'Управление' },
  { id: 'chsgos',          title: 'Черный Список',         group: 'Управление' },
  { id: 'activity',        title: 'Активность лидеров',    group: 'Управление лидерами' },
  { id: 'logs',            title: 'Логи лидеров',          group: 'Управление лидерами' },
  { id: 'leaderAnalytics', title: 'Аналитика лидеров',     group: 'Управление лидерами' },
  { id: 'interview',       title: 'Собеседования',         group: 'Для лидеров' },
  { id: 'faq',             title: 'FAQ',                   group: 'Помощь', alwaysVisible: true },
]

const IconSearch = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const IconX = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Topbar({
  activePage,
  setActivePage,
  user,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [pendingRequests, setPendingRequests] = useState(() => getPendingNickRequests())
  
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const bellWrapRef = useRef(null)
  const dropdownRef = useRef(null)

  const canSeeModerationNotifs = canReviewNickRequests(user)

  useEffect(() => {
    const refresh = () => setPendingRequests(getPendingNickRequests())
    refresh()
    const poll = setInterval(refresh, 5000)
    window.addEventListener('sc:nick-requests-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      clearInterval(poll)
      window.removeEventListener('sc:nick-requests-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    const onClick = (e) => {
      if (bellWrapRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      setNotifOpen(false)
    }
    const onScroll = () => setNotifOpen(false)
    document.addEventListener('mousedown', onClick)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('resize', onScroll)
    }
  }, [notifOpen])

  const toggleNotif = () => {
    if (!notifOpen && bellWrapRef.current) {
      const rect = bellWrapRef.current.getBoundingClientRect()
      let left = rect.right - DROPDOWN_WIDTH
      left = Math.max(12, Math.min(left, window.innerWidth - DROPDOWN_WIDTH - 12))
      setDropdownPos({ top: rect.bottom + 10, left })
    }
    setNotifOpen((v) => !v)
  }

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((i) => i.alwaysVisible || canViewMenu(user, i.id)),
    [user]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return visibleItems
    return visibleItems.filter(
      (i) => i.title.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    )
  }, [query, visibleItems])

  const grouped = useMemo(() => {
    const map = {}
    results.forEach((r) => {
      if (!map[r.group]) map[r.group] = []
      map[r.group].push(r)
    })
    return Object.entries(map)
  }, [results])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goTo = (id) => {
    setActivePage(id)
    setQuery('')
    setOpen(false)
  }

  const goToRequests = () => {
    setNotifOpen(false)
    setActivePage('users')
  }

  const notifDropdown = notifOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: DROPDOWN_WIDTH }}
      className="bg-[#0e1424] border border-white/[0.08] rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-xl animate-fadeUp"
    >
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider">Уведомления</span>
        {canSeeModerationNotifs && pendingRequests.length > 0 && (
          <span className="text-[10px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5 shadow-[0_0_12px_rgba(249,115,22,0.1)]">
            {pendingRequests.length} новых
          </span>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto scrollbar-hide">
        {!canSeeModerationNotifs ? (
          <div className="px-4 py-8 text-center text-slate-500 font-bold text-xs">
            Нет новых уведомлений
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 font-bold text-xs">
            Заявок на рассмотрении нет
          </div>
        ) : (
          pendingRequests.slice(0, 6).map((r) => (
            <div key={r.id} className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <div className="text-[10px] font-extrabold text-slate-500 mb-0.5 uppercase tracking-wide">Смена никнейма</div>
              <div className="text-xs text-slate-200 font-bold">
                «{r.currentNickname}» → <span className="text-orange-500">«{r.requestedNickname}»</span>
              </div>
            </div>
          ))
        )}
      </div>

      {canSeeModerationNotifs && pendingRequests.length > 0 && (
        <button
          onClick={goToRequests}
          className="w-full py-3 text-xs font-black text-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-colors border-t border-white/[0.06]"
        >
          Перейти к заявкам →
        </button>
      )}
    </div>,
    document.body
  ) : null

  return (
    <header className="sticky top-0 z-30 bg-[#101626]/80 backdrop-blur-md border-b border-white/[0.06]">
      <div className="h-16 px-4 md:px-8 flex items-center gap-4">

        <div ref={wrapRef} className="relative flex-1">
          <div
            className={`flex items-center gap-3 h-11 px-4 rounded-xl border transition-all duration-200 ${
              open
                ? 'bg-white/[0.05] border-orange-500/40 shadow-lg shadow-orange-500/5'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <span className="text-slate-500 flex-shrink-0"><IconSearch /></span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Поиск по мониторингу..."
              className="flex-1 bg-transparent outline-none text-xs font-bold text-white placeholder:text-slate-500 min-w-0 tracking-wide"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="text-slate-500 hover:text-white flex-shrink-0 transition-colors"
                title="Очистить"
              >
                <IconX />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-extrabold text-white/30 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-0.5 flex-shrink-0 tracking-wide">
              CTRL K
            </kbd>
          </div>

          {open && (
            <div className="absolute left-0 right-0 mt-2 bg-[#0e1424] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-40 max-h-[360px] overflow-y-auto scrollbar-hide backdrop-blur-xl animate-fadeUp">
              {grouped.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 font-bold text-xs">
                  Ничего не найдено по запросу «{query}»
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="border-b border-white/[0.02] last:border-none">
                    <div className="px-4 pt-3.5 pb-1.5 text-[10px] font-extrabold text-white/30 uppercase tracking-wider">
                      {group}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => goTo(item.id)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left text-xs font-bold transition-all ${
                          activePage === item.id
                            ? 'text-orange-500 bg-orange-500/5 font-black border-l-2 border-orange-500 pl-4.5'
                            : 'text-slate-300 hover:bg-white/[0.02] hover:text-white'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0 ${activePage === item.id ? 'opacity-100' : ''}`} />
                        {item.title}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div ref={bellWrapRef}>
            <button
              onClick={toggleNotif}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                notifOpen 
                  ? 'text-orange-500 bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/5' 
                  : 'text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06]'
              }`}
              title="Уведомления"
            >
              <IconBell />
              {canSeeModerationNotifs && pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)] border border-[#101626]">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          <div className="w-px h-6 bg-white/[0.06] mx-1 hidden sm:block" />

          <button
            onClick={() => goTo('profile')}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs overflow-hidden flex-shrink-0 hover:border-orange-500/40 hover:scale-[1.03] shadow-inner transition-all duration-200"
            title={user?.nickname || user?.username || user?.login || 'Профиль'}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.nickname || user?.username || user?.login || 'Г')?.[0]?.toUpperCase()
            )}
          </button>
        </div>

      </div>
      {notifDropdown}
    </header>
  )
}