import { useState, useEffect, useRef } from 'react'
import { upsertUser, setSession, getUsers } from '../lib/userStore'
import { registerUser, loginUser, verify2FALogin } from '../lib/api'
import logoUrl from '../assets/vite.svg'

// ── Design tokens ─────────────────────────────────────────────
const T = {
  bg: '#07080f',
  bg2: '#0b0d18',
  bgTop: '#241a45',
  bgTop2: '#151233',
  ink: '#f2f4fb',
  ink2: 'rgba(242,244,251,.62)',
  ink3: 'rgba(242,244,251,.40)',
  glass: 'rgba(255,255,255,.05)',
  glassBorder: 'rgba(255,255,255,.10)',
  primary: '#4f6cf7',
  primaryDeep: '#3b53df',
  primarySoft: '#8298ff',
  orange: '#ff8c00',
  orangeDeep: '#ff5500',
  blue: '#38bdf8',
  green: '#22c55e',
  greenDeep: '#16a34a',
  red: '#fb7185',
  redDeep: '#ef4444',
  purple: '#a78bfa',
  teal: '#38bdf8',
  indigo: '#60a5fa',
  yellow: '#facc15',
  pink: '#fb7185',
  gray: '#94a3b8',
}
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
const FONT_DISPLAY = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
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
  logIn: (s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
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
  download: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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
  heart: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z"/>
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
  plus: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
  terminal: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
}

