import { useState, useEffect } from 'react'
import logo from '../assets/vite.svg'
import { canViewMenu } from '../lib/roles'

const COLLAPSE_KEY = 'sc_sidebar_collapsed'

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

const IconPanelToggle = ({ collapsed }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .28s cubic-bezier(.34,1.56,.64,1)' }}>
    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
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
  onGoHome,
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [activeBansCount, setActiveBansCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchActiveBansCount = async () => {
      try {
        const res = await fetch(`${BLACKLIST_URL}&cacheBust=${Date.now()}`)
        const csv = await res.text()
        const rows = csv.split('\n').map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const menuGroups = [
    {
      label: 'Основное',
      items: [
        {
          id: 'home',
          title: 'Главная',
          alwaysVisible: true,
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M4 11l8-7 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 9.5V20a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
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
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'leaderAnalytics',
          title: 'Аналитика лидеров',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M4 19V9m6 10V4m6 15v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ]
    },
    {
      label: 'Для лидеров',
      items: [
        {
          id: 'inactive',
          title: 'Неактивы',
          alwaysVisible: true,
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'eventPlanner',
          title: 'Планировщик РП',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 14.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'interview',
          title: 'Собеседования',
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.1-3.9A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#0a0e18]/80 backdrop-blur-md z-30 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        border-r border-white/[0.06] flex flex-col justify-between
        md:relative md:translate-x-0 md:flex
        fixed z-40 inset-y-0 left-0 transform transition-[width,transform] duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'}
        md:translate-x-0 overflow-hidden
        ${collapsed ? 'w-[280px] md:w-[84px]' : 'w-[280px] md:w-[280px]'}
      `} style={{ background: 'linear-gradient(180deg, #101626 0%, #070a12 100%)' }}>

        <div className={`border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'md:py-5 md:px-2' : 'px-6 py-5'}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'md:flex-col' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'md:justify-center' : ''}`}>
              <div className="relative flex-shrink-0">
                <img src={logo} alt="Logo" className="h-9 w-auto relative z-10" />
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full z-0 scale-120 animate-pulse" />
              </div>
              <div className={`leading-tight min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
                <div className="text-xl font-black text-white tracking-tight truncate">
                  State<span className="text-orange-500">Core</span>
                </div>
                <div className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-white/30 mt-0.5 truncate">
                  Управление структурой
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 flex-shrink-0 ${collapsed ? 'md:flex-col md:mt-1' : ''}`}>
              <button
                onClick={toggleCollapsed}
                className="hidden md:flex w-8 h-8 rounded-xl items-center justify-center text-white/40 bg-white/[0.02] border border-white/[0.06] hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-500 transition-all duration-200"
                title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              >
                <IconPanelToggle collapsed={collapsed} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-4">
          <div className={`px-4 pb-6 space-y-6 ${collapsed ? 'md:px-2' : ''}`}>
            {menuGroups.map((group, idx) => {
              const visibleItems = group.items.filter((item) => item.alwaysVisible || canViewMenu(user, item.id));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className={`text-[10px] font-extrabold text-white/30 uppercase tracking-[2px] px-3 mb-2 ${collapsed ? 'md:hidden' : ''}`}>
                    {group.label}
                  </div>

                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = activePage === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'home') {
                              if (typeof onGoHome === 'function') onGoHome()
                            } else {
                              setActivePage(item.id)
                            }
                            if (typeof setMobileOpen === 'function') setMobileOpen(false)
                          }}
                          title={collapsed ? item.title : undefined}
                          className={`
                            group relative w-full flex items-center gap-3
                            px-3 py-2.5 rounded-xl
                            transition-all duration-200 outline-none font-bold text-xs
                            ${collapsed ? 'md:justify-center md:px-0' : ''}
                            ${active
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                            }
                          `}
                        >
                          <div className={`
                            flex items-center justify-center p-0.5 rounded-lg transition-colors
                            ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}
                          `}>
                            {item.icon}
                          </div>

                          <span className={`transition-colors whitespace-nowrap ${collapsed ? 'md:hidden' : ''}`}>
                            {item.title}
                          </span>

                          {item.badge !== undefined && (
                            <div className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all ${collapsed ? 'md:hidden' : ''} ${
                              active
                                ? 'bg-white text-orange-600'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                            }`}>
                              {item.badge || '0'}
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

        <div className="border-t border-white/[0.06] bg-[#070a12]/40 backdrop-blur-md z-20">
          <div className={`px-6 py-3 flex items-center justify-between border-b border-white/[0.06] ${collapsed ? 'md:hidden' : ''}`}>
            <div className="text-[10px] font-extrabold tracking-[1px] uppercase text-white/30 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
              Серверное время
            </div>
            <div className="text-xs font-bold text-slate-300 tabular-nums tracking-wide">
              {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <div className={`p-3 flex gap-2 ${collapsed ? 'md:flex-col md:p-2' : ''}`}>
            <button
              onClick={() => {
                setActivePage('settings')
                if (typeof setMobileOpen === 'function') setMobileOpen(false)
              }}
              className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-150"
              title="Настройки"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button
              onClick={() => {
                if (onLogout) onLogout()
                else { setUser(null); window.location.reload() }
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5 text-red-400/90 hover:bg-red-500 hover:text-white transition-all duration-200 text-xs font-bold group ${collapsed ? 'md:flex-1' : 'flex-[3]'}`}
              title="Выйти"
            >
              <span className={collapsed ? 'md:hidden' : ''}>Выйти</span>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}