import { useState, useEffect, useRef } from 'react'
import banner from '../assets/banner.png'
import viteLogo from '../assets/vite.svg';

// ── Icons ─────────────────────────────────────────────────────
const IC = {
  shield: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  crown: (s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/>
    </svg>
  ),
  user: (s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  users: (s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  lock: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  at: (s=13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
    </svg>
  ),
  arrow: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  chevLeft: (s=15) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  x: (s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  check: (s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  building: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-8h6v8"/>
    </svg>
  ),
  bolt: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  eye: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  warning: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  list: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  chart: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  clock: (s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  star: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  plus: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  minus: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  mail: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  discord: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.113 18.1.133 18.114a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  ),
}

// ── Particles ─────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    let raf
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.6 + .4, o: Math.random() * .35 + .08,
    }))
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,140,0,${p.o})`; ctx.fill()
      })
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(255,140,0,${.07 * (1 - d / 120)})`
          ctx.lineWidth = .6; ctx.stroke()
        }
      }))
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}/>
}

// ── Counter animation ──────────────────────────────────────────
function Counter({ to, duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        obs.disconnect()
        let start = null
        const step = ts => {
          if (!start) start = ts
          const p = Math.min((ts - start) / duration, 1)
          setVal(Math.floor(p * to))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: .3 })
    if (el) obs.observe(el)
    return () => obs.disconnect()
  }, [to, duration])
  return <span ref={ref}>{val}</span>
}

