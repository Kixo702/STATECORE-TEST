import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import logo from '../assets/vite.svg'
import { canViewMenu, canReviewNickRequests } from '../lib/roles'
import { getPendingNickRequests } from '../lib/requests'

const COLLAPSE_KEY = 'sc_sidebar_collapsed'
const DROPDOWN_WIDTH = 300

// Та же таблица, что использует страница "Запреты гос."
const BLACKLIST_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vScK5HNQA_dCCQcgADjGHhxAmDJQo3rcIHtoFWPNTyhQWJvoEO-uzPVfYFRnEOjtJqcIVovmSzFaNRp/pub?gid=1376095683&single=true&output=csv'

const parseDMY = (d) => {
  if (!d) return null
  const [day, month, year] = d.split('.')
  if (!day || !month || !year) return null
  return new Date(`${year}-${month}-${day}`)
}

const isExpired = (endDate) => {
  const d = parseDMY(endDate)
  return d ? d < new Date() : false
}

const IconBell = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Двойной шеврон: указывает в сторону, куда «уедет» контент при сворачивании
const IconPanelToggle = ({ collapsed }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
  </svg>
)

export default function Sidebar({
  activePage,
  setActivePage,
  user,
  setUser,
  mobileOpen,
  setMobileOpen,
  onLogout,
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [notifOpen, setNotifOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [pendingRequests, setPendingRequests] = useState(() => getPendingNickRequests())
  const [activeBansCount, setActiveBansCount] = useState(0)
  const bellWrapRef = useRef(null)
  const dropdownRef = useRef(null)

  const canSeeModerationNotifs = canReviewNickRequests(user)

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Подсчёт актуальных (не истёкших) запретов гос. для бейджа
  useEffect(() => {
    let cancelled = false

    const fetchActiveBansCount = async () => {
      try {
        const res = await fetch(`${BLACKLIST_URL}&cacheBust=${Date.now()}`)
        const csv = await res.text()

        const rows = csv.split('\n').map((r) =>
          r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        )

        const count = rows
          .slice(1)
          .map((r) => ({
            nickname: r[1]?.replace(/"/g, '').trim() || '',
            endDate: r[4]?.replace(/"/g, '').trim() || '',
          }))
          .filter((x) => x.nickname && !isExpired(x.endDate)).length

        if (!cancelled) setActiveBansCount(count)
      } catch (e) {
        console.error(e)
      }
    }

    fetchActiveBansCount()
    const poll = setInterval(fetchActiveBansCount, 30000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [])

  // Опрос заявок на смену ника для колокольчика уведомлений
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

  // Закрытие панели уведомлений по клику вне неё (кнопка + портал — разные поддеревья DOM)
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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const copyNickname = (e) => {
    e.stopPropagation();
    const name = user?.nickname || user?.username || user?.login || 'Гость'
    navigator.clipboard.writeText(name)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goToRequests = () => {
    setNotifOpen(false)
    setActivePage('users')
    if (typeof setMobileOpen === 'function') setMobileOpen(false)
  }

  const menuGroups = [
    {
      label: 'Основное',
      items: [
        {
          id: 'dashboard',
          title: 'Мониторинг',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M4 13h6V4H4v9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 20h6V11h-6v9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 9h6V4h-6v5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20h6v-5H4v5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ]
    },
    {
      label: 'Управление',
      items: [
        {
          id: 'organizations',
          title: 'Организации',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M4 21V7l8-4 8 4v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'users',
          title: 'Пользователи',
          alwaysVisible: true,
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'blacklist',
          title: 'Запрет госструктур',
          badge: activeBansCount > 0 ? activeBansCount : undefined,
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'chsgos',
          title: 'Черный Список',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.5 14.5l5 4M14.5 14.5l-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ]
    },
    {
      label: "Управление лидерами",
      items: [
        {
          id: 'activity',
          title: 'Активность лидеров',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'logs',
          title: 'Логи лидеров',
          badge: '', // Пример текстового бейджа
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ]
    },
    {
      label: 'Помощь',
      items: [
        {
          id: 'faq',
          title: 'FAQ',
          alwaysVisible: true,
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9.5 9.2a2.5 2.5 0 014.7 1.15c0 1.65-2.2 1.7-2.2 3.15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="16.7" r="0.9" fill="currentColor"/>
            </svg>
          )
        }
      ]
    }
  ]

  const notifDropdown = notifOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: DROPDOWN_WIDTH }}
      className="bg-[#0d1422] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Уведомления</span>
        {canSeeModerationNotifs && pendingRequests.length > 0 && (
          <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5">
            {pendingRequests.length} новых
          </span>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto scrollbar-hide">
        {!canSeeModerationNotifs ? (
          <div className="px-4 py-8 text-center text-slate-500 text-xs">
            Нет новых уведомлений
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-xs">
            Заявок на рассмотрении нет
          </div>
        ) : (
          pendingRequests.slice(0, 6).map((r) => (
            <div key={r.id} className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
              <div className="text-[11px] text-slate-500 mb-0.5">Смена никнейма</div>
              <div className="text-xs text-slate-200 font-medium">
                «{r.currentNickname}» → <span className="text-orange-400">«{r.requestedNickname}»</span>
              </div>
            </div>
          ))
        )}
      </div>

      {canSeeModerationNotifs && pendingRequests.length > 0 && (
        <button
          onClick={goToRequests}
          className="w-full py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 transition-colors border-t border-white/5"
        >
          Перейти к заявкам →
        </button>
      )}
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* Overlay для мобильных */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        bg-[#0B1220] border-r border-white/5 flex flex-col justify-between
        md:relative md:translate-x-0 md:flex
        fixed z-40 inset-y-0 left-0 transform transition-[width,transform] duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        md:translate-x-0 overflow-hidden
        ${collapsed ? 'w-[280px] md:w-[84px]' : 'w-[280px] md:w-[280px]'}
      `}>

        {/* HEADER — вне скролл-контейнера, чтобы не клипать выпадающие панели */}
        <div className={`border-b border-white/5 bg-[#0B1220] flex-shrink-0 ${collapsed ? 'md:py-6 md:px-2' : 'px-6 py-6'}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'md:flex-col' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'md:justify-center' : ''}`}>
              <div className="relative flex-shrink-0">
                <img src={logo} alt="Logo" className="h-10 w-auto relative z-10" />
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full z-0" />
              </div>
              <div className={`leading-tight min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
                <div className="text-xl font-bold text-white tracking-wide truncate">
                  State<span className="text-orange-400">Core</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 font-medium truncate">
                  Управление структурой
                </div>
              </div>
            </div>

            {/* Колокольчик + сворачивание — единый кластер иконок */}
            <div className={`flex items-center gap-2 flex-shrink-0 ${collapsed ? 'md:flex-col md:mt-1' : ''}`}>
              <div ref={bellWrapRef}>
                <button
                  onClick={toggleNotif}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all"
                  title="Уведомления"
                >
                  <IconBell />
                  {canSeeModerationNotifs && pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={toggleCollapsed}
                className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center text-slate-400 hover:text-white bg-white/[0.03] hover:bg-orange-500/15 hover:text-orange-400 border border-white/5 hover:border-orange-500/30 transition-all"
                title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              >
                <IconPanelToggle collapsed={collapsed} />
              </button>
            </div>
          </div>
        </div>

        {notifDropdown}

        {/* ОСНОВНОЙ КОНТЕНТ (Скроллируемый, если элементов много) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">

          {/* USER CARD */}
          <div className={`p-4 ${collapsed ? 'md:flex md:justify-center md:px-2' : ''}`}>
            <div
              className={`group relative bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-orange-500/30 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${collapsed ? 'md:p-2' : 'p-4'}`}
              title={collapsed ? (user?.nickname || user?.username || user?.login || 'Гость') : undefined}
            >
              <div
                className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                onClick={() => { setActivePage('profile'); if (typeof setMobileOpen === 'function') setMobileOpen(false) }}
              />

              <div className={`flex items-center gap-4 relative z-10 ${collapsed ? 'md:justify-center md:gap-0' : ''}`}>
                <div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg shadow-inner shadow-orange-500/20 flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                  onClick={copyNickname}
                  title="Нажми, чтобы скопировать ник"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.nickname || user?.username || user?.login || 'Г')?.[0]?.toUpperCase()
                  )}
                </div>

                <div className={`leading-tight truncate flex-1 ${collapsed ? 'md:hidden' : ''}`} onClick={() => { setActivePage('profile'); if (typeof setMobileOpen === 'function') setMobileOpen(false) }}>
                  <div className="font-semibold text-white truncate text-[15px]">
                    {user?.nickname || user?.username || user?.login || 'Гость'}
                  </div>
                  <div className="text-xs text-orange-400 font-medium mt-0.5">
                    {user?.roleName || 'Игрок'}
                  </div>
                </div>
              </div>

              {!collapsed && (user?.vk || user?.forum) && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-[12px] relative z-10">
                  {user?.vk && (
                    <a href={user.vk.startsWith('http') ? user.vk : `https://${user.vk}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#0077FF] transition-colors flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0077FF]"></span> VK
                    </a>
                  )}
                  {user?.forum && (
                    <a href={user.forum.startsWith('http') ? user.forum : `https://${user.forum}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Форум
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MENU GROUPS */}
          <div className={`px-4 pb-6 space-y-6 ${collapsed ? 'md:px-2' : ''}`}>
            {menuGroups.map((group, idx) => {
              const visibleItems = group.items.filter((item) => item.alwaysVisible || canViewMenu(user, item.id));

              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-2">
                  <div className={`text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 ${collapsed ? 'md:hidden' : ''}`}>
                    {group.label}
                  </div>

                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = activePage === item.id

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActivePage(item.id)
                            if (typeof setMobileOpen === 'function') setMobileOpen(false)
                          }}
                          title={collapsed ? item.title : undefined}
                          className={`
                            group relative w-full flex items-center gap-3
                            px-3 py-2.5 rounded-xl
                            transition-all duration-200 outline-none
                            ${collapsed ? 'md:justify-center md:px-0' : ''}
                            ${active
                              ? 'bg-orange-500/10 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                            }
                          `}
                        >
                          {/* Индикатор активации */}
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-orange-400 to-pink-500 rounded-r-md shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
                          )}

                          {/* Иконка */}
                          <div className={`
                            flex items-center justify-center p-1.5 rounded-lg transition-colors
                            ${active ? 'text-orange-400 bg-orange-400/10' : 'text-slate-500 group-hover:text-slate-300 group-hover:bg-white/5'}
                          `}>
                            {item.icon}
                          </div>

                          {/* Текст */}
                          <span className={`font-medium text-sm transition-colors whitespace-nowrap ${active ? 'text-white' : ''} ${collapsed ? 'md:hidden' : ''}`}>
                            {item.title}
                          </span>

                          {/* Бейджи (если есть) */}
                          {item.badge && (
                            <div className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${collapsed ? 'md:hidden' : ''} ${
                              active
                                ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                                : 'bg-white/10 text-slate-300'
                            }`}>
                              {item.badge}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="border-t border-white/5 bg-[#0B1220] z-20">

          {/* Виджет времени */}
          <div className={`px-6 py-3 flex items-center justify-between border-b border-white/5 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              Серверное время
            </div>
            <div className="text-sm font-medium text-slate-300 tabular-nums">
              {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <div className={`p-4 flex gap-2 ${collapsed ? 'md:flex-col md:p-2' : ''}`}>
            {/* Кнопка настроек */}
            <button
              onClick={() => {
                setActivePage('settings')
                if (typeof setMobileOpen === 'function') setMobileOpen(false)
              }}
              className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
              title="Настройки"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Кнопка выхода */}
            <button
              onClick={() => {
                if (onLogout) onLogout()
                else { setUser(null); window.location.reload() }
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-medium group ${collapsed ? 'md:flex-1' : 'flex-[3]'}`}
              title="Выйти"
            >
              <span className={collapsed ? 'md:hidden' : ''}>Выйти</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

        </div>

      </aside>
    </>
  )
}