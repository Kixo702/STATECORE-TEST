export default function MobileHeader({ onMenu, title, user }) {
  return (
    <header className="md:hidden bg-[#0B1220] border-b border-white/5 px-4 py-3 flex items-center justify-between">
      <button
        onClick={onMenu}
        className="p-2 rounded-lg bg-white/5 text-white"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="text-center flex-1 px-3">
        <div className="text-sm text-slate-300">{title}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
          {user?.username?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  )
}
