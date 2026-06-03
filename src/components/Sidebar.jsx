import logo from '../assets/vite.svg'

export default function Sidebar({
  activePage,
  setActivePage,
  user,
  setUser
}) {

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Мониторинг',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <path d="M4 13h6V4H4v9z" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M14 20h6V11h-6v9z" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M14 9h6V4h-6v5z" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M4 20h6v-5H4v5z" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      )
    },
    {
      id: 'organizations',
      title: 'Организации',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <path d="M4 21V7l8-4 8 4v14" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      )
    },
    {
      id: 'blacklist',
      title: 'Запреты гос.',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      )
    },
    {
      id: 'logs',
      title: 'Логи',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      )
    }
  ]

  return (
    <aside className="w-72 bg-[#0B1220] border-r border-white/5 flex flex-col justify-between">

      {/* TOP */}
      <div>

        {/* LOGO */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">

            <img
              src={logo}
              alt="Logo"
              className="h-10 w-auto"
            />

            <div className="leading-tight">
              <div className="text-lg font-semibold text-white tracking-wide">
                State<span className="text-orange-400">Core</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Government Control Panel
              </div>
            </div>

          </div>
        </div>

        {/* USER */}
        <div className="px-6 py-5">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                {user.username?.[0]?.toUpperCase()}
              </div>

              <div className="leading-tight">
                <div className="font-medium text-white">
                  @{user.username}
                </div>
                <div className="text-xs text-orange-400">
                  {user.roleName}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* MENU */}
        <div className="px-3 space-y-1">

          {menuItems.map((item) => {
            const active = activePage === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`
                  relative w-full flex items-center gap-3
                  px-4 py-3 rounded-xl
                  transition-all duration-300

                  ${
                    active
                      ? 'bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent text-white shadow-lg shadow-orange-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >

                {/* active bar */}
                {active && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-orange-400 to-pink-500 rounded-full" />
                )}

                {/* icon */}
                <div className={`
                  transition
                  ${active ? 'text-orange-400' : 'text-slate-400 group-hover:text-white'}
                `}>
                  {item.icon}
                </div>

                {/* text */}
                <span className="font-medium text-sm">
                  {item.title}
                </span>

                {/* glow dot */}
                {active && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_2px_rgba(251,146,60,0.6)]" />
                )}

              </button>
            )
          })}

        </div>

      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-white/5">

        <button
          onClick={() => {
            setUser(null)
            window.location.reload()
          }}
          className="
            w-full py-3 rounded-xl
            border border-red-500/20
            bg-red-500/10
            text-red-400
            hover:bg-red-500
            hover:text-white
            transition-all
            font-medium
          "
        >
          Выйти
        </button>

      </div>

    </aside>
  )
}