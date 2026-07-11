import { useState, useEffect, useRef } from 'react'
import banner from '../assets/banner.png'
import viteLogo from '../assets/vite.svg';

// ── Design tokens ─────────────────────────────────────────────
// Apple-inspired palette: near-black canvas, frosted glass surfaces,
// iOS system accent colors. Orange stays the brand accent (it already
// carries through the Dashboard), everything else borrows the
// restrained iOS system-color set instead of arbitrary hexes.
const T = {
  bg: '#060608',
  bg2: '#0a0a0d',
  ink: '#f5f5f7',
  ink2: 'rgba(245,245,247,.62)',
  ink3: 'rgba(245,245,247,.38)',
  glass: 'rgba(255,255,255,.055)',
  glassBorder: 'rgba(255,255,255,.09)',
  orange: '#FF9F0A',
  orangeDeep: '#FF7A00',
  blue: '#0A84FF',
  green: '#30D158',
  red: '#FF453A',
  purple: '#BF5AF2',
  teal: '#5AC8E8',
  indigo: '#5E5CE6',
  yellow: '#FFD60A',
  pink: '#FF375F',
  gray: '#8E8E93',
}
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Segoe UI', sans-serif"
const hexToRgba = (hex, a) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

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
  seal: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M9 13.5 7 22l5-3 5 3-2-8.5"/>
    </svg>
  ),
}

// ── Ambient aurora backdrop (replaces the old particle canvas) ──
// A slow, quiet drift of soft color fields — closer to an iOS
// wallpaper than a data-viz effect. One ambient layer, not six.
function Aurora() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{
        position:'absolute', top:'-20%', left:'8%', width:620, height:620, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.orange,.16)} 0%, transparent 70%)`,
        filter:'blur(10px)', animation:'land-drift1 22s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', top:'10%', right:'-10%', width:560, height:560, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.indigo,.14)} 0%, transparent 70%)`,
        filter:'blur(10px)', animation:'land-drift2 26s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'-15%', left:'30%', width:520, height:520, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.teal,.10)} 0%, transparent 70%)`,
        filter:'blur(10px)', animation:'land-drift1 30s ease-in-out infinite reverse',
      }}/>
      <div style={{ position:'absolute', inset:0, backdropFilter:'blur(90px)' }}/>
    </div>
  )
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

// ── FAQ item (iOS Settings-style grouped row) ───────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '18px 4px', cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <p style={{ margin:0, fontSize:15, fontWeight:600, color: open ? T.orange : T.ink, transition:'color .2s' }}>
          {q}
        </p>
        <div style={{
          flexShrink:0, width:26, height:26, borderRadius:'50%',
          background: open ? hexToRgba(T.orange,.18) : 'rgba(255,255,255,.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: open ? T.orange : T.ink3, transition:'all .2s', transform: open ? 'rotate(45deg)' : 'none',
        }}>
          {IC.plus(13)}
        </div>
      </div>
      {open && (
        <p style={{ margin:'10px 0 0', fontSize:13.5, color:T.ink2, lineHeight:1.7, maxWidth:'92%', animation:'land-fadeUp .2s ease both' }}>{a}</p>
      )}
    </div>
  )
}