// ── Ambient backdrop ──────────────────────────────────────────
function Aurora() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{
        position:'absolute', top:'-12%', left:'-8%', width:560, height:560, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.orange,.22)} 0%, transparent 68%)`,
        filter:'blur(10px)', animation:'land-drift1 16s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', top:'8%', right:'-10%', width:620, height:620, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.primary,.18)} 0%, transparent 70%)`,
        filter:'blur(10px)', animation:'land-drift2 20s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'-14%', left:'22%', width:520, height:520, borderRadius:'50%',
        background:`radial-gradient(circle, ${hexToRgba(T.blue,.12)} 0%, transparent 70%)`,
        filter:'blur(10px)', animation:'land-drift1 24s ease-in-out infinite 3s',
      }}/>
      <div style={{ position:'absolute', inset:0, opacity:.02, backgroundImage:`linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize:'64px 64px' }}/>
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

// ── SURVEILLANCE.LOG ──────────────────────────────────────────
const LOG_FEED = [
  { tag:'OK',   color:T.green,  text:'LSPD — смена лидера подтверждена' },
  { tag:'WARN', color:T.red,    text:'FBI — выдан строгий выговор' },
  { tag:'INFO', color:T.blue,   text:'GOV — запрос на вступление обработан' },
  { tag:'OK',   color:T.green,  text:'MCLS — состав синхронизирован' },
  { tag:'INFO', color:T.primary,text:'Реестр запретов — запись обновлена' },
  { tag:'OK',   color:T.green,  text:'LVmPD — проверка структуры завершена' },
  { tag:'WARN', color:T.red,    text:'SFPD — устный выговор зафиксирован' },
  { tag:'INFO', color:T.blue,   text:'Следящая Администрация — снапшот сохранён' },
]

function SystemConsole() {
  const [lines, setLines] = useState([])
  const idx = useRef(0)
  const boxRef = useRef(null)

  useEffect(() => {
    const now = () => new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    const push = () => {
      const entry = LOG_FEED[idx.current % LOG_FEED.length]
      idx.current += 1
      setLines(prev => {
        const next = [...prev, { ...entry, time: now(), key: idx.current }]
        return next.length > 6 ? next.slice(next.length - 6) : next
      })
    }
    push()
    const t = setInterval(push, 1900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  return (
    <div className="land-widget" style={{
      position:'relative', overflow:'hidden',
      background:'rgba(255,255,255,.015)',
      borderRadius:16, border:'1px solid rgba(255,255,255,.08)',
    }}>
      <div aria-hidden style={{ position:'absolute', left:0, right:0, height:60, background:`linear-gradient(180deg, transparent, ${hexToRgba(T.orange,.06)}, transparent)`, animation:'land-scan 5s linear infinite', pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ color:T.orange, display:'flex' }}>{IC.terminal(14)}</span>
          <span style={{ fontFamily:FONT_MONO, fontSize:11.5, fontWeight:600, letterSpacing:'1.5px', color:T.ink2, textTransform:'uppercase' }}>
            surveillance.log
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:FONT_MONO, fontSize:10, fontWeight:600, letterSpacing:'.5px', color:T.green }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:T.green, boxShadow:`0 0 6px ${T.green}`, animation:'land-pulse-dot 2s ease infinite' }}/>
          LIVE
        </div>
      </div>
      <div ref={boxRef} style={{ height:198, overflow:'hidden', padding:'14px 18px', display:'flex', flexDirection:'column', gap:2 }}>
        {lines.map((l, i) => (
          <div key={l.key} style={{
            display:'flex', alignItems:'baseline', gap:10,
            fontFamily:FONT_MONO, fontSize:12, lineHeight:'26px',
            animation:'land-logIn .35s ease both',
            opacity: 0.35 + (i / Math.max(lines.length - 1, 1)) * 0.65,
          }}>
            <span style={{ color:T.ink3, flexShrink:0 }}>{l.time}</span>
            <span style={{ color:l.color, fontWeight:700, flexShrink:0, width:44 }}>[{l.tag}]</span>
            <span style={{ color:T.ink2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.text}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:FONT_MONO, fontSize:12, color:T.ink3, marginTop:2 }}>
          <span>&gt;</span>
          <span style={{ width:7, height:14, background:T.primary, animation:'land-blink 1s step-end infinite' }}/>
        </div>
      </div>
    </div>
  )
}

// ── FAQ item ─────────────────────────────────────────────────
function FaqItem({ q, a, n }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '18px 4px', cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, minWidth:0 }}>
          <span style={{ fontFamily:FONT_MONO, fontSize:11, color: open ? T.primarySoft : T.ink3, flexShrink:0, transition:'color .2s' }}>{n}</span>
          <p style={{ margin:0, fontSize:15, fontWeight:600, color: open ? T.primarySoft : T.ink, transition:'color .2s' }}>
            {q}
          </p>
        </div>
        <div style={{
          flexShrink:0, width:26, height:26, borderRadius:'50%',
          background: open ? hexToRgba(T.primary,.18) : 'rgba(255,255,255,.06)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: open ? T.primarySoft : T.ink3, transition:'all .2s', transform: open ? 'rotate(45deg)' : 'none',
        }}>
          {IC.plus(13)}
        </div>
      </div>
      {open && (
        <p style={{ margin:'10px 0 0', fontSize:13.5, color:T.ink2, lineHeight:1.7, maxWidth:'92%', paddingLeft:32, animation:'land-fadeUp .2s ease both' }}>{a}</p>
      )}
    </div>
  )
}

// ── Buttons ──────────────────────────────────────────────────
function Pill({ children, onClick, variant = 'primary', style, ...rest }) {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    borderRadius:14, fontSize:14, fontWeight:800, letterSpacing:'-0.1px',
    cursor:'pointer', border:'none', fontFamily:FONT, whiteSpace:'nowrap',
  }
  const variants = {
    primary: { background:`linear-gradient(135deg, ${T.orange} 0%, ${T.orange} 55%, ${T.orangeDeep} 100%)`, color:'#fff', boxShadow:`0 8px 20px ${hexToRgba(T.orange,.2)}` },
    glass: { background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, color:T.ink },
    dark: { background:'rgba(255,255,255,.045)', border:`1px solid ${T.glassBorder}`, color:T.ink },
    ghost: { background:'transparent', border:`1px solid rgba(255,255,255,.14)`, color:T.ink2 },
  }
  return (
    <button className={`land-btn${variant === 'primary' ? ' land-btn-primary' : ''}`} onClick={onClick} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}

function NavButton({ icon, children, onClick, highlight, style }) {
  return (
    <button
      className="land-nav-btn land-btn"
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:9,
        padding:'10px 18px 10px 14px', borderRadius:14,
        background: highlight ? hexToRgba(T.primary,.14) : 'rgba(255,255,255,.04)',
        border:`1px solid ${highlight ? hexToRgba(T.primary,.35) : T.glassBorder}`,
        color: highlight ? T.primarySoft : T.ink2,
        fontSize:13.5, fontWeight:600, fontFamily:FONT, cursor:'pointer',
        boxShadow: highlight ? `0 0 18px ${hexToRgba(T.primary,.25)}` : 'none',
        ...style,
      }}
    >
      <span style={{ display:'flex', color: highlight ? T.primarySoft : T.ink3 }}>{icon}</span>
      {children}
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function Landing({ onLogin, currentUser, onLogout, onOpenApp }) {
  const [step, setStep] = useState('hero')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
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

  const openModal = (initial = 'hero') => { 
    setStep(initial); 
    setShowModal(true); 
    setRequires2FA(false);
    setTwoFactorCode('');
    setTimeout(() => setModalVisible(true), 10) 
  }
  const closeModal = () => {
    setModalVisible(false)
    setTimeout(() => { 
      setShowModal(false); 
      setStep('hero'); 
      setError(''); 
      setLogin(''); 
      setPassword(''); 
      setTwoFactorCode('');
      setRequires2FA(false);
    }, 320)
  }

  const handleRegister = async () => {
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
      const loginId = regLogin.trim()
      const normalize = s => (s || '').trim().replace(/\/+$/, '')
      const response = await registerUser({
        login: loginId,
        password: regPassword,
        nickname: regNickname.trim(),
        vk: normalize(regVk),
        forum: normalize(regForum),
      })
      const userData = {
        id: response.user.id,
        login: response.user.login,
        nickname: response.user.nickname,
        roleName: response.user.roleName || 'Игрок',
        avatar: response.user.avatar || '',
        vk: response.user.vk || '',
        forum: response.user.forum || '',
        registeredAt: response.user.registeredAt,
      }
      upsertUser(userData)
      setSession(userData)
      if (response.token) {
        localStorage.setItem('statecore_token', response.token)
      }
      setSuccess(true)
      setTimeout(() => { onLogin && onLogin(userData) }, 700)
    } catch (err) {
      console.error(err)
      setRegError(err.message || 'Ошибка при регистрации')
    } finally {
      setRegLoading(false)
    }
  }

  const getDeviceId = () => {
    let id = localStorage.getItem('statecore_device_id')
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      localStorage.setItem('statecore_device_id', id)
    }
    return id
  }
  const [tempToken, setTempToken] = useState('')

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }

    setLoading(true)
    setError('')

    try {
      const deviceId = getDeviceId()

      // 1. Если 2FA затребован
      if (requires2FA) {
        if (!twoFactorCode.trim()) {
          setError('Введите код двухфакторной аутентификации')
          setLoading(false)
          return
        }

        if (!tempToken) {
          setError('Сессия входа истекла. Авторизуйтесь заново.')
          setRequires2FA(false)
          setLoading(false)
          return
        }

        const response = await verify2FALogin({
          tempToken,
          code: twoFactorCode.trim(),
          deviceId
        })

        finishAuth(response)
        return
      }

      // 2. Обычная попытка входа
      const normalize = s => (s || '').trim().replace(/\/+$/, '').toLowerCase()
      const response = await loginUser({ 
        login: normalize(login), 
        password, 
        deviceId 
      })

      if (response.requires2FA) {
        setRequires2FA(true)
        setTempToken(response.tempToken)
        setLoading(false)
        return
      }

      finishAuth(response)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  const finishAuth = (response) => {
    const found = response.user
    const userData = {
      id: found.id,
      login: found.login,
      nickname: found.nickname,
      roleName: found.roleName || 'Игрок',
      avatar: found.avatar || '',
      vk: found.vk || '',
      forum: found.forum || '',
      registeredAt: found.registeredAt || null,
    }

    if (remember) {
      upsertUser(userData)
      setSession(userData)
      if (response.token) {
        localStorage.setItem('statecore_token', response.token)
      }
    }

    setSuccess(true)
    setTimeout(() => { onLogin && onLogin(userData) }, 700)
  }

  const features = [
    { icon: IC.eye(22), color:T.blue, title:'Мониторинг структур', desc:'Отслеживание всех государственных организаций в режиме реального времени. Полная история изменений и событий.' },
    { icon: IC.crown(22), color:T.primary, title:'Назначение лидеров', desc:'Управление должностями лидеров и заместителей. Быстрое назначение и снятие с должности одним действием.' },
    { icon: IC.warning(22), color:T.red, title:'Система выговоров', desc:'Ведение реестра устных и строгих выговоров. Автоматическая история санкций для каждой структуры.' },
    { icon: IC.list(22), color:T.purple, title:'Реестр запретов', desc:'Чёрный список лиц с запретом на вступление в государственные организации. Полная актуальность данных.' },
    { icon: IC.chart(22), color:T.blue, title:'Статистика и отчёты', desc:'Сводная аналитика по всем структурам. Графики, тренды и сводки в удобном формате для руководства.' },
    { icon: IC.clock(22), color:T.primary, title:'Логи действий', desc:'Полная история всех административных действий с временными метками. Прозрачность и подотчётность.' },
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

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)', fontFamily:FONT, color:T.ink, overflowX:'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        @keyframes land-fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes land-fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes land-scaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes land-spin     { to{transform:rotate(360deg)} }
        @keyframes land-drift1   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,26px) scale(1.06)} }
        @keyframes land-drift2   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,18px) scale(1.04)} }
        @keyframes land-success  { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes land-pulse-dot{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:0} }
        @keyframes land-ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes land-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes land-scan       { 0%{top:-60px} 100%{top:220px} }
        @keyframes land-blink      { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes land-logIn      { from{opacity:0;transform:translateY(6px)} }
        @keyframes land-glow-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes land-shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes land-logo-glow  { 0%,100%{filter:drop-shadow(0 0 6px ${hexToRgba(T.orange,.5)})} 50%{filter:drop-shadow(0 0 14px ${hexToRgba(T.orange,.9)})} }

        .land-logo-badge img { animation: land-logo-glow 3s ease-in-out infinite; }
        .land-logo-badge { transition: box-shadow .25s, border-color .25s; }
        .land-logo-badge:hover { box-shadow: 0 0 22px ${hexToRgba(T.orange,.35)}; border-color: ${hexToRgba(T.orange,.4)} !important; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .land-btn { transition: transform .15s cubic-bezier(.2,.8,.2,1), box-shadow .15s, opacity .15s, background .15s, border-color .15s; }
        .land-btn:hover { transform: translateY(-1px); }
        .land-btn:active { transform: scale(.97); opacity: .92; }
        .land-btn:focus-visible { outline: 2px solid ${T.primary}; outline-offset: 2px; }
        .land-btn-primary { box-shadow: 0 8px 20px ${hexToRgba(T.orange,.2)}, 0 0 0px ${hexToRgba(T.orange,0)}; }
        .land-btn-primary:hover { transform: scale(1.012); box-shadow: 0 10px 26px ${hexToRgba(T.orange,.3)}, 0 0 28px ${hexToRgba(T.orange,.35)}; }

        .land-nav-btn:hover { background: rgba(255,255,255,.08) !important; border-color: rgba(255,255,255,.2) !important; color: ${T.ink} !important; }

        .land-widget { transition: transform .3s cubic-bezier(.2,.8,.2,1); }
        .land-widget:hover { transform: translateY(-3px); }

        .land-input { transition: border-color .15s, box-shadow .15s, background .15s; }
        .land-input:focus {
          outline: none;
          border-color: ${hexToRgba(T.primary,.55)} !important;
          background: rgba(255,255,255,.08) !important;
          box-shadow: 0 0 0 4px ${hexToRgba(T.primary,.14)} !important;
        }
        .land-input::placeholder { color: rgba(255,255,255,.28); }

        .land-feature-card { transition: all .25s cubic-bezier(.2,.8,.2,1); cursor: default; }
        .land-feature-card:hover {
          border-color: rgba(255,255,255,.16) !important;
          background: rgba(255,255,255,.07) !important;
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.04);
        }

        .land-org-chip { transition: transform .18s cubic-bezier(.2,.8,.2,1), border-color .18s, box-shadow .18s; }
        .land-org-chip:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.2) !important; box-shadow: 0 10px 26px rgba(0,0,0,.35); }

        .land-ticker-wrap { overflow: hidden; width: 100%; }
        .land-ticker-inner { display: flex; gap: 0; width: max-content; animation: land-ticker 32s linear infinite; }
        .land-ticker-inner:hover { animation-play-state: paused; }

        .land-nav-link { transition: color .15s; }
        .land-nav-link:hover { color: ${T.ink} !important; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${hexToRgba(T.primary,.35)}; border-radius:3px; }

        section[id] { scroll-margin-top: 96px; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }

        html, body { overflow-x: hidden; max-width: 100%; }
        img, svg { max-width: 100%; }

        @media (max-width: 980px) {
          .land-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }

        @media (max-width: 860px) {
          .land-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .land-org-grid { grid-template-columns: 1fr 1fr !important; }
          .land-features-grid { grid-template-columns: 1fr 1fr !important; }
          .land-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .land-nav-links { display: none !important; }
          .land-cta-box { padding: 44px 36px !important; }
        }

        @media (max-width: 640px) {
          .land-container-pad { padding-left: 16px !important; padding-right: 16px !important; }
          .land-hero-section { padding: 116px 16px 36px !important; }
          .land-hero-title { font-size: clamp(30px, 9vw, 42px) !important; letter-spacing: -1px !important; }
          .land-section-pad { padding: 56px 16px !important; }
          .land-section-pad-b { padding: 48px 16px !important; }
          .land-faq-section { padding: 0 16px 56px !important; }
          .land-cta-section { padding: 48px 16px !important; }
          .land-cta-box { flex-direction: column !important; align-items: flex-start !important; text-align: left !important; padding: 28px 22px !important; gap: 22px !important; }
          .land-cta-box > div:last-child { align-items: stretch !important; width: 100%; }
          .land-cta-box .land-btn { width: 100%; justify-content: center !important; }
          .land-footer { padding: 36px 16px 20px !important; }
          .land-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; row-gap: 28px !important; }
          .land-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .land-modal-sheet { padding: 14px 16px 20px !important; border-radius: 24px !important; max-height: 88vh !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch; }
          .land-stats-grid { margin-top: 36px !important; gap: 8px !important; }
          .land-features-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .land-org-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .land-input, input.land-input { font-size: 16px !important; }
          .land-header { flex-direction: row; align-items: center !important; gap: 10px; flex-wrap: nowrap !important; }
          .land-nav-actions { display: flex; gap: 6px !important; }
          .land-hero-glow { width: 320px !important; height: 200px !important; }
        }

        @media (max-width: 460px) {
          .land-nav-btn-label { display: none !important; }
          .land-nav-btn { padding: 10px !important; }
          .land-profile-role { display: none !important; }
          .land-footer-grid { grid-template-columns: 1fr !important; gap: 26px !important; }
          .land-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .land-org-grid { grid-template-columns: 1fr !important; }
          .land-features-grid { gap: 10px !important; }
          .land-hero-title { font-size: clamp(26px, 10vw, 34px) !important; }
          .land-hero-section { padding: 108px 14px 30px !important; }
          .land-logo-badge { width: 30px !important; height: 30px !important; }
        }

        @media (max-width: 380px) {
          .land-nav-actions .land-nav-btn { padding: 9px !important; }
          .land-cta-box { padding: 22px 16px !important; }
        }
      `}</style>

      <Aurora />

      {/* ── HEADER ── */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        padding: scrolled ? '14px 28px' : '26px 28px',
        background: scrolled ? 'rgba(7,8,15,.55)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? `1px solid ${T.glassBorder}` : '1px solid transparent',
        transition:'all .35s cubic-bezier(.2,.8,.2,1)',
      }}>
        <div className="land-header" style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, color:T.ink, flexShrink:0 }}>
            <div className="land-logo-badge" style={{
              width:34, height:34, borderRadius:11, flexShrink:0,
              background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <img src={logoUrl} alt="StateCore" width={20} height={20} style={{ display:'block', filter:`drop-shadow(0 0 8px ${hexToRgba(T.orange,.65)})` }}/>
            </div>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:800, letterSpacing:'-0.2px' }}>
              STATE<span style={{ color:T.orange }}>CORE</span>
            </span>
          </div>

          {/* Right-side actions */}
          {currentUser ? (
            <div className="land-nav-actions" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button
                onClick={() => onOpenApp && onOpenApp()}
                title="Перейти в кабинет"
                style={{
                  display:'flex', alignItems:'center', gap:9, background:'rgba(255,255,255,.05)',
                  border:`1px solid ${T.glassBorder}`, borderRadius:14, padding:'6px 14px 6px 6px',
                  cursor:'pointer', transition:'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=hexToRgba(T.primary,.4); e.currentTarget.style.background='rgba(255,255,255,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.background='rgba(255,255,255,.05)' }}
              >
                <div style={{
                  width:26, height:26, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(160deg, ${T.primary} 0%, ${T.primaryDeep} 100%)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700, color:'#fff', overflow:'hidden'
                }}>
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    (currentUser.nickname || currentUser.login || '?')[0].toUpperCase()
                  )}
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.1 }}>
                    {currentUser.nickname || currentUser.login}
                  </div>
                  <div className="land-profile-role" style={{ fontSize:10, color:T.primarySoft, fontWeight:600 }}>
                    {currentUser.roleName}
                  </div>
                </div>
              </button>
              {onLogout && (
                <NavButton icon={IC.x(14)} onClick={onLogout}>
                  <span className="land-nav-btn-label">Выйти</span>
                </NavButton>
              )}
            </div>
          ) : (
            <div className="land-nav-actions" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <NavButton icon={IC.user(16)} onClick={() => openModal('register')}>
                <span className="land-nav-btn-label">Регистрация</span>
              </NavButton>
              <NavButton icon={IC.logIn(16)} onClick={() => openModal('login')} highlight>
                <span className="land-nav-btn-label">Личный кабинет</span>
              </NavButton>
            </div>
          )}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="land-hero-section" style={{ position:'relative', zIndex:1, maxWidth:900, margin:'0 auto', padding:'180px 24px 40px', textAlign:'center' }}>
        <div aria-hidden className="land-hero-glow" style={{
          position:'absolute', top:120, left:'50%', transform:'translateX(-50%)',
          width:560, height:280, borderRadius:'50%', maxWidth:'90vw',
          background:`radial-gradient(ellipse, ${hexToRgba(T.orange,.16)} 0%, transparent 70%)`,
          filter:'blur(20px)', zIndex:-1, animation:'land-glow-pulse 4.5s ease-in-out infinite',
        }}/>

        <div style={{
          fontSize:11, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase',
          color:hexToRgba(T.orange,.8), marginBottom:18,
          animation:'land-fadeUp .6s cubic-bezier(.2,.8,.2,1) both',
        }}>
          Выбор администраторов Online RP
        </div>

        <h1 className="land-hero-title" style={{
          fontFamily:FONT_DISPLAY, fontSize:'clamp(36px, 5.6vw, 64px)', fontWeight:900,
          letterSpacing:'-1.8px', lineHeight:1.1,
          margin:'0 0 26px', color:T.ink,
          animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .08s both',
        }}>
          Добро пожаловать в<br/>
          <span style={{ color:T.orange, textShadow:`0 0 40px ${hexToRgba(T.orange,.45)}` }}>STATECORE</span>
        </h1>

        <p style={{
          fontSize:16.5, color:T.ink2, lineHeight:1.65, maxWidth:600, margin:'0 auto 40px',
          animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .16s both',
        }}>
          Один интерфейс вместо десятков вкладок: назначения, реестры и живой мониторинг фракций — на любом устройстве и в реальном времени.
        </p>

        <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center', animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .24s both' }}>
          <Pill
            variant="primary"
            onClick={() => currentUser ? (onOpenApp && onOpenApp()) : openModal('login')}
            style={{ padding:'15px 30px', fontSize:15 }}
          >
            {currentUser ? 'Перейти в кабинет' : 'Войти в аккаунт'}
          </Pill>
          <a
            href="#возможности"
            style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, color:T.ink2, padding:'15px 26px', borderRadius:14, fontSize:15, fontWeight:600, textDecoration:'none', transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.22)'; e.currentTarget.style.color=T.ink; e.currentTarget.style.background='rgba(255,255,255,.08)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.color=T.ink2; e.currentTarget.style.background='rgba(255,255,255,.05)' }}
          >
            Узнать больше
          </a>
        </div>

        <div style={{ display:'flex', justifyContent:'center', marginTop:76, animation:'land-fadeIn 1s ease .6s both' }}>
          <div style={{ width:26, height:40, borderRadius:14, border:`1.5px solid ${T.glassBorder}`, display:'flex', justifyContent:'center', paddingTop:7 }}>
            <div style={{ width:4, height:8, borderRadius:2, background:T.ink3, animation:'land-float 1.6s ease-in-out infinite' }}/>
          </div>
        </div>
      </section>

      {/* STATS ROW */}
      <section style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'40px auto 0', padding:'0 24px' }}>
        <div className="land-stats-grid" style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12,
          animation:'land-fadeUp .7s cubic-bezier(.2,.8,.2,1) .1s both',
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              padding:'26px 22px',
              background:'rgba(255,255,255,.015)',
              border:`1px solid rgba(255,255,255,.08)`,
              borderRadius:14,
              textAlign:'center',
            }}>
              <div style={{ fontSize:'clamp(26px, 3.2vw, 36px)', fontWeight:800, color:T.orange, letterSpacing:'-1px', lineHeight:1 }}>
                <Counter to={s.val} />{s.suffix}
              </div>
              <div style={{ fontSize:11.5, color:T.ink3, marginTop:8, lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position:'relative', zIndex:1, overflow:'hidden', padding:'18px 0', marginTop:64, borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div className="land-ticker-inner">
          {[...Array(2)].map((_, ri) => (
            <div key={ri} style={{ display:'flex', gap:0 }}>
              {['LSPD','FBI','LSFD','GOV','LSMC','FIB','ARMY','COURT','LSPD','FBI','LSFD','GOV'].map((t, i) => (
                <div key={`${ri}-${i}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'0 36px', whiteSpace:'nowrap' }}>
                  <span style={{ fontFamily:FONT_MONO, fontSize:12, fontWeight:600, letterSpacing:'1.5px', color:T.ink3, textTransform:'uppercase' }}>{t}</span>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:hexToRgba(T.primary,.35) }}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE MONITORING ── */}
      <section className="land-section-pad" style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'88px 24px 0' }}>
        <div className="land-hero-grid" style={{ display:'grid', gridTemplateColumns:'0.95fr 1.05fr', gap:56, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', inset:-2, borderRadius:24, background:`linear-gradient(120deg, ${hexToRgba(T.primary,.18)}, transparent 45%, transparent 55%, ${hexToRgba(T.blue,.12)})`, filter:'blur(20px)', opacity:.5, zIndex:-1 }}/>
            <SystemConsole />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase', color:hexToRgba(T.orange,.8), marginBottom:14 }}>
              Реальное время
            </div>
            <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:'clamp(24px, 3vw, 34px)', fontWeight:900, letterSpacing:'-0.9px', lineHeight:1.2, marginBottom:14 }}>
              Каждое действие<br/><span style={{ color:T.orange }}>зафиксировано и учтено</span>
            </h2>
            <p style={{ fontSize:14.5, color:T.ink2, lineHeight:1.65, maxWidth:420 }}>
              Все назначения, выговоры и изменения в реестрах попадают в единый журнал событий — с точным временем и исполнителем.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="возможности" className="land-section-pad" style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'96px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase', color:hexToRgba(T.orange,.8), marginBottom:14 }}>
            Возможности
          </div>
          <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:'clamp(26px, 3.4vw, 40px)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.18, marginBottom:14 }}>
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
                position:'relative', overflow:'hidden',
                background:'rgba(255,255,255,.015)',
                border:`1px solid rgba(255,255,255,.08)`,
                borderRadius:14, padding:'26px 24px 26px 27px',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,.35), 0 0 32px ${hexToRgba(f.color,.16)}` }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:f.color, boxShadow:`0 0 12px ${f.color}` }}/>
              <div style={{
                width:44, height:44, borderRadius:13, marginBottom:18,
                background:hexToRgba(f.color,.12),
                display:'flex', alignItems:'center', justifyContent:'center',
                color: f.color,
                boxShadow:`0 0 20px ${hexToRgba(f.color,.25)}`,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize:16, fontWeight:800, marginBottom:8, color:T.ink, letterSpacing:'-0.2px' }}>{f.title}</h3>
              <p style={{ fontSize:13.5, color:T.ink2, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ORGANIZATIONS ── */}
      <section id="организации" className="land-section-pad-b" style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'88px 24px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div className="land-hero-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase', color:hexToRgba(T.blue,.8), marginBottom:14 }}>
                Организации
              </div>
              <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:'clamp(26px, 3.1vw, 36px)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.18, marginBottom:14 }}>
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
                    position:'relative', overflow:'hidden',
                    background: org.active ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.01)',
                    border: `1px solid rgba(255,255,255,.08)`,
                    borderRadius:12, padding:'15px 16px 15px 19px',
                    display:'flex', alignItems:'center', gap:12,
                    opacity: org.active ? 1 : .5,
                  }}
                >
                  {org.active && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:org.color, boxShadow:`0 0 10px ${org.color}` }}/>}
                  <div style={{
                    width:36, height:36, borderRadius:11, flexShrink:0,
                    background: org.active ? hexToRgba(org.color,.12) : 'rgba(255,255,255,.05)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:800, color: org.active ? org.color : T.ink3,
                    letterSpacing:'.3px',
                    boxShadow: org.active ? `0 0 16px ${hexToRgba(org.color,.3)}` : 'none',
                  }}>
                    {org.name.slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:700, color: org.active ? T.ink : T.ink3, marginBottom:2 }}>{org.name}</div>
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
      <section className="land-cta-section" style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'88px 24px' }}>
        <div className="land-cta-box" style={{
          background:'rgba(255,255,255,.015)',
          border:`1px solid rgba(255,255,255,.08)`,
          borderRadius:20, padding:'56px 48px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:40, flexWrap:'wrap',
          position:'relative', overflow:'hidden',
        }}>
          <div aria-hidden style={{
            position:'absolute', top:'-40%', right:'-10%', width:360, height:360, borderRadius:'50%',
            background:`radial-gradient(circle, ${hexToRgba(T.orange,.18)} 0%, transparent 70%)`,
            filter:'blur(10px)', animation:'land-glow-pulse 5s ease-in-out infinite', pointerEvents:'none',
          }}/>
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:'2.5px', textTransform:'uppercase', color:hexToRgba(T.orange,.8), marginBottom:14 }}>
              Закрытый доступ
            </div>
            <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:'clamp(22px, 2.6vw, 32px)', fontWeight:900, letterSpacing:'-0.6px', lineHeight:1.2, marginBottom:12 }}>
              Готовы войти в систему?
            </h2>
            <p style={{ fontSize:14, color:T.ink2, maxWidth:420, lineHeight:1.6 }}>
              Доступ предоставляется исключительно сотрудникам Следящей Администрации. Учётные данные выдаются Главным Следящим.
            </p>
          </div>
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
            <Pill
              variant="primary"
              onClick={() => currentUser ? (onOpenApp && onOpenApp()) : openModal('login')}
              style={{ padding:'16px 34px', fontSize:15 }}
            >
              {IC.shield(16)} {currentUser ? 'Перейти в кабинет' : 'Войти в систему'}
            </Pill>
            <p style={{ fontSize:11, color:T.ink3, textAlign:'center' }}>
              Только для авторизованных сотрудников
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="land-faq-section" style={{ position:'relative', zIndex:1, maxWidth:760, margin:'0 auto', padding:'0 24px 96px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:`1px solid ${T.glassBorder}`, borderRadius:999, padding:'6px 14px', marginBottom:18, fontSize:12, fontWeight:600, color:T.ink2 }}>
            Вопросы и ответы
          </div>
          <h2 style={{ fontFamily:FONT_DISPLAY, fontSize:'clamp(24px, 3vw, 36px)', fontWeight:800, letterSpacing:'-1px' }}>
            FAQ
          </h2>
        </div>
        <div style={{ background:'rgba(255,255,255,.035)', border:`1px solid ${T.glassBorder}`, borderRadius:20, padding:'6px 24px' }}>
          {faq.map((item, i) => <FaqItem key={i} n={`0${i+1}`} {...item} />)}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="land-footer" style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,.06)', padding:'44px 24px 28px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div className="land-footer-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
                <img src={logoUrl} alt="StateCore" width={20} height={20} style={{ display:'block', filter:`drop-shadow(0 0 6px ${hexToRgba(T.primarySoft,.55)})` }}/>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:14.5, fontWeight:800 }}>STATE<span style={{ color:T.primarySoft }}>CORE</span></span>
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
                  onMouseEnter={e => { e.currentTarget.style.borderColor=hexToRgba(T.primary,.35); e.currentTarget.style.color=T.primarySoft }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.glassBorder; e.currentTarget.style.color=T.ink3 }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {[
              { title:'Навигация', links:['Возможности','Организации','FAQ'] },
              { title:'Система', links:['Мониторинг','Лидеры','Реестр запретов'] },
              { title:'Доступ', links:['Войти','Регистрация','Поддержка'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', color:T.ink3, marginBottom:16 }}>{col.title}</div>
                {col.links.map(l => (
                  <div
                    key={l}
                    style={{ fontSize:13.5, color:T.ink2, marginBottom:12, cursor:'pointer', transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color=T.ink}
                    onMouseLeave={e => e.currentTarget.style.color=T.ink2}
                  >{l}</div>
                ))}
              </div>
            ))}
          </div>

          <div className="land-footer-bottom" style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:12, color:T.ink3 }}>
              © 2026 STATECORE. Все права защищены.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:T.green, boxShadow:`0 0 8px ${T.green}`, animation:'land-pulse-dot 2s ease infinite' }}/>
              <span style={{ fontSize:12, color:T.ink3 }}>Все системы работают штатно</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODAL ── */}
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
            className="land-modal-sheet"
            style={{
              width:'100%', maxWidth:440,
              background:'linear-gradient(160deg, #171a30 0%, #0b0d18 100%)',
              backdropFilter:'blur(34px) saturate(190%)', WebkitBackdropFilter:'blur(34px) saturate(190%)',
              border:`1px solid rgba(255,255,255,.09)`, borderRadius:28, padding:'14px 28px 28px',
              boxShadow:`0 40px 100px rgba(0,0,0,.75), 0 0 0 1px ${hexToRgba(T.primary,.08)}, inset 0 1px 0 rgba(255,255,255,.06)`,
              opacity: modalVisible ? 1 : 0,
              transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(20px)',
              transition:'all .32s cubic-bezier(.2,.9,.25,1)',
              position:'relative', overflow:'hidden',
            }}>
            <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:260, height:160, background:`radial-gradient(ellipse, ${hexToRgba(T.primary,.18)} 0%, transparent 72%)`, pointerEvents:'none' }}/>

            <div style={{ width:38, height:5, borderRadius:3, background:'rgba(255,255,255,.22)', margin:'2px auto 20px', cursor:'grab', position:'relative' }}/>

            <button
              onClick={closeModal}
              style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.08)', border:`1px solid ${T.glassBorder}`, borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:T.ink2, cursor:'pointer', transition:'all .15s', zIndex:1 }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.16)'; e.currentTarget.style.color=T.ink }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.color=T.ink2 }}
            >
              {IC.x(15)}
            </button>

            {/* STEP: HERO */}
            {step === 'hero' && (
              <div style={{ animation:'land-scaleIn .28s ease both', position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:hexToRgba(T.primary,.15), color:T.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {IC.shield(24)}
                  </div>
                </div>
                <div style={{ marginBottom:22, textAlign:'center' }}>
                  <h2 style={{ margin:0, fontFamily:FONT_DISPLAY, fontSize:21, fontWeight:800, letterSpacing:'-0.4px' }}>Войти или зарегистрироваться</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>Выберите действие, чтобы продолжить</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { key:'login', icon:IC.arrow(16), color:T.primary, title:'Войти', desc:'У меня уже есть аккаунт' },
                    { key:'register', icon:IC.user(16), color:T.blue, desc:'Первый раз в системе', title:'Зарегистрироваться' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setStep(opt.key)}
                      className="land-btn"
                      style={{
                        display:'flex', alignItems:'center', gap:13, width:'100%', textAlign:'left',
                        background:'rgba(255,255,255,.055)', border:`1px solid ${T.glassBorder}`,
                        borderRadius:16, padding:'13px 14px', cursor:'pointer', fontFamily:FONT,
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
                  onClick={() => {
                    if (requires2FA) {
                      setRequires2FA(false)
                      setTwoFactorCode('')
                      setError('')
                    } else {
                      setStep('hero')
                      setError('')
                    }
                  }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.ink2, fontSize:12, cursor:'pointer', marginBottom:22, padding:0, transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color=T.ink}
                  onMouseLeave={e => e.currentTarget.style.color=T.ink2}
                >
                  {IC.chevLeft(15)} Назад
                </button>
                <div style={{ marginBottom:26 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10.5, color:T.primarySoft, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                    {IC.shield(14)} Следящая Администрация
                  </div>
                  <h2 style={{ margin:0, fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>
                    {requires2FA ? 'Подтверждение 2FA' : 'Вход в систему'}
                  </h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>
                    {requires2FA ? 'Введите 6-значный код из Google Authenticator' : 'Введите данные, выданные Главным Следящим'}
                  </p>
                </div>

                {!requires2FA ? (
                  <>
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
                  </>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                    <div
                      style={{ position:'relative', display:'flex', gap:8, justifyContent:'center' }}
                      onClick={() => document.getElementById('twofa-code-input')?.focus()}
                    >
                      <input
                        id="twofa-code-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={twoFactorCode}
                        maxLength={6}
                        onChange={e => { setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        autoFocus
                        style={{
                          position:'absolute', inset:0, width:'100%', height:'100%',
                          opacity:0, border:'none', outline:'none', padding:0, margin:0,
                          cursor:'text', fontSize:16,
                        }}
                      />
                      {Array.from({ length: 6 }).map((_, i) => {
                        const digit = twoFactorCode[i]
                        const isActive = i === twoFactorCode.length
                        return (
                          <div
                            key={i}
                            style={{
                              width:44, height:52, borderRadius:12,
                              background:'rgba(255,255,255,.06)',
                              border:`1px solid ${error ? hexToRgba(T.red,.5) : isActive ? T.primarySoft : T.glassBorder}`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:20, fontFamily:FONT_MONO, fontWeight:700, color:T.ink,
                              transition:'border-color .15s',
                              pointerEvents:'none',
                            }}
                          >
                            {digit || ''}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

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
                    <> {requires2FA ? 'Подтвердить' : 'Войти'} {IC.arrow(16)} </>
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
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:10.5, color:T.primarySoft, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:8, fontWeight:700 }}>
                    Регистрация
                  </div>
                  <h2 style={{ margin:0, fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:800 }}>Создать аккаунт</h2>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:T.ink2 }}>Логин, никнейм, VK/Forum и пароль</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, color:T.ink2, marginBottom:6 }}>Логин <span style={{color:hexToRgba(T.primarySoft,.9), fontSize:10}}>макс. 10 символов</span></div>
                    <input
                      placeholder="login"
                      value={regLogin}
                      maxLength={10}
                      onChange={e => setRegLogin(e.target.value.replace(/\s/g,''))}
                      className="land-input"
                      style={{ width:'100%', padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,.06)', border:`1px solid ${regLogin.length===10?hexToRgba(T.primary,.5):T.glassBorder}`, color:T.ink, fontFamily:FONT_MONO, letterSpacing:'0.5px' }}
                    />
                    <div style={{ fontFamily:FONT_MONO, fontSize:10, color: regLogin.length===10?T.primarySoft:'rgba(255,255,255,.25)', textAlign:'right', marginTop:4 }}>{regLogin.length}/10</div>
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

                <div style={{
                  display:'flex', alignItems:'flex-start', gap:10,
                  background:hexToRgba(T.yellow,.08), border:`1px solid ${hexToRgba(T.yellow,.25)}`,
                  borderRadius:12, padding:'11px 13px', marginTop:14, marginBottom:6,
                }}>
                  <span style={{ color:T.yellow, flexShrink:0, marginTop:1 }}>{IC.warning(15)}</span>
                  <span style={{ fontSize:11.5, color:T.ink2, lineHeight:1.5 }}>
                    Не используйте здесь пароль от вашего аккаунта Online RP — придумайте отдельный, новый пароль.
                  </span>
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
                <h3 style={{ margin:'0 0 6px', fontFamily:FONT_DISPLAY, fontSize:19, fontWeight:800 }}>Добро пожаловать!</h3>
                <p style={{ margin:0, fontSize:13, color:T.ink2 }}>Перенаправляем в систему…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}