import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { canReviewNickRequests } from '../lib/roles'
import { getPendingNickRequests } from '../lib/requests'

const IconBell = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function MobileHeader({ onMenu, title, user, setActivePage }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState(() => getPendingNickRequests())

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
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notifOpen])

  const goToProfile = () => {
    if (typeof setActivePage === 'function') setActivePage('profile')
  }

  const goToRequests = () => {
    setNotifOpen(false)
    if (typeof setActivePage === 'function') setActivePage('users')
  }

  const notifDropdown = notifOpen ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed left-3 right-3 top-[62px] z-[9999] bg-[#0e1424] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeUp"
    >
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider">Уведомления</span>
        {canSeeModerationNotifs && pendingRequests.length > 0 && (
          <span className="text-[10px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5">
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
            <div key={r.id} className="px-4 py-3 border-b border-white/[0.04]">
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
          className="w-full py-3 text-xs font-black text-orange-500 active:bg-orange-500/10 transition-colors border-t border-white/[0.06]"
        >
          Перейти к заявкам →
        </button>
      )}
    </div>,
    document.body
  ) : null

  return (
    <header className="md:hidden sticky top-0 z-30 bg-[#0B1220]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between gap-2">
      {/* Кнопка открытия меню */}
      <button
        onClick={onMenu}
        className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all outline-none flex-shrink-0"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Заголовок текущей страницы */}
      <div className="text-center flex-1 px-2 min-w-0">
        <h1 className="text-[15px] font-semibold text-white tracking-wide truncate">
          {title || 'StateCore'}
        </h1>
      </div>

      {/* Уведомления + аватар */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div ref={bellWrapRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${
              notifOpen
                ? 'text-orange-500 bg-orange-500/10 border-orange-500/30'
                : 'text-slate-400 bg-white/5 border-white/5 active:bg-white/10'
            }`}
            aria-label="Уведомления"
          >
            <IconBell />
            {canSeeModerationNotifs && pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center border border-[#0B1220]">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={goToProfile}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm shadow-inner shadow-orange-500/20 overflow-hidden active:scale-95 transition-transform"
          title={user?.nickname || user?.username || user?.login || 'Гость'}
          aria-label="Открыть профиль"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (user?.nickname || user?.username || user?.login || 'Г')?.[0]?.toUpperCase()
          )}
        </button>
      </div>

      {notifDropdown}
    </header>
  )
}