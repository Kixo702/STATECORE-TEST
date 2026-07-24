import { useState, useEffect, useRef } from 'react'

/**
 * Приветственный тост в левом нижнем углу экрана.
 * Показывается один раз при заходе авторизованного пользователя,
 * сам закрывается через `duration` мс (прогресс-линия внизу отражает
 * оставшееся время), либо закрывается вручную по клику — в обоих
 * случаях плавно исчезает через CSS-transition, а не резко пропадает.
 *
 * Использование:
 *   {showWelcome && (
 *     <WelcomeToast nickname={user.nickname || user.name} onDone={() => setShowWelcome(false)} />
 *   )}
 */
export default function WelcomeToast({ nickname, duration = 5000, onDone }) {
  const [visible, setVisible] = useState(false)   // управляет opacity/transform (вход/выход)
  const [progress, setProgress] = useState(100)   // % оставшегося времени для полоски
  const closingRef = useRef(false)
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const timerRef = useRef(null)

  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    // Ждём окончания transition (см. transitionDuration ниже) и только потом
    // сообщаем родителю, что тост можно размонтировать.
    setTimeout(() => onDone?.(), 320)
  }

  useEffect(() => {
    // Небольшая задержка перед появлением — чтобы transition сыграл от начального состояния
    const showTimer = setTimeout(() => setVisible(true), 20)

    startRef.current = performance.now()
    const tick = (now) => {
      const elapsed = now - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct <= 0) {
        close()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      clearTimeout(showTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  return (
    <div
      role="status"
      onClick={close}
      className="fixed bottom-5 left-5 z-[100] cursor-pointer select-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.96)',
        transition: 'opacity .32s ease, transform .32s cubic-bezier(.34,1.4,.64,1)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
        style={{
          background: 'linear-gradient(155deg, #141b2e 0%, #0d1120 100%)',
          boxShadow: '0 20px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,140,0,.06)',
          minWidth: 260,
          maxWidth: 320,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,.15) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          {/* Иконка-аватар */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,140,0,.14)', color: '#ff8c00', boxShadow: 'inset 0 0 0 1px rgba(255,140,0,.25)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white leading-tight truncate">
              Здравствуйте, {nickname}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Рады видеть вас снова</p>
          </div>

          {/* Кнопка закрытия */}
          <button
            onClick={(e) => { e.stopPropagation(); close() }}
            className="ml-auto shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Закрыть"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Прогресс-линия автозакрытия */}
        <div className="relative h-[3px] w-full bg-white/[0.05]">
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ff8c00, #ff5500)',
              transition: 'width .05s linear',
            }}
          />
        </div>
      </div>
    </div>
  )
}