// ── FAQ item ───────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,.06)',
        padding: '20px 0',
        cursor: 'pointer',
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <p style={{ margin:0, fontSize:'15px', fontWeight:700, color: open ? '#ff8c00' : '#e8edf3', transition:'color .2s' }}>
          {q}
        </p>
        <div style={{
          flexShrink:0, width:28, height:28, borderRadius:'8px',
          background: open ? 'rgba(255,140,0,.15)' : 'rgba(255,255,255,.05)',
          border: `1px solid ${open ? 'rgba(255,140,0,.3)' : 'rgba(255,255,255,.08)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: open ? '#ff8c00' : '#9aa3b0', transition:'all .2s',
        }}>
          {open ? IC.minus(14) : IC.plus(14)}
        </div>
      </div>
      {open && (
        <p style={{
          margin:'12px 0 0', fontSize:'13px', color:'#7a8799', lineHeight:1.7,
          animation:'land-fadeUp .2s ease both',
        }}>{a}</p>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function Landing({ onLogin, currentUser, onLogout }) {
  const [step, setStep] = useState('hero')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [remember, setRemember] = useState(true)
  // registration fields
  const [regLogin, setRegLogin] = useState('')
  const [regNickname, setRegNickname] = useState('')
  const [regVk, setRegVk] = useState('')
  const [regForum, setRegForum] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const openModal = (initial = 'hero') => { setStep(initial); setShowModal(true); setTimeout(() => setModalVisible(true), 10) }
  const closeModal = () => {
    setModalVisible(false)
    setTimeout(() => { setShowModal(false); setStep('hero'); setError(''); setLogin(''); setPassword('') }, 320)
  }

  const handleRegister = () => {
    setRegError('')
    if (!regLogin.trim()) {
      setRegError('Укажите логин для входа')
      return
    }
    if (regLogin.trim().length > 10) {
      setRegError('Логин не может быть длиннее 10 символов')
      return
    }
    if (!regNickname.trim() || !regPassword.trim() || !regPassword2.trim()) {
      setRegError('Заполните все обязательные поля')
      return
    }
    if (regPassword !== regPassword2) {
      setRegError('Пароли не совпадают')
      return
    }
    setRegLoading(true)
    try {
      const raw = localStorage.getItem('sc_users')
      const users = raw ? JSON.parse(raw) : []
      const loginId = regLogin.trim()
      if (users.find(u => u.login === loginId)) {
        setRegError('Аккаунт с таким логином уже существует')
        setRegLoading(false)
        return
      }
      const normalize = s => (s || '').trim().replace(/\/+$/, '')
      const genUid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2,8))
      const newUser = {
        id: genUid(),
        login: loginId,
        vk: normalize(regVk),
        forum: normalize(regForum),
        password: regPassword,
        nickname: regNickname.trim(),
        registeredAt: new Date().toISOString(),
        roleName: 'Игрок',
      }
      users.push(newUser)
      localStorage.setItem('sc_users', JSON.stringify(users))
      // auto-login
      const userData = { id: newUser.id, login: newUser.login, nickname: newUser.nickname, roleName: 'Игрок', vk: newUser.vk, forum: newUser.forum, registeredAt: newUser.registeredAt }
      localStorage.setItem('sc_user', JSON.stringify(userData))
      setSuccess(true)
      setTimeout(() => { onLogin && onLogin(userData) }, 700)
    } catch (err) {
      console.error(err)
      setRegError('Ошибка при регистрации')
    } finally {
      setRegLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Проверка в локальном хранилище: база пользователей `sc_users`
      const raw = localStorage.getItem('sc_users')
      const users = raw ? JSON.parse(raw) : []
      const normalize = s => (s || '').trim().replace(/\/+$/, '').toLowerCase()
      const l = normalize(login)
      const found = users.find(u => (u.login && normalize(u.login) === l) && u.password === password)
      if (!found) {
        setError('Неверный логин или пароль')
        return
      }
      const userData = {
        id: found.id,
        login: found.login || found.vk || found.forum,
        nickname: found.nickname || found.login || found.vk || found.forum,
        roleName: found.roleName || 'Игрок',
        role: found.role || 'player',
        vk: found.vk || '',
        forum: found.forum || '',
        registeredAt: found.registeredAt || null,
      }
      if (remember) localStorage.setItem('sc_user', JSON.stringify(userData))
      else localStorage.removeItem('sc_user')
      setSuccess(true)
      setTimeout(() => { onLogin && onLogin(userData) }, 700)
    } catch (err) {
      console.error(err)
      setError('Ошибка при проверке учётных данных')
    } finally {
      setLoading(false)
    }
  }

  

  const features = [
    { icon: IC.eye(22), color:'#ff8c00', title:'Мониторинг структур', desc:'Отслеживание всех государственных организаций в режиме реального времени. Полная история изменений и событий.' },
    { icon: IC.crown(22), color:'#f59e0b', title:'Назначение лидеров', desc:'Управление должностями лидеров и заместителей. Быстрое назначение и снятие с должности одним действием.' },
    { icon: IC.warning(22), color:'#ef4444', title:'Система выговоров', desc:'Ведение реестра устных и строгих выговоров. Автоматическая история санкций для каждой структуры.' },
    { icon: IC.list(22), color:'#8b5cf6', title:'Реестр запретов', desc:'Чёрный список лиц с запретом на вступление в государственные организации. Полная актуальность данных.' },
    { icon: IC.chart(22), color:'#06b6d4', title:'Статистика и отчёты', desc:'Сводная аналитика по всем структурам. Графики, тренды и сводки в удобном формате для руководства.' },
    { icon: IC.clock(22), color:'#10b981', title:'Логи действий', desc:'Полная история всех административных действий с временными метками. Прозрачность и подотчётность.' },
  ]

  const orgs = [
    { name:'LSPD', label:'Полиция Лос-Сантоса', color:'#3b82f6', active:true },
    { name:'MCLS', label:'Больница Лос-Сантоса', color:'#10b981', active:true },
    { name:'FBI', label:'Федеральное бюро', color:'#8b5cf6', active:true },
    { name:'GOV', label:'Правительство', color:'#f59e0b', active:true },
    { name:'LVmPD', label:'Полиция Лас-Вентурас', color:'#06b6d4', active:false },
    { name:'SFPD', label:'Полиция Сан-Фиерро', color:'#64748b', active:false },
    { name:'MCLV', label:'Больница Лас-Вентурас', color:'#ec4899', active:false },
  ]

  const stats = [
    { val:12, suffix:'', label:'Организаций под контролем' },
    { val:9, suffix:'', label:'Активных лидеров' },
    { val:247, suffix:'+', label:'Обработано запросов' },
    { val:24, suffix:'/7', label:'Мониторинг системы' },
  ]

  const faq = [
    { q:'Как получить доступ к системе?', a:'Учётные данные выдаются исключительно Главным Следящим. Обратитесь к вышестоящему руководству для получения логина и пароля.' },
    { q:'Какие роли предусмотрены в системе?', a:'На данный момент полный доступ имеет Следящая Администрация. В разработке находятся роли Лидера организации и Заместителя с ограниченным функционалом.' },
    { q:'Как подать запрос на внесение в реестр запретов?', a:'Запрос подаётся через Следящую Администрацию. После проверки и согласования запись вносится в реестр с указанием причины и даты.' },
    { q:'Можно ли оспорить выговор или запрет?', a:'Да, любое решение может быть оспорено через вышестоящее руководство Следящей Администрации. Все апелляции рассматриваются в установленные сроки.' },
    { q:'Как часто обновляются данные в системе?', a:'Данные обновляются в режиме реального времени. Все действия администраторов немедленно отражаются в логах и статистике.' },
  ]

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:'#0b0f19', fontFamily:"'Segoe UI', system-ui, sans-serif", color:'#e8edf3', overflowX:'hidden' }}>

      <style>{`
        @keyframes land-fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes land-fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes land-scaleIn  { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
        @keyframes land-spin     { to{transform:rotate(360deg)} }
        @keyframes land-glow     { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes land-float    { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(1deg)} }
        @keyframes land-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes land-success  { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes land-pulse-dot{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:0} }
        @keyframes land-ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .land-btn { transition: all .18s cubic-bezier(.34,1.56,.64,1); cursor: pointer; }
        .land-btn:hover { transform: translateY(-2px) scale(1.02); }
        .land-btn:active { transform: scale(.98); }

        .land-role-card { transition: all .22s cubic-bezier(.34,1.56,.64,1); cursor: pointer; }
        .land-role-card:hover { transform: translateY(-4px) scale(1.02); }
        .land-role-card:active { transform: scale(.98); }

        .land-input { transition: border-color .15s, box-shadow .15s, background .15s; }
        .land-input:focus {
          outline: none;
          border-color: rgba(255,140,0,.6) !important;
          background: rgba(255,255,255,.07) !important;
          box-shadow: 0 0 0 3px rgba(255,140,0,.1) !important;
        }
        .land-input::placeholder { color: rgba(255,255,255,.22); }

        .land-shimmer-text {
          background: linear-gradient(90deg, #e8edf3 0%, #ff8c00 38%, #ffb347 55%, #e8edf3 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: land-shimmer 4s linear infinite;
        }

        .land-feature-card {
          transition: all .25s ease;
          cursor: default;
        }
        .land-feature-card:hover {
          border-color: rgba(255,140,0,.2) !important;
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,.4);
        }

        .land-org-tag { transition: all .2s ease; }
        .land-org-tag:hover { transform: scale(1.06); }

        .land-ticker-wrap { overflow: hidden; width: 100%; }
        .land-ticker-inner {
          display: flex; gap: 0; width: max-content;
          animation: land-ticker 30s linear infinite;
        }
        .land-ticker-inner:hover { animation-play-state: paused; }

        .land-nav-link { transition: color .15s; }
        .land-nav-link:hover { color: #ff8c00 !important; }

        .land-section { opacity:0; transform:translateY(40px); transition: opacity .7s ease, transform .7s ease; }
        .land-section.visible { opacity:1; transform:translateY(0); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0f19; }
        ::-webkit-scrollbar-thumb { background: rgba(255,140,0,.3); border-radius:3px; }
      `}</style>

      <Particles />

      {/* BACKGROUND GLOWS */}
      <div style={{ position:'fixed', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:900, height:900, background:'radial-gradient(circle, rgba(255,140,0,.06) 0%, transparent 65%)', pointerEvents:'none', zIndex:0, animation:'land-glow 6s ease-in-out infinite' }}/>
      <div style={{ position:'fixed', top:-200, left:-200, width:700, height:700, background:'radial-gradient(circle, rgba(255,60,0,.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }}/>
      <div style={{ position:'fixed', bottom:-300, right:-200, width:600, height:600, background:'radial-gradient(circle, rgba(255,140,0,.05) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }}/>
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(255,140,0,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,140,0,.025) 1px, transparent 1px)', backgroundSize:'64px 64px' }}/>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        background: scrolled ? 'rgba(11,15,25,.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : '1px solid transparent',
        transition:'all .3s ease',
        padding:'0 40px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        height:64,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#ff8c00',
          }}>
            <img
              src={viteLogo}
              alt="logo"
              style={{ width:100, height:100 }}
            />
          </div>
          <span style={{ fontSize:15, fontWeight:900, letterSpacing:'-0.3px' }}>
            STATE <span style={{ color:'#ff8c00' }}>CORE</span>
          </span>
        </div>

        {/* Nav Links */}
        <div style={{ display:'flex', gap:32, fontSize:13, color:'#7a8799', fontWeight:500 }}>
          {['Возможности','Организации','FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="land-nav-link" style={{ color:'#7a8799', textDecoration:'none' }}>{l}</a>
          ))}
        </div>

        {/* CTA / Profile */}
        {currentUser ? (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'rgba(255,140,0,.08)', border:'1px solid rgba(255,140,0,.2)',
              borderRadius:12, padding:'7px 14px',
            }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background:'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:900, color:'#fff',
              }}>
                {(currentUser.nickname || currentUser.login || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#e8edf3', lineHeight:1.1 }}>
                  {currentUser.nickname || currentUser.login}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,140,0,.8)', fontWeight:600 }}>
                  {currentUser.roleName}
                </div>
              </div>
            </div>
            {onLogout && (
              <button
                className="land-btn"
                onClick={onLogout}
                style={{
                  background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                  color:'rgba(255,255,255,.5)', padding:'9px 14px', borderRadius:12,
                  fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'0.3px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(232,80,80,.4)'; e.currentTarget.style.color='#e85050' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; e.currentTarget.style.color='rgba(255,255,255,.5)' }}
              >
                Выйти
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', gap:10 }}>
            <button
              className="land-btn"
              onClick={() => openModal('login')}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)',
                border:'none', color:'#fff', padding:'9px 20px',
                borderRadius:12, fontSize:13, fontWeight:800, letterSpacing:'0.3px',
                boxShadow:'0 4px 16px rgba(255,140,0,.3)', cursor:'pointer',
              }}
            >
              Войти {IC.arrow(13)}
            </button>
            <button
              className="land-btn"
              onClick={() => openModal('register')}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#9aa3b0', padding:'9px 20px',
                borderRadius:12, fontSize:13, fontWeight:700, letterSpacing:'0.3px', cursor:'pointer'
              }}
            >
              Зарегистрироваться
            </button>
          </div>
        )}
      </nav>

      {/* BANNER */}
      <div style={{ position:'relative', zIndex:1, paddingTop:64 }}>
        <div style={{ padding:'24px 40px 0', maxWidth:1280, margin:'0 auto' }}>
          <div style={{ position:'relative', borderRadius:20, overflow:'hidden', maxHeight:160 }}>
            <img src={banner} alt="banner" style={{ width:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(11,15,25,.6) 0%, transparent 40%, transparent 60%, rgba(11,15,25,.6) 100%)' }}/>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(to top, #0b0f19, transparent)' }}/>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'80px 40px 100px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center' }}>

          {/* LEFT */}
          <div>
            {/* Badge */}

            <h1 style={{
              fontSize:'clamp(40px, 5vw, 68px)', fontWeight:900,
              letterSpacing:'-2.5px', lineHeight:1.04,
              margin:'0 0 20px',
              animation:'land-fadeUp .7s ease .2s both',
            }}>
              Единая платформа<br />
              <span className="land-shimmer-text">государственных</span><br />
              структур
            </h1>

            <p style={{
              fontSize:16, color:'#7a8799', lineHeight:1.7, maxWidth:480, margin:'0 0 40px',
              animation:'land-fadeUp .7s ease .3s both',
            }}>
              Мониторинг организаций, управление лидерами, система выговоров и реестр запретов — всё в одном месте для Следящей Администрации.
            </p>

            <div style={{ display:'flex', gap:14, animation:'land-fadeUp .7s ease .4s both' }}>
              <button
                className="land-btn"
                onClick={() => openModal('login')}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  background:'linear-gradient(135deg, #ff8c00 0%, #d95f00 100%)',
                  border:'none', color:'#fff', padding:'15px 32px',
                  borderRadius:14, fontSize:14, fontWeight:800, letterSpacing:'0.4px',
                  boxShadow:'0 8px 32px rgba(255,140,0,.35)', cursor:'pointer',
                }}
              >
                Войти в систему {IC.arrow(15)}
              </button>
              <a
                href="#возможности"
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                  color:'#9aa3b0', padding:'15px 24px', borderRadius:14,
                  fontSize:14, fontWeight:700, textDecoration:'none', transition:'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,140,0,.3)'; e.currentTarget.style.color='#e8edf3' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; e.currentTarget.style.color='#9aa3b0' }}
              >
                Узнать больше
              </a>
            </div>
          </div>

          {/* RIGHT — dashboard card */}
          <div style={{ animation:'land-float 6s ease-in-out infinite' }}>
            <div style={{
              background:'linear-gradient(160deg, #111827 0%, #0d1424 100%)',
              border:'1px solid rgba(255,255,255,.07)',
              borderRadius:24, padding:28,
              boxShadow:'0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,140,0,.05)',
            }}>
              {/* mini header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, color:'#5a6370', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>Мониторинг</div>
                  <div style={{ fontSize:17, fontWeight:900 }}>Обзор системы</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {['#ef4444','#f59e0b','#10b981'].map(c => (
                    <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:.7 }}/>
                  ))}
                </div>
              </div>

              {/* mini stat grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                {[
                  { label:'Организаций', val:12, color:'#3b82f6' },
                  { label:'Активных лидеров', val:9, color:'#ff8c00' },
                  { label:'Выговоров', val:21, color:'#ef4444' },
                  { label:'В реестре', val:28, color:'#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{
                    background:'rgba(0,0,0,.25)', borderRadius:12, padding:'12px 14px',
                    border:'1px solid rgba(255,255,255,.04)',
                  }}>
                    <div style={{ fontSize:10, color:'#5a6370', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* mini activity */}
              <div style={{ fontSize:11, color:'#5a6370', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 }}>Последние действия</div>
              {[
                { admin:'Robert_Kamiya', action:'Выдал строгий выговор', target:'LSPD', time:'13:42' },
                { admin:'Robert_Kamiya', action:'Назначил лидера', target:'FBI', time:'12:17' },
                { admin:'Robert_Kamiya', action:'Добавил запрет', target:'Nick_Ross', time:'11:05' },
              ].map((l, i) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  background:'rgba(0,0,0,.2)', borderRadius:10, padding:'9px 12px', marginBottom:6,
                  fontSize:12,
                }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#c8d0db', marginBottom:1 }}>{l.admin}</div>
                    <div style={{ color:'#5a6370' }}>{l.action}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, color:'#ff8c00' }}>{l.target}</div>
                    <div style={{ color:'#3d4755', fontSize:10 }}>{l.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:1,
          marginTop:80,
          background:'rgba(255,255,255,.05)',
          borderRadius:20, overflow:'hidden',
          border:'1px solid rgba(255,255,255,.06)',
          animation:'land-fadeUp .8s ease .6s both',
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              padding:'28px 32px',
              background:'rgba(11,15,25,.8)',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,.05)' : 'none',
              textAlign:'center',
            }}>
              <div style={{ fontSize:'clamp(32px, 4vw, 48px)', fontWeight:900, color:'#ff8c00', letterSpacing:'-1px', lineHeight:1 }}>
                <Counter to={s.val} />{s.suffix}
              </div>
              <div style={{ fontSize:12, color:'#5a6370', letterSpacing:'1px', textTransform:'uppercase', marginTop:8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position:'relative', zIndex:1, overflow:'hidden', padding:'20px 0', borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(0,0,0,.2)' }}>
        <div className="land-ticker-inner">
          {[...Array(2)].map((_, ri) => (
            <div key={ri} style={{ display:'flex', gap:0 }}>
              {['LSPD','FBI','LSFD','GOV','LSMC','FIB','ARMY','COURT','LSPD','FBI','LSFD','GOV'].map((t, i) => (
                <div key={`${ri}-${i}`} style={{ display:'flex', alignItems:'center', gap:16, padding:'0 40px', whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:12, fontWeight:800, letterSpacing:'2px', color:'rgba(255,140,0,.5)', textTransform:'uppercase' }}>{t}</span>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'rgba(255,140,0,.2)' }}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="возможности" style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'100px 40px' }}>

        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,140,0,.08)', border:'1px solid rgba(255,140,0,.2)', borderRadius:100, padding:'5px 14px', marginBottom:20, fontSize:11, fontWeight:700, color:'#ff8c00', letterSpacing:'2px', textTransform:'uppercase' }}>
            {IC.bolt(12)} Возможности
          </div>
          <h2 style={{ fontSize:'clamp(28px, 4vw, 48px)', fontWeight:900, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:16 }}>
            Всё что нужно<br/>
            <span style={{ color:'#ff8c00' }}>следящему администратору</span>
          </h2>
          <p style={{ fontSize:15, color:'#7a8799', maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>
            Единая система для мониторинга, управления и контроля государственных структур города
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="land-feature-card"
              style={{
                background:'linear-gradient(160deg, #111827 0%, #0d1220 100%)',
                border:'1px solid rgba(255,255,255,.06)',
                borderRadius:20, padding:'28px 24px',
                animation:`land-fadeUp .6s ease ${i * .08}s both`,
              }}
            >
              <div style={{
                width:46, height:46, borderRadius:13, marginBottom:18,
                background:`rgba(${f.color === '#ff8c00' ? '255,140,0' : f.color === '#f59e0b' ? '245,158,11' : f.color === '#ef4444' ? '239,68,68' : f.color === '#8b5cf6' ? '139,92,246' : f.color === '#06b6d4' ? '6,182,212' : '16,185,129'},.12)`,
                border:`1px solid ${f.color}25`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: f.color,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize:16, fontWeight:800, marginBottom:10, color:'#e8edf3' }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'#5a6370', lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ORGANIZATIONS ── */}
      <section id="организации" style={{ position:'relative', zIndex:1, background:'rgba(0,0,0,.2)', borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)', padding:'80px 40px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:100, padding:'5px 14px', marginBottom:20, fontSize:11, fontWeight:700, color:'#3b82f6', letterSpacing:'2px', textTransform:'uppercase' }}>
                {IC.building(12)} Организации
              </div>
              <h2 style={{ fontSize:'clamp(28px, 3.5vw, 44px)', fontWeight:900, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:16 }}>
                Под контролем<br/>
                <span style={{ color:'#ff8c00' }}>12 структур</span>
              </h2>
              <p style={{ fontSize:14, color:'#7a8799', lineHeight:1.7, marginBottom:32, maxWidth:420 }}>
                Система охватывает все государственные организации города. Каждая структура имеет своего лидера, состав и историю действий.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { icon: IC.check(14), text:'Полный реестр лидеров и заместителей' },
                  { icon: IC.check(14), text:'История выговоров и санкций' },
                  { icon: IC.check(14), text:'Вакантные должности под контролем' },
                  { icon: IC.check(14), text:'Запреты на вступление в реестре' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ color:'#10b981', flexShrink:0 }}>{item.icon}</div>
                    <span style={{ fontSize:14, color:'#9aa3b0' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {orgs.map(org => (
                  <div
                    key={org.name}
                    className="land-org-tag"
                    style={{
                      background: org.active ? `rgba(${org.color === '#3b82f6' ? '59,130,246' : org.color === '#ef4444' ? '239,68,68' : org.color === '#10b981' ? '16,185,129' : org.color === '#8b5cf6' ? '139,92,246' : org.color === '#f59e0b' ? '245,158,11' : org.color === '#06b6d4' ? '6,182,212' : org.color === '#64748b' ? '100,116,139' : '236,72,153'},.1)` : 'rgba(255,255,255,.03)',
                      border: `1px solid ${org.active ? org.color + '30' : 'rgba(255,255,255,.06)'}`,
                      borderRadius:14, padding:'16px 18px',
                      display:'flex', alignItems:'center', gap:12,
                      opacity: org.active ? 1 : .45,
                    }}
                  >
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background: org.active ? `${org.color}18` : 'rgba(255,255,255,.04)',
                      border: `1px solid ${org.active ? org.color + '25' : 'rgba(255,255,255,.06)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:900, color: org.active ? org.color : '#3d4755',
                      letterSpacing:'.5px',
                    }}>
                      {org.name.slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color: org.active ? '#e8edf3' : '#4a5568', marginBottom:2 }}>{org.name}</div>
                      <div style={{ fontSize:11, color: org.active ? '#7a8799' : '#3d4755' }}>{org.label}</div>
                    </div>
                    {org.active && (
                      <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:org.color, boxShadow:`0 0 8px ${org.color}`, flexShrink:0 }}/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'80px 40px' }}>
        <div style={{
          background:'linear-gradient(135deg, rgba(255,140,0,.15) 0%, rgba(255,80,0,.08) 50%, rgba(11,15,25,0) 100%)',
          border:'1px solid rgba(255,140,0,.2)',
          borderRadius:28, padding:'60px 56px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:40,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-80, right:100, width:300, height:300, background:'radial-gradient(circle, rgba(255,140,0,.12) 0%, transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#ff8c00', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:12 }}>
              🔐 Закрытый доступ
            </div>
            <h2 style={{ fontSize:'clamp(24px, 3vw, 38px)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.15, marginBottom:12 }}>
              Готовы войти в систему?
            </h2>
            <p style={{ fontSize:14, color:'#7a8799', maxWidth:420, lineHeight:1.65 }}>
              Доступ предоставляется исключительно сотрудникам Следящей Администрации. Учётные данные выдаются Главным Следящим.
            </p>
          </div>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
            <button
              className="land-btn"
              onClick={() => openModal('login')}
              style={{
                display:'flex', alignItems:'center', gap:10,
                background:'linear-gradient(135deg, #ff8c00 0%, #d95f00 100%)',
                border:'none', color:'#fff', padding:'16px 36px',
                borderRadius:16, fontSize:15, fontWeight:800, letterSpacing:'0.4px',
                boxShadow:'0 8px 32px rgba(255,140,0,.4)', cursor:'pointer', whiteSpace:'nowrap',
              }}
            >
              {IC.shield(16)} Войти в систему
            </button>
            <p style={{ fontSize:11, color:'#3d4755', textAlign:'center', letterSpacing:'.3px' }}>
              Только для авторизованных сотрудников
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ position:'relative', zIndex:1, maxWidth:800, margin:'0 auto', padding:'0 40px 100px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:100, padding:'5px 14px', marginBottom:20, fontSize:11, fontWeight:700, color:'#7a8799', letterSpacing:'2px', textTransform:'uppercase' }}>
            Вопросы и ответы
          </div>
          <h2 style={{ fontSize:'clamp(24px, 3.5vw, 42px)', fontWeight:900, letterSpacing:'-1.5px' }}>
            FAQ
          </h2>
        </div>
        <div style={{ background:'rgba(17,24,39,.6)', border:'1px solid rgba(255,255,255,.06)', borderRadius:20, padding:'8px 28px' }}>
          {faq.map((item, i) => <FaqItem key={i} {...item} />)}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        position:'relative', zIndex:1,
        borderTop:'1px solid rgba(255,255,255,.05)',
        background:'rgba(0,0,0,.3)',
        padding:'48px 40px 32px',
      }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:48 }}>

            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, rgba(255,140,0,.25), rgba(255,80,0,.12))', border:'1px solid rgba(255,140,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', color:'#ff8c00' }}>
                  {IC.shield(16)}
                </div>
                <span style={{ fontSize:15, fontWeight:900 }}>ГС <span style={{ color:'#ff8c00' }}>Портал</span></span>
              </div>
              <p style={{ fontSize:13, color:'#4a5568', lineHeight:1.7, maxWidth:280, marginBottom:20 }}>
                Единая система мониторинга и управления государственными структурами. Разработано для Следящей Администрации.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                {[IC.discord(16), IC.mail(16)].map((icon, i) => (
                  <div key={i} style={{
                    width:34, height:34, borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#5a6370', cursor:'pointer', transition:'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,140,0,.3)'; e.currentTarget.style.color='#ff8c00' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.color='#5a6370' }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Col 1 */}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'#e8edf3', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Система</div>
              {['Мониторинг','Организации','Реестр запретов','Логи действий'].map(l => (
                <div key={l} style={{ fontSize:13, color:'#4a5568', marginBottom:10, cursor:'pointer', transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#9aa3b0'}
                  onMouseLeave={e => e.currentTarget.style.color='#4a5568'}
                >{l}</div>
              ))}
            </div>

            {/* Col 2 */}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'#e8edf3', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Роли</div>
              {['Следящий Администратор','Главный Следящий','Лидер организации','Заместитель'].map(l => (
                <div key={l} style={{ fontSize:13, color:'#4a5568', marginBottom:10, cursor:'pointer', transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#9aa3b0'}
                  onMouseLeave={e => e.currentTarget.style.color='#4a5568'}
                >{l}</div>
              ))}
            </div>

            {/* Col 3 */}
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'#e8edf3', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Информация</div>
              {['FAQ','Правила системы','Контакты','Обратная связь'].map(l => (
                <div key={l} style={{ fontSize:13, color:'#4a5568', marginBottom:10, cursor:'pointer', transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#9aa3b0'}
                  onMouseLeave={e => e.currentTarget.style.color='#4a5568'}
                >{l}</div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:12, color:'#2d3748' }}>
              © 2025 ГС Портал. Все права защищены.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px #10b981', animation:'land-pulse-dot 2s ease infinite' }}/>
              <span style={{ fontSize:12, color:'#2d3748' }}>Все системы работают штатно</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {showModal && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:100,
            background: modalVisible ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,0)',
            backdropFilter: modalVisible ? 'blur(12px)' : 'blur(0)',
            transition:'all .32s ease',
            display:'flex', alignItems:'center', justifyContent:'center', padding:24,
          }}
        >
          <div style={{
            width:'100%', maxWidth:460,
            background:'linear-gradient(160deg, #13192b 0%, #0e1220 100%)',
            border:'1px solid rgba(255,255,255,.1)', borderRadius:28, padding:32,
            boxShadow:'0 40px 100px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.07)',
            opacity: modalVisible ? 1 : 0,
            transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(20px)',
            transition:'all .32s cubic-bezier(.34,1.2,.64,1)',
            position:'relative',
          }}>
            {/* Close */}
            <button
              onClick={closeModal}
              style={{ position:'absolute', top:18, right:18, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', color:'#9aa3b0', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#e8edf3' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='#9aa3b0' }}
            >
              {IC.x(18)}
            </button>

            {/* STEP: HERO — выбор входа или регистрации */}
            {step === 'hero' && (
              <div style={{ animation:'land-scaleIn .28s ease both' }}>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'#5a6370', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>Авторизация</div>
                  <h2 style={{ margin:0, fontSize:24, fontWeight:900, letterSpacing:'-0.4px' }}>Войти или зарегистрироваться</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:'#9aa3b0' }}>Выберите действие</p>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={() => setStep('login')} className="land-btn" style={{ flex:1, padding:'12px 14px', borderRadius:12, background:'linear-gradient(135deg,#ff8c00 0%,#d95f00 100%)', color:'#fff', border:'none', fontWeight:800 }}>Войти</button>
                  <button onClick={() => setStep('register')} className="land-btn" style={{ flex:1, padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#9aa3b0', fontWeight:700 }}>Зарегистрироваться</button>
                </div>
              </div>
            )}

            {/* STEP: LOGIN */}
            {step === 'login' && !success && (
              <div style={{ animation:'land-scaleIn .28s ease both' }}>
                <button
                  onClick={() => { setStep('hero'); setError('') }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#9aa3b0', fontSize:12, cursor:'pointer', marginBottom:24, padding:0, letterSpacing:'0.5px', transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#e8edf3'}
                  onMouseLeave={e => e.currentTarget.style.color='#9aa3b0'}
                >
                  {IC.chevLeft(15)} Назад
                </button>
                <div style={{ marginBottom:28 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10, color:'#ff8c00', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                    {IC.shield(14)} Следящая Администрация
                  </div>
                  <h2 style={{ margin:0, fontSize:24, fontWeight:900, letterSpacing:'-0.4px' }}>Вход в систему</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:'#9aa3b0' }}>Введите данные, выданные Главным Следящим</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)', pointerEvents:'none', display:'flex' }}>{IC.at(13)}</span>
                    <input type="text" className="land-input" placeholder="Логин (до 10 символов)" value={login} maxLength={10} onChange={e => { setLogin(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus style={{ width:'100%', background:'rgba(255,255,255,.05)', border:`1px solid ${error ? 'rgba(232,80,80,.5)' : 'rgba(255,255,255,.1)'}`, color:'#e8edf3', padding:'12px 14px 12px 36px', borderRadius:12, fontSize:14, fontFamily:'inherit', boxShadow:'inset 0 1px 3px rgba(0,0,0,.2)' }}/>
                  </div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.3)', pointerEvents:'none', display:'flex' }}>{IC.lock(13)}</span>
                    <input type="password" className="land-input" placeholder="Пароль" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width:'100%', background:'rgba(255,255,255,.05)', border:`1px solid ${error ? 'rgba(232,80,80,.5)' : 'rgba(255,255,255,.1)'}`, color:'#e8edf3', padding:'12px 14px 12px 36px', borderRadius:12, fontSize:14, fontFamily:'inherit', boxShadow:'inset 0 1px 3px rgba(0,0,0,.2)' }}/>
                  </div>
                </div>
                {/* Remember me */}
                <div
                  style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', userSelect:'none', marginBottom:4 }}
                  onClick={() => setRemember(r => !r)}
                >
                  <div style={{
                    width:20, height:20, borderRadius:6, flexShrink:0,
                    border: `2px solid ${remember ? '#ff8c00' : 'rgba(255,255,255,.2)'}`,
                    background: remember ? 'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)' : 'rgba(255,255,255,.04)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
                    boxShadow: remember ? '0 2px 12px rgba(255,140,0,.35)' : 'none',
                  }}>
                    {remember && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize:13, color: remember ? '#e8edf3' : 'rgba(255,255,255,.45)', transition:'color .15s', fontWeight: remember ? 600 : 400 }}>
                    Запомнить меня
                  </span>
                </div>

                {error && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(232,80,80,.1)', border:'1px solid rgba(232,80,80,.3)', borderRadius:10, padding:'10px 13px', marginBottom:14, fontSize:12, color:'#e85050', animation:'land-fadeUp .2s ease both' }}>
                    {IC.x(14)} {error}
                  </div>
                )}
                <button
                  className="land-btn"
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    background: loading ? 'rgba(255,140,0,.3)' : 'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)',
                    border:'none', color:'#fff', padding:14, borderRadius:14,
                    fontSize:14, fontWeight:900, letterSpacing:'0.5px',
                    boxShadow: loading ? 'none' : '0 6px 24px rgba(255,140,0,.3)',
                    cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {loading ? (
                    <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'land-spin .7s linear infinite' }}/> Проверка…</>
                  ) : (
                    <> Войти {IC.arrow(16)} </>
                  )}
                </button>
                <p style={{ textAlign:'center', marginTop:16, fontSize:11, color:'#5a6370', letterSpacing:'0.3px' }}>
                  Учётные данные выдаются Главным Следящим
                </p>
              </div>
            )}

              {/* STEP: REGISTER */}
              {step === 'register' && !success && (
                <div style={{ animation:'land-scaleIn .28s ease both' }}>
                  <button
                    onClick={() => { setStep('hero'); setRegError('') }}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#9aa3b0', fontSize:12, cursor:'pointer', marginBottom:18, padding:0, letterSpacing:'0.5px', transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color='#e8edf3'}
                    onMouseLeave={e => e.currentTarget.style.color='#9aa3b0'}
                  >
                    {IC.chevLeft(15)} Назад
                  </button>
                  <div style={{ marginBottom:18 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10, color:'#ff8c00', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                      Регистрация
                    </div>
                    <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Создать аккаунт</h2>
                    <p style={{ margin:'6px 0 0', fontSize:13, color:'#9aa3b0' }}>Логин, никнейм, VK/Forum и пароль</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>Логин <span style={{color:'rgba(255,140,0,.7)', fontSize:10}}>макс. 10 символов</span></div>
                      <input
                        placeholder="login"
                        value={regLogin}
                        maxLength={10}
                        onChange={e => setRegLogin(e.target.value.replace(/\s/g,''))}
                        className="land-input"
                        style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:`1px solid ${regLogin.length===10?'rgba(255,140,0,.5)':'rgba(255,255,255,.1)'}`, color:'#e8edf3', fontFamily:'monospace', letterSpacing:'0.5px' }}
                      />
                      <div style={{ fontSize:10, color: regLogin.length===10?'#ff8c00':'rgba(255,255,255,.2)', textAlign:'right', marginTop:4 }}>{regLogin.length}/10</div>
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>Никнейм</div>
                      <input placeholder="Например: Kaitoramirez" value={regNickname} onChange={e => setRegNickname(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#e8edf3' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>VK (ссылка)</div>
                      <input type="url" placeholder="https://vk.com/kaitoramirez" value={regVk} onChange={e => setRegVk(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#e8edf3' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>Форум (ссылка)</div>
                      <input type="url" placeholder="https://forum.gta-mobile.ru/bestofthebest/" value={regForum} onChange={e => setRegForum(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#e8edf3' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>Пароль</div>
                      <input type="password" placeholder="Пароль" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#e8edf3' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:12, color:'#9aa3b0', marginBottom:6 }}>Повтор пароля</div>
                      <input type="password" placeholder="Повторите пароль" value={regPassword2} onChange={e => setRegPassword2(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#e8edf3' }} />
                    </div>
                  </div>
                  {regError && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(232,80,80,.1)', border:'1px solid rgba(232,80,80,.3)', borderRadius:10, padding:'10px 13px', marginBottom:14, fontSize:12, color:'#e85050' }}>
                      {IC.x(14)} {regError}
                    </div>
                  )}
                  <button
                    className="land-btn"
                    onClick={handleRegister}
                    disabled={regLoading}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, background: regLoading ? 'rgba(255,140,0,.3)' : 'linear-gradient(135deg, #ff8c00 0%, #e06000 100%)', border:'none', color:'#fff', padding:14, borderRadius:14, fontSize:14, fontWeight:900, letterSpacing:'0.5px' }}
                  >
                    {regLoading ? (<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'land-spin .7s linear infinite' }}/> Регистрация…</>) : (<> Зарегистрироваться {IC.arrow(16)} </>)}
                  </button>
                  <p style={{ textAlign:'center', marginTop:12, fontSize:11, color:'#5a6370' }}>
                    После регистрации вы автоматически войдёте в систему
                  </p>
                </div>
              )}

            {/* STEP: SUCCESS */}
            {success && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 0', animation:'land-fadeUp .3s ease both', textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg, #3ecf6e, #27a856)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, color:'#fff', boxShadow:'0 8px 32px rgba(62,207,110,.4)', animation:'land-success .5s cubic-bezier(.34,1.56,.64,1) both' }}>
                  {IC.check(18)}
                </div>
                <h3 style={{ margin:'0 0 6px', fontSize:20, fontWeight:900 }}>Добро пожаловать!</h3>
                <p style={{ margin:0, fontSize:13, color:'#9aa3b0' }}>Перенаправляем в систему…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}