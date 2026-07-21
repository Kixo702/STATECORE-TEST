import { useState, useEffect, useRef } from 'react'

// ── Design tokens (те же, что в Landing.jsx) ───────────────────
const T = {
  bg: '#07080f',
  ink: '#f2f4fb',
  ink2: 'rgba(242,244,251,.62)',
  ink3: 'rgba(242,244,251,.40)',
  glassBorder: 'rgba(255,255,255,.10)',
  primary: '#4f6cf7',
  primarySoft: '#8298ff',
  orange: '#ff8c00',
  orangeDeep: '#ff5500',
  blue: '#38bdf8',
  green: '#22c55e',
  red: '#fb7185',
  yellow: '#facc15',
}
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
const FONT_DISPLAY = FONT
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const hexToRgba = (hex, a) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const AUTO_CHECK_SECONDS = 60

// ── Icons ────────────────────────────────────────────────────
const IC = {
  shield: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  gear: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.4" />
      <path d="M19.4 13.5c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.1-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.48 1a7.3 7.3 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 14.4 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.2.58-1.73 1l-2.48-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L4.94 11.5c-.04.33-.06.66-.06 1s.02.67.06 1l-2.1 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.48-1c.53.42 1.1.75 1.73 1l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.63-.25 1.2-.58 1.73-1l2.48 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 13.5z" />
    </svg>
  ),
  refresh: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 1 0 18.5 15.5" /><polyline points="20 5 20 11 14 11" />
    </svg>
  ),
  terminal: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
}

