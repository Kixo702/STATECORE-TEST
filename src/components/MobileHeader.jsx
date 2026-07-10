export default function MobileHeader({ onMenu, title, user }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-[#0B1220]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
      {/* Кнопка открытия меню */}
      <button
        onClick={onMenu}
        className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all outline-none"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Заголовок текущей страницы */}
      <div className="text-center flex-1 px-3">
        <h1 className="text-[15px] font-semibold text-white tracking-wide truncate">
          {title || 'StateCore'}
        </h1>
      </div>

      {/* Аватар пользователя */}
      <div className="flex items-center flex-shrink-0">
        <div 
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm shadow-inner shadow-orange-500/20"
          title={user?.nickname || user?.username || user?.login || 'Гость'}
        >
          {(user?.nickname || user?.username || user?.login || 'Г')?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  )
}