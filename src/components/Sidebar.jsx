import { useState, useEffect } from 'react'
import logo from '../assets/vite.svg'
import { canViewMenu } from '../lib/roles'

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

  // Обновление времени каждую секунду
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const copyNickname = (e) => {
    e.stopPropagation();
    const name = user?.nickname || user?.username || user?.login || 'Гость'
    navigator.clipboard.writeText(name)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          title: 'Запреты гос.',
          badge: 3, // Пример бейджа с количеством
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        },
        {
          id: 'logs',
          title: 'Логи',
          badge: 'Новые', // Пример текстового бейджа
          icon: (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )
        }
      ]
    }
  ]

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
        fixed z-40 inset-y-0 left-0 w-[280px] transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        md:translate-x-0 md:w-[280px] overflow-hidden
      `}>

        {/* ОСНОВНОЙ КОНТЕНТ (Скроллируемый, если элементов много) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          
          {/* LOGO */}
          <div className="px-6 py-7 border-b border-white/5 sticky top-0 bg-[#0B1220]/95 backdrop-blur z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={logo} alt="Logo" className="h-10 w-auto relative z-10" />
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full z-0" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-bold text-white tracking-wide">
                  State<span className="text-orange-400">Core</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 font-medium">
                  Управление структурой
                </div>
              </div>
            </div>
          </div>

          {/* USER CARD */}
          <div className="p-4">
            <div
              className="group relative bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-orange-500/30 rounded-2xl p-4 cursor-pointer transition-all duration-300 overflow-hidden"
            >
              <div 
                className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                onClick={() => { setActivePage('profile'); if (typeof setMobileOpen === 'function') setMobileOpen(false) }}
              />

              <div className="flex items-center gap-4 relative z-10">
                <div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg shadow-inner shadow-orange-500/20 flex-shrink-0 group-hover:scale-105 transition-transform"
                  onClick={copyNickname}
                  title="Нажми, чтобы скопировать ник"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    (user?.nickname || user?.username || user?.login || 'Г')?.[0]?.toUpperCase()
                  )}
                </div>

                <div className="leading-tight truncate flex-1" onClick={() => { setActivePage('profile'); if (typeof setMobileOpen === 'function') setMobileOpen(false) }}>
                  <div className="font-semibold text-white truncate text-[15px]">
                    {user?.nickname || user?.username || user?.login || 'Гость'}
                  </div>
                  <div className="text-xs text-orange-400 font-medium mt-0.5">
                    {user?.roleName || 'Игрок'}
                  </div>
                </div>
              </div>

              {(user?.vk || user?.forum) && (
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
          <div className="px-4 pb-6 space-y-6">
            {menuGroups.map((group, idx) => {
              const visibleItems = group.items.filter((item) => item.alwaysVisible || canViewMenu(user, item.id));
              
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
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
                          className={`
                            group relative w-full flex items-center gap-3
                            px-3 py-2.5 rounded-xl
                            transition-all duration-200 outline-none
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
                          <span className={`font-medium text-sm transition-colors ${active ? 'text-white' : ''}`}>
                            {item.title}
                          </span>

                          {/* Бейджи (если есть) */}
                          {item.badge && (
                            <div className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
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
          <div className="px-6 py-3 flex items-center justify-between border-b border-white/5">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              Серверное время
            </div>
            <div className="text-sm font-medium text-slate-300 tabular-nums">
              {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <div className="p-4 flex gap-2">
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
              className="flex-[3] flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-medium group"
            >
              Выйти
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