// ── Ambient backdrop (как Aurora в Landing.jsx) ────────────────
function Aurora() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: '-12%', left: '-8%', width: 560, height: 560, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(T.orange, .22)} 0%, transparent 68%)`,
        filter: 'blur(10px)', animation: 'maint-drift1 16s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '8%', right: '-10%', width: 620, height: 620, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(T.primary, .18)} 0%, transparent 70%)`,
        filter: 'blur(10px)', animation: 'maint-drift2 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-14%', left: '22%', width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(T.blue, .12)} 0%, transparent 70%)`,
        filter: 'blur(10px)', animation: 'maint-drift1 24s ease-in-out infinite 3s',
      }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .02, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
    </div>
  )
}

// ── Pill button (как в Landing.jsx) ────────────────────────────
function Pill({ children, onClick, variant = 'primary', disabled, style, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, fontSize: 14, fontWeight: 800, letterSpacing: '-0.1px',
    cursor: disabled ? 'default' : 'pointer', border: 'none', fontFamily: FONT, whiteSpace: 'nowrap',
    opacity: disabled ? .65 : 1,
  }
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.orange} 0%, ${T.orange} 55%, ${T.orangeDeep} 100%)`, color: '#fff', boxShadow: `0 8px 20px ${hexToRgba(T.orange, .2)}` },
    glass: { background: 'rgba(255,255,255,.05)', border: `1px solid ${T.glassBorder}`, color: T.ink },
  }
  return (
    <button
      className={`maint-btn${variant === 'primary' ? ' maint-btn-primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── maintenance.log — живой мини-консоль статуса работ ─────────
const LOG_FEED = [
  { tag: 'OK', color: T.green, text: 'Резервная копия базы данных создана' },
  { tag: 'INFO', color: T.blue, text: 'Обновление схемы данных...' },
  { tag: 'WARN', color: T.yellow, text: 'Перезапуск фоновых служб' },
  { tag: 'OK', color: T.green, text: 'Проверка целостности завершена' },
  { tag: 'INFO', color: T.primary, text: 'Синхронизация ролей и прав доступа' },
  { tag: 'OK', color: T.green, text: 'Кэш очищен' },
]

function MaintenanceConsole() {
  const [lines, setLines] = useState([])
  const idx = useRef(0)
  const boxRef = useRef(null)

  useEffect(() => {
    const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const push = () => {
      const entry = LOG_FEED[idx.current % LOG_FEED.length]
      idx.current += 1
      setLines((prev) => {
        const next = [...prev, { ...entry, time: now(), key: idx.current }]
        return next.length > 5 ? next.slice(next.length - 5) : next
      })
    }
    push()
    const t = setInterval(push, 2200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  return (
    <div className="maint-widget" style={{
      position: 'relative', overflow: 'hidden', textAlign: 'left',
      background: 'rgba(255,255,255,.015)', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)',
    }}>
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, height: 60, background: `linear-gradient(180deg, transparent, ${hexToRgba(T.orange, .06)}, transparent)`, animation: 'maint-scan 5s linear infinite', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: T.orange, display: 'flex' }}>{IC.terminal(13)}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', color: T.ink2, textTransform: 'uppercase' }}>
            maintenance.log
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', color: T.orange }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.orange, boxShadow: `0 0 6px ${T.orange}`, animation: 'maint-pulse-dot 2s ease infinite' }} />
          В РАБОТЕ
        </div>
      </div>
      <div ref={boxRef} style={{ height: 150, overflow: 'hidden', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {lines.map((l, i) => (
          <div key={l.key} style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            fontFamily: FONT_MONO, fontSize: 11.5, lineHeight: '24px',
            animation: 'maint-logIn .35s ease both',
            opacity: 0.35 + (i / Math.max(lines.length - 1, 1)) * 0.65,
          }}>
            <span style={{ color: T.ink3, flexShrink: 0 }}>{l.time}</span>
            <span style={{ color: l.color, fontWeight: 700, flexShrink: 0, width: 40 }}>[{l.tag}]</span>
            <span style={{ color: T.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.text}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_MONO, fontSize: 11.5, color: T.ink3, marginTop: 2 }}>
          <span>&gt;</span>
          <span style={{ width: 7, height: 13, background: T.orange, animation: 'maint-blink 1s step-end infinite' }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Страница технического обслуживания в стиле Landing.jsx.
 * Показывается всем пользователям (в т.ч. незалогиненным), пока в App.jsx
 * включён флаг MAINTENANCE_MODE.
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
    reloadTimeout.current = setTimeout(() => window.location.reload(), 450)
  }

  // автопроверка — сама перезагружает страницу раз в AUTO_CHECK_SECONDS,
  // чтобы если статус тех.обслуживания сняли, пользователю не пришлось нажимать вручную
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
    <div style={{ position: 'relative', minHeight: '100vh', background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)', fontFamily: FONT, color: T.ink, overflowX: 'hidden' }}>

      <style>{`
        @keyframes maint-fadeUp    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes maint-spin      { to{transform:rotate(360deg)} }
        @keyframes maint-drift1    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,26px) scale(1.06)} }
        @keyframes maint-drift2    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,18px) scale(1.04)} }
        @keyframes maint-pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:0} }
        @keyframes maint-scan      { 0%{top:-60px} 100%{top:220px} }
        @keyframes maint-blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes maint-logIn     { from{opacity:0;transform:translateY(6px)} }
        @keyframes maint-glow-pulse{ 0%,100%{opacity:.55} 50%{opacity:1} }

        * { box-sizing: border-box; }

        .maint-btn { transition: transform .15s cubic-bezier(.2,.8,.2,1), box-shadow .15s, opacity .15s; }
        .maint-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .maint-btn:active:not(:disabled) { transform: scale(.97); opacity: .92; }
        .maint-btn-primary:hover:not(:disabled) { transform: scale(1.012); box-shadow: 0 10px 26px ${hexToRgba(T.orange, .3)}, 0 0 28px ${hexToRgba(T.orange, .35)}; }

        .maint-widget { transition: transform .3s cubic-bezier(.2,.8,.2,1); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${hexToRgba(T.primary, .35)}; border-radius:3px; }

        @media (max-width: 640px) {
          .maint-title { font-size: clamp(28px, 8vw, 40px) !important; letter-spacing: -1px !important; }
        }
      `}</style>

      <Aurora />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

          {/* Логотип */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 34, animation: 'maint-fadeUp .5s cubic-bezier(.2,.8,.2,1) both' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11, flexShrink: 0,
              background: 'rgba(255,255,255,.05)', border: `1px solid ${T.glassBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.orange,
            }}>
              {IC.shield(18)}
            </div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>
              STATE<span style={{ color: T.orange }}>CORE</span>
            </span>
          </div>

          {/* Glow blob за заголовком */}
          <div aria-hidden style={{
            position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
            width: 480, height: 240, borderRadius: '50%', maxWidth: '90vw',
            background: `radial-gradient(ellipse, ${hexToRgba(T.orange, .16)} 0%, transparent 70%)`,
            filter: 'blur(20px)', zIndex: -1, animation: 'maint-glow-pulse 4.5s ease-in-out infinite',
          }} />

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase',
            color: hexToRgba(T.orange, .8), marginBottom: 18,
            animation: 'maint-fadeUp .6s cubic-bezier(.2,.8,.2,1) .05s both',
          }}>
            Техническое обслуживание
          </div>

          {/* Иконка-шестерёнка */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 26px',
            background: hexToRgba(T.orange, .12), color: T.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'maint-fadeUp .6s cubic-bezier(.2,.8,.2,1) .08s both',
          }}>
            <span style={{ display: 'flex', animation: 'maint-spin 7s linear infinite' }}>{IC.gear(30)}</span>
          </div>

          {/* Headline */}
          <h1 className="maint-title" style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900,
            letterSpacing: '-1.4px', lineHeight: 1.15, margin: '0 0 18px', color: T.ink,
            animation: 'maint-fadeUp .7s cubic-bezier(.2,.8,.2,1) .1s both',
          }}>
            Мы улучшаем <span style={{ color: T.orange, textShadow: `0 0 40px ${hexToRgba(T.orange, .45)}` }}>STATECORE</span>
          </h1>

          {/* Описание */}
          <p style={{
            fontSize: 15, color: T.ink2, lineHeight: 1.65, maxWidth: 420, margin: '0 auto 28px',
            animation: 'maint-fadeUp .7s cubic-bezier(.2,.8,.2,1) .15s both',
          }}>
            {message || 'Ведутся плановые технические работы. Панель временно недоступна для всех пользователей — совсем скоро всё снова заработает в штатном режиме.'}
          </p>

          {eta && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 12.5, fontWeight: 600, color: T.ink2,
              background: 'rgba(255,255,255,.05)', border: `1px solid ${T.glassBorder}`,
              borderRadius: 999, padding: '8px 16px', marginBottom: 28,
              animation: 'maint-fadeUp .7s cubic-bezier(.2,.8,.2,1) .18s both',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.orange, boxShadow: `0 0 6px ${T.orange}`, animation: 'maint-pulse-dot 2s ease infinite' }} />
              Ориентировочно вернёмся: {eta}
            </div>
          )}

          {/* Консоль статуса */}
          <div style={{ marginBottom: 30, animation: 'maint-fadeUp .7s cubic-bezier(.2,.8,.2,1) .2s both' }}>
            <MaintenanceConsole />
          </div>

          {/* Кнопка обновления */}
          <div style={{ animation: 'maint-fadeUp .7s cubic-bezier(.2,.8,.2,1) .25s both' }}>
            <Pill variant="primary" onClick={doReload} disabled={checking} style={{ width: '100%', maxWidth: 320, padding: 15, fontSize: 14.5 }}>
              {checking ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'maint-spin .7s linear infinite' }} /> Проверяем...</>
              ) : (
                <>{IC.refresh(16)} Проверить снова</>
              )}
            </Pill>
            <p style={{ marginTop: 14, fontSize: 11.5, color: T.ink3 }}>
              Автоматическая проверка через {secondsLeft} сек.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}