// ── Small reusable pill button ───────────────────────────────────
function Pill({ children, onClick, variant = 'primary', style, ...rest }) {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    borderRadius:999, fontSize:14, fontWeight:600, letterSpacing:'-0.1px',
    cursor:'pointer', border:'none', fontFamily:FONT, whiteSpace:'nowrap',
  }
  const variants = {
    primary: { background:`linear-gradient(180deg, ${T.orange} 0%, ${T.orangeDeep} 100%)`, color:'#fff', boxShadow:`0 1px 1px rgba(0,0,0,.2), 0 8px 22px ${hexToRgba(T.orange,.28)}` },
    glass: { background:'rgba(255,255,255,.08)', border:`1px solid ${T.glassBorder}`, color:T.ink },
    ghost: { background:'transparent', border:`1px solid rgba(255,255,255,.14)`, color:T.ink2 },
  }
  return (
    <button className="land-btn" onClick={onClick} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
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
      const users = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : []
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
      const users = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : []
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
    { icon: IC.eye(22), color:T.teal, title:'Мониторинг структур', desc:'Отслеживание всех государственных организаций в режиме реального времени. Полная история изменений и событий.' },
    { icon: IC.crown(22), color:T.orange, title:'Назначение лидеров', desc:'Управление должностями лидеров и заместителей. Быстрое назначение и снятие с должности одним действием.' },
    { icon: IC.warning(22), color:T.red, title:'Система выговоров', desc:'Ведение реестра устных и строгих выговоров. Автоматическая история санкций для каждой структуры.' },
    { icon: IC.list(22), color:T.purple, title:'Реестр запретов', desc:'Чёрный список лиц с запретом на вступление в государственные организации. Полная актуальность данных.' },
    { icon: IC.chart(22), color:T.blue, title:'Статистика и отчёты', desc:'Сводная аналитика по всем структурам. Графики, тренды и сводки в удобном формате для руководства.' },
    { icon: IC.clock(22), color:T.green, title:'Логи действий', desc:'Полная история всех административных действий с временными метками. Прозрачность и подотчётность.' },
  ]

  const orgs = [
    { name:'LSPD', label:'Полиция Лос-Сантоса', color:T.blue, active:true },
    { name:'MCLS', label:'Больница Лос-Сантоса', color:T.green, active:true },
    { name:'FBI', label:'Федеральное бюро', color:T.purple, active:true },
    { name:'GOV', label:'Правительство', color:T.yellow, active:true },
    { name:'LVmPD', label:'Полиция Лас-Вентурас', color:T.teal, active:false },
    { name:'SFPD', label:'Полиция Сан-Фиерро', color:T.gray, active:false },
    { name:'MCLV', label:'Больница Лас-Вентурас', color:T.pink, active:false },
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

  const recentActivity = [
    { admin:'Robert_Kamiya', action:'Выдал строгий выговор', target:'LSPD', time:'13:42', color:T.red },
    { admin:'Robert_Kamiya', action:'Назначил лидера', target:'FBI', time:'12:17', color:T.purple },
    { admin:'Robert_Kamiya', action:'Добавил запрет', target:'Nick_Ross', time:'11:05', color:T.gray },
  ]

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:T.bg, fontFamily:FONT, color:T.ink, overflowX:'hidden' }}>

      <style>{`
        @keyframes land-fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes land-fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes land-scaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes land-spin     { to{transform:rotate(360deg)} }
        @keyframes land-drift1   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.08)} }
        @keyframes land-drift2   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,20px) scale(1.05)} }
        @keyframes land-success  { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes land-pulse-dot{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:0} }
        @keyframes land-ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .land-btn { transition: transform .15s cubic-bezier(.2,.8,.2,1), box-shadow .15s, opacity .15s; }
        .land-btn:hover { transform: translateY(-1px); }
        .land-btn:active { transform: scale(.96); opacity: .9; }

        .land-widget { transition: transform .3s cubic-bezier(.2,.8,.2,1); }
        .land-widget:hover { transform: translateY(-3px); }

        .land-input { transition: border-color .15s, box-shadow .15s, background .15s; }
        .land-input:focus {
          outline: none;
          border-color: ${hexToRgba(T.orange,.55)} !important;
          background: rgba(255,255,255,.08) !important;
          box-shadow: 0 0 0 4px ${hexToRgba(T.orange,.12)} !important;
        }
        .land-input::placeholder { color: rgba(255,255,255,.28); }

        .land-feature-card { transition: all .25s cubic-bezier(.2,.8,.2,1); cursor: default; }
        .land-feature-card:hover {
          border-color: rgba(255,255,255,.16) !important;
          background: rgba(255,255,255,.07) !important;
          transform: translateY(-3px);
        }

        .land-org-chip { transition: transform .18s cubic-bezier(.2,.8,.2,1), border-color .18s; }
        .land-org-chip:hover { transform: translateY(-2px); }

        .land-ticker-wrap { overflow: hidden; width: 100%; }
        .land-ticker-inner { display: flex; gap: 0; width: max-content; animation: land-ticker 32s linear infinite; }
        .land-ticker-inner:hover { animation-play-state: paused; }

        .land-nav-link { transition: color .15s; }
        .land-nav-link:hover { color: ${T.ink} !important; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${hexToRgba(T.orange,.3)}; border-radius:3px; }

        @media (max-width: 860px) {
          .land-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .land-org-grid { grid-template-columns: 1fr 1fr !important; }
          .land-features-grid { grid-template-columns: 1fr !important; }
          .land-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .land-nav-links { display: none !important; }
        }
      `}</style>

      <Aurora />

      {/* subtle grain/grid, single layer only */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:`linear-gradient(${hexToRgba('#ffffff',.02)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba('#ffffff',.02)} 1px, transparent 1px)`, backgroundSize:'72px 72px' }}/>

      {/* ── FLOATING ISLAND NAVBAR ── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', justifyContent:'center', padding: scrolled ? '14px 16px' : '22px 16px', transition:'padding .4s cubic-bezier(.2,.8,.2,1)' }}>
        <nav style={{
          width:'100%', maxWidth: scrolled ? 940 : 1180,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:24,
          padding: '9px 10px 9px 16px',
          borderRadius:999,
          background: 'rgba(18,18,22,.62)',
          backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)',
          border:`1px solid ${T.glassBorder}`,
          boxShadow: scrolled ? '0 10px 34px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06)' : 'inset 0 1px 0 rgba(255,255,255,.05)',
          transition:'max-width .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease',
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              <img src={viteLogo} alt="logo" style={{ width:30, height:30, objectFit:'contain' }} />
            </div>
            <span style={{ fontSize:14.5, fontWeight:700, letterSpacing:'-0.3px' }}>
              STATE <span style={{ color:T.orange }}>CORE</span>
            </span>
          </div>

          {/* Nav Links */}
          <div className="land-nav-links" style={{ display:'flex', gap:28, fontSize:13, color:T.ink2, fontWeight:500 }}>
            {['Возможности','Организации','FAQ'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="land-nav-link" style={{ color:T.ink2, textDecoration:'none' }}>{l}</a>
            ))}
          </div>

          {/* CTA / Profile */}
          {currentUser ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, borderRadius:999, padding:'5px 12px 5px 5px' }}>
                <div style={{
                  width:26, height:26, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(160deg, ${T.orange} 0%, ${T.orangeDeep} 100%)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700, color:'#fff',
                }}>
                  {(currentUser.nickname || currentUser.login || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.1 }}>
                    {currentUser.nickname || currentUser.login}
                  </div>
                  <div style={{ fontSize:10, color:hexToRgba(T.orange,.85), fontWeight:600 }}>
                    {currentUser.roleName}
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  className="land-btn"
                  onClick={onLogout}
                  style={{ background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, color:T.ink3, padding:'9px 14px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=hexToRgba(T.red,.4); e.currentTarget.style.color=T.red }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.color=T.ink3 }}
                >
                  Выйти
                </button>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <Pill variant="glass" onClick={() => openModal('register')} style={{ padding:'9px 16px', fontSize:12.5 }}>Регистрация</Pill>
              <Pill variant="primary" onClick={() => openModal('login')} style={{ padding:'9px 18px', fontSize:12.5 }}>Войти {IC.arrow(12)}</Pill>
            </div>
          )}
        </nav>
      </div>

      {/* BANNER */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: 108 }}>
        <div style={{ padding: '0 24px', maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', border:`1px solid ${T.glassBorder}` }}>
            <img src={banner} alt="STATE CORE Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(circle at center, transparent 58%, rgba(6,6,8,0.65) 98%),
                linear-gradient(to right, rgba(6,6,8,0.85) 0%, transparent 20%, transparent 80%, rgba(6,6,8,0.85) 100%),
                linear-gradient(to bottom, rgba(6,6,8,0.25) 0%, transparent 45%, transparent 70%, rgba(6,6,8,0.8) 100%)
              `,
              pointerEvents: 'none',
            }}/>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: `linear-gradient(to top, ${T.bg} 35%, transparent)` }}/>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'72px 24px 96px' }}>
        <div className="land-hero-grid" style={{ display:'grid', gridTemplateColumns:'1.05fr .95fr', gap:64, alignItems:'center' }}>

          {/* LEFT */}
          <div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`,
              borderRadius:999, padding:'6px 13px 6px 6px', marginBottom:22,
              fontSize:12, fontWeight:600, color:T.ink2,
              animation:'land-fadeUp .6s cubic-bezier(.2,.8,.2,1) both',
            }}>
              <span style={{ width:20, height:20, borderRadius:'50%', background:hexToRgba(T.green,.18), color:T.green, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:T.green, boxShadow:`0 0 6px ${T.green}` }}/>
              </span>
              Система работает штатно
            </div>

            <h1 style={{
              fontSize:'clamp(38px, 4.6vw, 62px)', fontWeight:700,
              letterSpacing:'-2px', lineHeight:1.06,
              margin:'0 0 20px',
              animation:'land-fadeUp .6s cubic-bezier(.2,.8,.2,1) .08s both',
            }}>
              Единая платформа<br/>
              государственных<br/>
              <span style={{ color:T.orange }}>структур</span>
            </h1>

            <p style={{
              fontSize:16.5, color:T.ink2, lineHeight:1.65, maxWidth:460, margin:'0 0 36px',
              animation:'land-fadeUp .6s cubic-bezier(.2,.8,.2,1) .16s both',
            }}>
              Мониторинг организаций, управление лидерами, система выговоров и реестр запретов — всё в одном месте для Следящей Администрации.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', animation:'land-fadeUp .6s cubic-bezier(.2,.8,.2,1) .24s both' }}>
              <Pill variant="primary" onClick={() => openModal('login')} style={{ padding:'15px 26px', fontSize:14.5 }}>
                Войти в систему {IC.arrow(15)}
              </Pill>
              <a
                href="#возможности"
                style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, color:T.ink2, padding:'15px 22px', borderRadius:999, fontSize:14.5, fontWeight:600, textDecoration:'none', transition:'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.22)'; e.currentTarget.style.color=T.ink }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.color=T.ink2 }}
              >
                Узнать больше
              </a>
            </div>
          </div>

          {/* RIGHT — iOS-style widget stack (signature element) */}
          <div style={{ animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .2s both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { label:'Организаций', val:12, color:T.blue, icon: IC.building(16) },
                { label:'Активных лидеров', val:9, color:T.orange, icon: IC.crown(16) },
                { label:'Выговоров', val:21, color:T.red, icon: IC.warning(16) },
                { label:'В реестре', val:28, color:T.purple, icon: IC.list(16) },
              ].map(s => (
                <div key={s.label} className="land-widget" style={{
                  background:'rgba(255,255,255,.055)',
                  backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
                  borderRadius:24, padding:'16px 18px',
                  border:`1px solid ${T.glassBorder}`,
                  boxShadow:'inset 0 1px 0 rgba(255,255,255,.08), 0 20px 40px rgba(0,0,0,.35)',
                }}>
                  <div style={{
                    width:30, height:30, borderRadius:9, marginBottom:24,
                    background:hexToRgba(s.color,.16), color:s.color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize:26, fontWeight:700, color:T.ink, letterSpacing:'-0.5px', lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:11.5, color:T.ink3, marginTop:5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* wide activity widget */}
            <div className="land-widget" style={{
              marginTop:12,
              background:'rgba(255,255,255,.055)',
              backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
              borderRadius:24, padding:'18px 20px 8px',
              border:`1px solid ${T.glassBorder}`,
              boxShadow:'inset 0 1px 0 rgba(255,255,255,.08), 0 20px 40px rgba(0,0,0,.35)',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontSize:12, fontWeight:600, color:T.ink2 }}>Последние действия</span>
                <span style={{ fontSize:10, fontWeight:700, color:T.green, letterSpacing:'.5px', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:T.green, boxShadow:`0 0 6px ${T.green}`, animation:'land-pulse-dot 2s ease infinite' }}/>
                  LIVE
                </span>
              </div>
              {recentActivity.map((l, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 0', borderTop: i>0 ? '1px solid rgba(255,255,255,.06)' : 'none',
                  fontSize:12.5,
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:l.color, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.admin}</div>
                    <div style={{ color:T.ink3, fontSize:11.5 }}>{l.action} · <span style={{ color:l.color, fontWeight:600 }}>{l.target}</span></div>
                  </div>
                  <div style={{ color:T.ink3, fontSize:11, flexShrink:0 }}>{l.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATS ROW — grouped list style */}
        <div className="land-stats-grid" style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12,
          marginTop:72,
          animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .3s both',
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              padding:'26px 22px',
              background:'rgba(255,255,255,.045)',
              border:`1px solid ${T.glassBorder}`,
              borderRadius:22,
              textAlign:'center',
            }}>
              <div style={{ fontSize:'clamp(28px, 3.4vw, 40px)', fontWeight:700, color:T.orange, letterSpacing:'-1px', lineHeight:1 }}>
                <Counter to={s.val} />{s.suffix}
              </div>
              <div style={{ fontSize:11.5, color:T.ink3, marginTop:8, lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position:'relative', zIndex:1, overflow:'hidden', padding:'18px 0', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div className="land-ticker-inner">
          {[...Array(2)].map((_, ri) => (
            <div key={ri} style={{ display:'flex', gap:0 }}>
              {['LSPD','FBI','LSFD','GOV','LSMC','FIB','ARMY','COURT','LSPD','FBI','LSFD','GOV'].map((t, i) => (
                <div key={`${ri}-${i}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'0 36px', whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:'1.5px', color:T.ink3, textTransform:'uppercase' }}>{t}</span>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:hexToRgba(T.orange,.3) }}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="возможности" style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'96px 24px' }}>

        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:hexToRgba(T.orange,.1), border:`1px solid ${hexToRgba(T.orange,.24)}`, borderRadius:999, padding:'6px 14px', marginBottom:20, fontSize:11.5, fontWeight:600, color:T.orange }}>
            {IC.bolt(12)} Возможности
          </div>
          <h2 style={{ fontSize:'clamp(26px, 3.6vw, 42px)', fontWeight:700, letterSpacing:'-1.2px', lineHeight:1.15, marginBottom:14 }}>
            Всё что нужно<br/>
            <span style={{ color:T.orange }}>следящему администратору</span>
          </h2>
          <p style={{ fontSize:15, color:T.ink2, maxWidth:480, margin:'0 auto', lineHeight:1.65 }}>
            Единая система для мониторинга, управления и контроля государственных структур города
          </p>
        </div>

        <div className="land-features-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="land-feature-card"
              style={{
                background:'rgba(255,255,255,.045)',
                border:`1px solid ${T.glassBorder}`,
                borderRadius:24, padding:'26px 24px',
              }}
            >
              <div style={{
                width:44, height:44, borderRadius:13, marginBottom:18,
                background:hexToRgba(f.color,.15),
                display:'flex', alignItems:'center', justifyContent:'center',
                color: f.color,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8, color:T.ink }}>{f.title}</h3>
              <p style={{ fontSize:13.5, color:T.ink2, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ORGANIZATIONS ── */}
      <section id="организации" style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'88px 24px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>

          <div className="land-hero-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:hexToRgba(T.blue,.1), border:`1px solid ${hexToRgba(T.blue,.24)}`, borderRadius:999, padding:'6px 14px', marginBottom:20, fontSize:11.5, fontWeight:600, color:T.blue }}>
                {IC.building(12)} Организации
              </div>
              <h2 style={{ fontSize:'clamp(26px, 3.2vw, 38px)', fontWeight:700, letterSpacing:'-1.2px', lineHeight:1.15, marginBottom:14 }}>
                Под контролем<br/>
                <span style={{ color:T.orange }}>12 структур</span>
              </h2>
              <p style={{ fontSize:14.5, color:T.ink2, lineHeight:1.65, marginBottom:28, maxWidth:420 }}>
                Система охватывает все государственные организации города. Каждая структура имеет своего лидера, состав и историю действий.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  'Полный реестр лидеров и заместителей',
                  'История выговоров и санкций',
                  'Вакантные должности под контролем',
                  'Запреты на вступление в реестре',
                ].map((text, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:hexToRgba(T.green,.16), color:T.green, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{IC.check(11)}</div>
                    <span style={{ fontSize:14, color:T.ink2 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="land-org-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {orgs.map(org => (
                <div
                  key={org.name}
                  className="land-org-chip"
                  style={{
                    background: org.active ? hexToRgba(org.color,.09) : 'rgba(255,255,255,.03)',
                    border: `1px solid ${org.active ? hexToRgba(org.color,.28) : T.glassBorder}`,
                    borderRadius:18, padding:'15px 16px',
                    display:'flex', alignItems:'center', gap:12,
                    opacity: org.active ? 1 : .5,
                  }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:11, flexShrink:0,
                    background: org.active ? hexToRgba(org.color,.16) : 'rgba(255,255,255,.05)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, color: org.active ? org.color : T.ink3,
                    letterSpacing:'.3px',
                  }}>
                    {org.name.slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:600, color: org.active ? T.ink : T.ink3, marginBottom:2 }}>{org.name}</div>
                    <div style={{ fontSize:11, color: org.active ? T.ink2 : T.ink3 }}>{org.label}</div>
                  </div>
                  {org.active && (
                    <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:org.color, boxShadow:`0 0 8px ${org.color}`, flexShrink:0 }}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'88px 24px' }}>
        <div style={{
          background:`linear-gradient(135deg, ${hexToRgba(T.orange,.14)} 0%, ${hexToRgba(T.orangeDeep,.06)} 50%, rgba(255,255,255,.02) 100%)`,
          border:`1px solid ${hexToRgba(T.orange,.22)}`,
          borderRadius:32, padding:'56px 48px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:40, flexWrap:'wrap',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-80, right:80, width:280, height:280, background:`radial-gradient(circle, ${hexToRgba(T.orange,.14)} 0%, transparent 70%)`, pointerEvents:'none' }}/>
          <div style={{ position:'relative' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:T.orange, marginBottom:14 }}>
              {IC.lock(12)} Закрытый доступ
            </div>
            <h2 style={{ fontSize:'clamp(22px, 2.8vw, 34px)', fontWeight:700, letterSpacing:'-0.8px', lineHeight:1.2, marginBottom:12 }}>
              Готовы войти в систему?
            </h2>
            <p style={{ fontSize:14, color:T.ink2, maxWidth:420, lineHeight:1.6 }}>
              Доступ предоставляется исключительно сотрудникам Следящей Администрации. Учётные данные выдаются Главным Следящим.
            </p>
          </div>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
            <Pill variant="primary" onClick={() => openModal('login')} style={{ padding:'16px 34px', fontSize:15 }}>
              {IC.shield(16)} Войти в систему
            </Pill>
            <p style={{ fontSize:11, color:T.ink3, textAlign:'center' }}>
              Только для авторизованных сотрудников
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ position:'relative', zIndex:1, maxWidth:760, margin:'0 auto', padding:'0 24px 96px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, borderRadius:999, padding:'6px 14px', marginBottom:18, fontSize:11.5, fontWeight:600, color:T.ink2 }}>
            Вопросы и ответы
          </div>
          <h2 style={{ fontSize:'clamp(24px, 3.2vw, 38px)', fontWeight:700, letterSpacing:'-1.2px' }}>
            FAQ
          </h2>
        </div>
        <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${T.glassBorder}`, borderRadius:24, padding:'6px 24px' }}>
          {faq.map((item, i) => <FaqItem key={i} {...item} />)}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,.06)', padding:'44px 24px 28px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>

            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:hexToRgba(T.orange,.16), display:'flex', alignItems:'center', justifyContent:'center', color:T.orange }}>
                  {IC.shield(15)}
                </div>
                <span style={{ fontSize:14.5, fontWeight:700 }}>ГС <span style={{ color:T.orange }}>Портал</span></span>
              </div>
              <p style={{ fontSize:13, color:T.ink3, lineHeight:1.65, maxWidth:280, marginBottom:18 }}>
                Единая система мониторинга и управления государственными структурами. Разработано для Следящей Администрации.
              </p>
              <div style={{ display:'flex', gap:9 }}>
                {[IC.discord(15), IC.mail(15)].map((icon, i) => (
                  <div key={i} style={{
                    width:32, height:32, borderRadius:9, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`,
                    display:'flex', alignItems:'center', justifyContent:'center', color:T.ink3, cursor:'pointer', transition:'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=hexToRgba(T.orange,.3); e.currentTarget.style.color=T.orange }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.color=T.ink3 }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {[
              { title:'Система', items:['Мониторинг','Организации','Реестр запретов','Логи действий'] },
              { title:'Роли', items:['Следящий Администратор','Главный Следящий','Лидер организации','Заместитель'] },
              { title:'Информация', items:['FAQ','Правила системы','Контакты','Обратная связь'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize:11, fontWeight:700, color:T.ink2, letterSpacing:'1px', textTransform:'uppercase', marginBottom:14 }}>{col.title}</div>
                {col.items.map(l => (
                  <div key={l} style={{ fontSize:13, color:T.ink3, marginBottom:9, cursor:'pointer', transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color=T.ink2}
                    onMouseLeave={e => e.currentTarget.style.color=T.ink3}
                  >{l}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:12, color:T.ink3 }}>
              © 2025 ГС Портал. Все права защищены.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:T.green, boxShadow:`0 0 8px ${T.green}`, animation:'land-pulse-dot 2s ease infinite' }}/>
              <span style={{ fontSize:12, color:T.ink3 }}>Все системы работают штатно</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODAL — iOS sheet style ── */}
      {showModal && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:100,
            background: modalVisible ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,0)',
            backdropFilter: modalVisible ? 'blur(16px)' : 'blur(0)', WebkitBackdropFilter: modalVisible ? 'blur(16px)' : 'blur(0)',
            transition:'all .32s ease',
            display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          }}
          onClick={closeModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:440,
              background:'linear-gradient(180deg, rgba(32,32,37,.9) 0%, rgba(20,20,24,.9) 100%)',
              backdropFilter:'blur(34px) saturate(190%)', WebkitBackdropFilter:'blur(34px) saturate(190%)',
              border:`1px solid rgba(255,255,255,.13)`, borderRadius:34, padding:'14px 28px 28px',
              boxShadow:`0 40px 100px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.1), 0 0 80px ${hexToRgba(T.orange,.06)}`,
              opacity: modalVisible ? 1 : 0,
              transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(20px)',
              transition:'all .32s cubic-bezier(.2,.9,.25,1)',
              position:'relative', overflow:'hidden',
            }}>
            {/* ambient top glow, ties the sheet back to the brand accent */}
            <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:260, height:160, background:`radial-gradient(ellipse, ${hexToRgba(T.orange,.16)} 0%, transparent 72%)`, pointerEvents:'none' }}/>

            {/* drag handle */}
            <div style={{ width:38, height:5, borderRadius:3, background:'rgba(255,255,255,.22)', margin:'2px auto 20px', cursor:'grab', position:'relative' }}/>

            {/* Close */}
            <button
              onClick={closeModal}
              style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.08)', border:`1px solid ${T.glassBorder}`, borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:T.ink2, cursor:'pointer', transition:'all .15s', zIndex:1 }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.16)'; e.currentTarget.style.color=T.ink }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.color=T.ink2 }}
            >
              {IC.x(15)}
            </button>

            {/* STEP: HERO — выбор входа или регистрации */}
            {step === 'hero' && (
              <div style={{ animation:'land-scaleIn .28s ease both', position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:hexToRgba(T.orange,.15), color:T.orange, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {IC.shield(24)}
                  </div>
                </div>
                <div style={{ marginBottom:22, textAlign:'center' }}>
                  <h2 style={{ margin:0, fontSize:21, fontWeight:700, letterSpacing:'-0.4px' }}>Войти или зарегистрироваться</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>Выберите действие, чтобы продолжить</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { key:'login', icon:IC.arrow(16), color:T.orange, title:'Войти', desc:'У меня уже есть аккаунт' },
                    { key:'register', icon:IC.user(16), color:T.blue, desc:'Первый раз в системе', title:'Зарегистрироваться' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setStep(opt.key)}
                      className="land-btn"
                      style={{
                        display:'flex', alignItems:'center', gap:13, width:'100%', textAlign:'left',
                        background:'rgba(255,255,255,.055)', border:`1px solid ${T.glassBorder}`,
                        borderRadius:18, padding:'13px 14px', cursor:'pointer', fontFamily:FONT,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.09)'; e.currentTarget.style.borderColor=hexToRgba(opt.color,.35) }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.055)'; e.currentTarget.style.borderColor=T.glassBorder }}
                    >
                      <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:hexToRgba(opt.color,.16), color:opt.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {opt.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14.5, fontWeight:600, color:T.ink }}>{opt.title}</div>
                        <div style={{ fontSize:12, color:T.ink3 }}>{opt.desc}</div>
                      </div>
                      <div style={{ color:T.ink3, flexShrink:0 }}>{IC.arrow(15)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: LOGIN */}
            {step === 'login' && !success && (
              <div style={{ animation:'land-scaleIn .28s ease both' }}>
                <button
                  onClick={() => { setStep('hero'); setError('') }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.ink2, fontSize:12, cursor:'pointer', marginBottom:22, padding:0, transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color=T.ink}
                  onMouseLeave={e => e.currentTarget.style.color=T.ink2}
                >
                  {IC.chevLeft(15)} Назад
                </button>
                <div style={{ marginBottom:26 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10, color:T.orange, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                    {IC.shield(14)} Следящая Администрация
                  </div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Вход в систему</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>Введите данные, выданные Главным Следящим</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.32)', pointerEvents:'none', display:'flex' }}>{IC.at(13)}</span>
                    <input type="text" className="land-input" placeholder="Логин (до 10 символов)" value={login} maxLength={10} onChange={e => { setLogin(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus style={{ width:'100%', background:'rgba(255,255,255,.06)', border:`1px solid ${error ? hexToRgba(T.red,.5) : T.glassBorder}`, color:T.ink, padding:'13px 14px 13px 38px', borderRadius:14, fontSize:14, fontFamily:'inherit' }}/>
                  </div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.32)', pointerEvents:'none', display:'flex' }}>{IC.lock(13)}</span>
                    <input type="password" className="land-input" placeholder="Пароль" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width:'100%', background:'rgba(255,255,255,.06)', border:`1px solid ${error ? hexToRgba(T.red,.5) : T.glassBorder}`, color:T.ink, padding:'13px 14px 13px 38px', borderRadius:14, fontSize:14, fontFamily:'inherit' }}/>
                  </div>
                </div>
                {/* Remember me — iOS-style toggle */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none', marginBottom:4, padding:'2px 0' }} onClick={() => setRemember(r => !r)}>
                  <span style={{ fontSize:13.5, color:T.ink2 }}>Запомнить меня</span>
                  <div style={{
                    width:44, height:26, borderRadius:999, flexShrink:0, padding:2,
                    background: remember ? T.green : 'rgba(255,255,255,.14)',
                    transition:'background .2s ease', display:'flex', alignItems:'center',
                    justifyContent: remember ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,.3)', transition:'all .2s cubic-bezier(.2,.8,.2,1)' }}/>
                  </div>
                </div>

                {error && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:hexToRgba(T.red,.1), border:`1px solid ${hexToRgba(T.red,.3)}`, borderRadius:12, padding:'10px 13px', marginTop:14, marginBottom:6, fontSize:12, color:T.red, animation:'land-fadeUp .2s ease both' }}>
                    {IC.x(14)} {error}
                  </div>
                )}
                <Pill
                  variant="primary"
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width:'100%', padding:14, fontSize:14, marginTop:18, opacity: loading ? .6 : 1, cursor: loading ? 'default' : 'pointer' }}
                >
                  {loading ? (
                    <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'land-spin .7s linear infinite' }}/> Проверка…</>
                  ) : (
                    <> Войти {IC.arrow(16)} </>
                  )}
                </Pill>
                <p style={{ textAlign:'center', marginTop:16, fontSize:11, color:T.ink3 }}>
                  Учётные данные выдаются Главным Следящим
                </p>
              </div>
            )}

            {/* STEP: REGISTER */}
            {step === 'register' && !success && (
              <div style={{ animation:'land-scaleIn .28s ease both' }}>
                <button
                  onClick={() => { setStep('hero'); setRegError('') }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.ink2, fontSize:12, cursor:'pointer', marginBottom:18, padding:0, transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color=T.ink}
                  onMouseLeave={e => e.currentTarget.style.color=T.ink2}
                >
                  {IC.chevLeft(15)} Назад
                </button>
                <div style={{ marginBottom:18 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10, color:T.orange, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                    Регистрация
                  </div>
                  <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Создать аккаунт</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>Логин, никнейм, VK/Forum и пароль</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Логин <span style={{color:hexToRgba(T.orange,.8), fontSize:10}}>макс. 10 символов</span></div>
                    <input
                      placeholder="login"
                      value={regLogin}
                      maxLength={10}
                      onChange={e => setRegLogin(e.target.value.replace(/\s/g,''))}
                      className="land-input"
                      style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${regLogin.length===10?hexToRgba(T.orange,.5):T.glassBorder}`, color:T.ink, fontFamily:'monospace', letterSpacing:'0.5px' }}
                    />
                    <div style={{ fontSize:10, color: regLogin.length===10?T.orange:'rgba(255,255,255,.25)', textAlign:'right', marginTop:4 }}>{regLogin.length}/10</div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Никнейм</div>
                    <input placeholder="Например: Kaitoramirez" value={regNickname} onChange={e => setRegNickname(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`, color:T.ink }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>VK (ссылка)</div>
                    <input type="url" placeholder="https://vk.com/kaitoramirez" value={regVk} onChange={e => setRegVk(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`, color:T.ink }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Форум (ссылка)</div>
                    <input type="url" placeholder="https://forum.gta-mobile.ru/bestofthebest/" value={regForum} onChange={e => setRegForum(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`, color:T.ink }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Пароль</div>
                    <input type="password" placeholder="Пароль" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`, color:T.ink }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Повтор пароля</div>
                    <input type="password" placeholder="Повторите пароль" value={regPassword2} onChange={e => setRegPassword2(e.target.value)} className="land-input" style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${T.glassBorder}`, color:T.ink }} />
                  </div>
                </div>
                {regError && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:hexToRgba(T.red,.1), border:`1px solid ${hexToRgba(T.red,.3)}`, borderRadius:12, padding:'10px 13px', marginBottom:14, fontSize:12, color:T.red }}>
                    {IC.x(14)} {regError}
                  </div>
                )}
                <Pill
                  variant="primary"
                  onClick={handleRegister}
                  disabled={regLoading}
                  style={{ width:'100%', padding:14, fontSize:14, opacity: regLoading ? .6 : 1, cursor: regLoading ? 'default' : 'pointer' }}
                >
                  {regLoading ? (<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'land-spin .7s linear infinite' }}/> Регистрация…</>) : (<> Зарегистрироваться {IC.arrow(16)} </>)}
                </Pill>
                <p style={{ textAlign:'center', marginTop:12, fontSize:11, color:T.ink3 }}>
                  После регистрации вы автоматически войдёте в систему
                </p>
              </div>
            )}

            {/* STEP: SUCCESS */}
            {success && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 0', animation:'land-fadeUp .3s ease both', textAlign:'center' }}>
                <div style={{ width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg, ${T.green}, #27a856)`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, color:'#fff', boxShadow:`0 8px 32px ${hexToRgba(T.green,.4)}`, animation:'land-success .5s cubic-bezier(.34,1.56,.64,1) both' }}>
                  {IC.check(18)}
                </div>
                <h3 style={{ margin:'0 0 6px', fontSize:19, fontWeight:700 }}>Добро пожаловать!</h3>
                <p style={{ margin:0, fontSize:13, color:T.ink2 }}>Перенаправляем в систему…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}