import { useState, useEffect, useRef } from 'react'

// ── Icons (в стиле Dashboard.jsx) ───────────────────────────────
const IC = {
  gear: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M19.4 13.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.1-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.48 1a7.3 7.3 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 14.4 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.2.58-1.73 1l-2.48-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L4.94 11.5c-.04.33-.06.66-.06 1s.02.67.06 1l-2.1 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.48-1c.53.42 1.1.75 1.73 1l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.63-.25 1.2-.58 1.73-1l2.48 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 13.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11A8 8 0 1 0 18.5 15.5M20 11V5M20 11h-6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
  ),
}

const AUTO_CHECK_SECONDS = 60

/**
 * Страница технического обслуживания.
 * Показывается всем пользователям (в т.ч. незалогиненным), пока в App.jsx
 * включён флаг MAINTENANCE_MODE. Как только его выключат и задеплоят —
 * следующий ручной или автоматический reload вернёт обычный интерфейс.
 *
 * Props:
 *  - message: кастомный текст под заголовком (необязательно)
 *  - eta: строка с ориентировочным временем окончания работ, напр. "~ 18:00 МСК" (необязательно)
 */
export default function Maintenance({ message, eta }) {
  const [checking, setChecking] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CHECK_SECONDS)
  const reloadTimeout = useRef(null)

  const doReload = () => {
    setChecking(true)
    // небольшая задержка ради визуального фидбека, чтобы кнопка не «мигала» мгновенно
    reloadTimeout.current = setTimeout(() => window.location.reload(), 450)
  }

  // автопроверка статуса — просто перезагружает страницу раз в AUTO_CHECK_SECONDS,
  // чтобы если статус тех.обслуживания сняли, пользователь сам это не заметил вручную
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          doReload()
          return AUTO_CHECK_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => {
      clearInterval(interval)
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#090D16] text-white flex items-center justify-center px-4">

      {/* ambient blobs — в стиле Landing */}
      <div
        className="pointer-events-none absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(255,140,0,.18) 0%, transparent 70%)', filter: 'blur(10px)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,.16) 0%, transparent 70%)', filter: 'blur(10px)' }}
      />

      <div
        className="relative w-full max-w-lg rounded-[28px] border border-white/[0.08] overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #141b2e 0%, #0d1120 100%)',
          boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(255,140,0,.06), inset 0 1px 0 rgba(255,255,255,.06)',
        }}
      >
        {/* верхняя мерцающая полоса — как в модалках Dashboard */}
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #ff8c00, #ff5500, #ff8c00)',
            backgroundSize: '200% 100%',
            animation: 'db-shimmer 3s linear infinite',
          }}
        />

        <div className="px-8 py-10 sm:px-10 sm:py-12 text-center">

          {/* иконка */}
          <div
            className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,140,0,.12)', color: '#ff8c00' }}
          >
            <span
              className="w-8 h-8 flex items-center justify-center"
              style={{ animation: 'db-spin 6s linear infinite' }}
            >
              {IC.gear}
            </span>
          </div>

          <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-400/80 mb-3">
            StateCore · Техническое обслуживание
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
            Мы приводим систему в порядок
          </h1>

          <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-sm mx-auto">
            {message || 'Ведутся технические работы. Панель временно недоступна — скоро всё снова заработает в штатном режиме.'}
          </p>

          {eta && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" style={{ animation: 'db-spin 1.4s ease-in-out infinite alternate' }} />
              Ориентировочно: {eta}
            </div>
          )}

          {/* кнопка обновления страницы */}
          <button
            onClick={doReload}
            disabled={checking}
            className="mt-8 w-full group relative overflow-hidden rounded-xl py-3.5 font-black text-[15px] transition-all duration-300 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-orange-950 hover:scale-[1.01] shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            <span
              className="w-4.5 h-4.5 flex items-center justify-center"
              style={checking ? { animation: 'db-spin .8s linear infinite' } : undefined}
            >
              {IC.refresh}
            </span>
            {checking ? 'Проверяем...' : 'Проверить снова'}
          </button>

          <p className="mt-4 text-[11px] text-slate-500">
            Автоматическая проверка через {secondsLeft} сек.
          </p>
        </div>
      </div>
    </div>
  )
}