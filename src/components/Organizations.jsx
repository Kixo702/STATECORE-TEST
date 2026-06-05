import { useEffect, useState } from 'react'
import banner from '../assets/banner.png'

// ── Org icons (импортируй только те, что реально есть) ─────────
// Файлы: src/assets/org-icons/*.png, размер 48×48 px, PNG с прозрачным фоном
import icPolice  from '../assets/org-icons/police.png'
import icGov     from '../assets/org-icons/gov.png'
import icArmy    from '../assets/org-icons/army.png'
import icFbi     from '../assets/org-icons/fbi.png'
import icMedical from '../assets/org-icons/medical.png'
// Добавь при необходимости:
// import icFire    from '../assets/org-icons/fire.png'
// import icCustoms from '../assets/org-icons/customs.png'
// import icNews    from '../assets/org-icons/news.png'
// import icEnergy  from '../assets/org-icons/energy.png'

// Ключи — точные названия орг из твоей таблицы (org.name)
const ORG_ICONS = {
  'LSPD':  icPolice,
  'SFPD':  icPolice,
  'LVmPD':  icPolice,
  'GOV':     icGov,
  'USMC':    icArmy,
  'FBI':     icFbi,
  'MCLS': icMedical,
  'MCSF': icMedical,
  'MCLV': icMedical,
  // 'FIRE':    icFire,
  // 'CUSTOMS': icCustoms,
  // 'NEWS':    icNews,
  // 'ENERGY':  icEnergy,
}

// ── SVG Icons ────────────────────────────────────────────────
const IconShield = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconRefresh = ({ spinning }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'org-spin 0.7s linear infinite' : 'none' }}>
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconWarn = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconSpeech = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUserPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
)
const IconUserX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconCrown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/>
  </svg>
)
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ── Helpers ──────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0]
const addDays = (iso, n) => {
  const d = new Date(iso); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
const fmtDate = iso => {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return `${day}.${m}.${y}`
}

// ── Accent colors per org index ──────────────────────────────
const ORG_ACCENTS = [
  { main: '#60a5fa', glow: 'rgba(96,165,250,.4)',   light: 'rgba(96,165,250,.1)',   dark: 'rgba(96,165,250,.06)'  },
  { main: '#c084fc', glow: 'rgba(192,132,252,.4)',  light: 'rgba(192,132,252,.1)',  dark: 'rgba(192,132,252,.06)' },
  { main: '#22d3ee', glow: 'rgba(34,211,238,.4)',   light: 'rgba(34,211,238,.1)',   dark: 'rgba(34,211,238,.06)'  },
  { main: '#fbbf24', glow: 'rgba(251,191,36,.4)',   light: 'rgba(251,191,36,.1)',   dark: 'rgba(251,191,36,.06)'  },
  { main: '#34d399', glow: 'rgba(52,211,153,.4)',   light: 'rgba(52,211,153,.1)',   dark: 'rgba(52,211,153,.06)'  },
  { main: '#f87171', glow: 'rgba(248,113,113,.4)',  light: 'rgba(248,113,113,.1)',  dark: 'rgba(248,113,113,.06)' },
  { main: '#fb923c', glow: 'rgba(251,146,60,.4)',   light: 'rgba(251,146,60,.1)',   dark: 'rgba(251,146,60,.06)'  },
  { main: '#a78bfa', glow: 'rgba(167,139,250,.4)',  light: 'rgba(167,139,250,.1)',  dark: 'rgba(167,139,250,.06)' },
  { main: '#f472b6', glow: 'rgba(244,114,182,.4)',  light: 'rgba(244,114,182,.1)',  dark: 'rgba(244,114,182,.06)' },
]

// ── Main ─────────────────────────────────────────────────────
import { canRemoveLeader } from '../lib/roles'

export default function Organizations({ user }) {
  const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/export?format=csv'
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKkpW841ffumVxopzGxtECxH9-4yp-mbQa_8L4_uMrAKVsl3-yrso54sjYQrbo2Ym1/exec'

  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)

  const [fNick, setFNick] = useState('')
  const [fVK, setFVK]     = useState('')
  const [fForum, setFForum] = useState('')
  const [fAppoint, setFAppoint] = useState(todayISO())
  const [fExpiry, setFExpiry]   = useState(addDays(todayISO(), 28))

  // ── Warn modal ─────────────────────────────────────────────
  const [warnModal, setWarnModal] = useState(null) // { type, label, color, glow } | null
  const [warnNote, setWarnNote]   = useState('')

  const openWarnModal  = (btn) => { setWarnModal(btn); setWarnNote('') }
  const closeWarnModal = ()    => { setWarnModal(null); setWarnNote('') }
  const confirmWarn    = ()    => {
    if (!warnNote.trim()) return
    send({ type: warnModal.type, rowId: sel.id, value: 1, note: warnNote.trim() })
    closeWarnModal()
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    setFExpiry(addDays(fAppoint, sel?.name === 'GOV' ? 30 : 28))
  }, [fAppoint, sel?.name])

  const load = async () => {
    setRefreshing(true)
    if (orgs.length === 0) setLoading(true)
    try {
      const res = await fetch(`${SHEETS_URL}&cacheBust=${Date.now()}`)
      const csv = await res.text()
      const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
      const parsed = rows.slice(5, 14).map((row, i) => {
        const c = s => s?.replace(/"/g, '').trim() || ''
        return {
          id: i + 6,
          name: c(row[3]),
          leader: c(row[2]) || 'Вакантно',
          vk: c(row[4]) || '—',
          strict: Number((c(row[8]) || '0/3').split('/')[0]) || 0,
          oral:   Number((c(row[9]) || '0/3').split('/')[0]) || 0,
        }
      })
      setOrgs(parsed)
      setSel(prev => prev ? (parsed.find(o => o.name === prev.name) ?? null) : null)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const send = async payload => {
    setBusy(true)
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await new Promise(r => setTimeout(r, 1300))
      await load()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  const handleSetLeader = () => {
    if (!canRemoveLeader(user)) {
      alert('Недостаточно прав для назначения лидера')
      return
    }
    send({
      type: 'SET_LEADER',
      rowId: sel.id,
      name:  fNick,
      vk:    fVK,
      forum: fForum,
      appointDate: fmtDate(fAppoint),
      expiryDate:  fmtDate(fExpiry),
    })
    setFNick(''); setFVK(''); setFForum(''); setFAppoint(todayISO())
  }

  const vacant = sel?.leader === 'Вакантно'
  const selIdx = sel ? orgs.findIndex(o => o.name === sel.name) : 0
  const selAccent = ORG_ACCENTS[selIdx % ORG_ACCENTS.length] || ORG_ACCENTS[0]

  return (
    <div style={{
      fontFamily: "'Syne', 'Onest', 'Segoe UI', sans-serif",
      color: '#e8edf5',
      background: '#060810',
      minHeight: '100vh',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@400;500;600;700;800;900&display=swap');

        @keyframes org-spin    { to { transform: rotate(360deg); } }
        @keyframes org-fadeUp  { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes org-fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes org-pulse   { 0%,100%{opacity:.25} 50%{opacity:.7} }
        @keyframes float-orb   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.05)} }
        @keyframes org-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes scanline    { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes glow-pulse  { 0%,100%{opacity:.4} 50%{opacity:.9} }

        * { box-sizing: border-box; }

        /* ── Card ── */
        .org-card {
          transition:
            border-color .28s ease,
            background .28s ease,
            transform .3s cubic-bezier(.34,1.56,.64,1),
            box-shadow .28s ease;
          cursor: pointer;
          font-family: inherit;
        }
        .org-card:hover { transform: translateY(-6px) scale(1.018) !important; }
        .org-card:active { transform: translateY(-2px) scale(1.006) !important; }

        /* ── Button ── */
        .org-btn {
          transition:
            background .18s ease,
            border-color .18s ease,
            box-shadow .2s ease,
            transform .16s cubic-bezier(.34,1.56,.64,1),
            filter .18s ease,
            color .18s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }
        .org-btn:hover { transform: translateY(-2px); }
        .org-btn:active { transform: translateY(0) scale(.97); }

        /* ── Input ── */
        .org-input {
          transition: border-color .18s, background .18s, box-shadow .2s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .org-input:focus { outline: none; background: rgba(255,255,255,.09) !important; }
        .org-input::placeholder { color: rgba(255,255,255,.2); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.45); cursor: pointer; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { filter: invert(.85); }

        /* ── Scrollbar ── */
        .org-panel-scroll::-webkit-scrollbar { width: 3px; }
        .org-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .org-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

        /* ── Layout ── */
        .org-page-body { max-width: 1600px; margin: 0 auto; padding: 36px 48px; }
        .org-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 20px; margin-bottom: 44px; flex-wrap: wrap;
        }
        .org-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
        }
        .org-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .org-panel {
          background: linear-gradient(160deg, rgba(16,20,36,.99) 0%, rgba(8,10,18,1) 100%);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 28px;
          padding: 28px;
          position: sticky;
          top: 24px;
          backdrop-filter: blur(30px);
          box-shadow:
            0 30px 90px rgba(0,0,0,.7),
            inset 0 1px 0 rgba(255,255,255,.06),
            inset 0 -1px 0 rgba(0,0,0,.4);
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .org-section-label {
          font-size: 9px; letter-spacing: 3.5px; text-transform: uppercase;
          color: rgba(255,255,255,.28); font-weight: 700; margin-bottom: 10px;
          font-family: 'Onest', sans-serif;
        }
        .org-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent);
          margin: 22px 0;
        }

        /* ── Leader avatar ring ── */
        .leader-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 800;
          flex-shrink: 0;
          font-family: 'Onest', sans-serif;
          position: relative;
        }

        /* ── Card inner mobile tweaks ── */
        @media (max-width: 560px) {
          .leader-avatar { width: 38px; height: 38px; font-size: 14px; }
          .org-card-leader-name { font-size: 14px !important; }
          .org-card-leader-role { font-size: 9px !important; }
          .org-card-org-name { font-size: 11px !important; letter-spacing: 1.5px !important; }
          .org-card-icon { width: 38px !important; height: 38px !important; border-radius: 10px !important; }
          .org-card-icon img { width: 22px !important; height: 22px !important; }
          .org-card-badge { font-size: 8.5px !important; padding: 3px 9px !important; }
        }

        /* ── Responsive ── */
        
        @media (max-width: 900px) {
          .org-page-body { padding: 24px 20px 32px; }
          .org-layout { grid-template-columns: 1fr; }
          .org-panel { position: static; top: auto; max-height: none; }
        }
        /* ── Tablet ── */
        @media (max-width: 768px) {
          .org-page-body { padding: 20px 16px 40px; }
          .org-card-grid { gap: 12px; }
          .org-header { margin-bottom: 28px; }
          .org-panel { border-radius: 24px; padding: 22px; }
          .org-banner-wrap { padding: 0 16px !important; }
        }

        @media (max-width: 640px) {
          .org-page-body { padding: 16px 12px 48px; }
          .org-card-grid { grid-template-columns: 1fr; gap: 10px; }
          .org-layout { gap: 16px; }
          .org-panel { border-radius: 20px; padding: 18px; }
          .org-header { flex-direction: column; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
          .org-header-refresh { width: 100% !important; justify-content: center !important; }
          .org-title { font-size: 34px !important; letter-spacing: -1.5px !important; }
          .org-banner-wrap { padding: 0 12px !important; }
        }

        /* ── Bottom-sheet modal on mobile ── */
        @keyframes org-slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (max-width: 640px) {
          .org-warn-modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .org-warn-modal-box {
            border-radius: 24px 24px 0 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 28px 20px 40px !important;
            animation: org-slideUp .28s cubic-bezier(.34,1.2,.64,1) both !important;
          }
        }

        /* ── Small mobile ── */
        @media (max-width: 390px) {
          .org-page-body { padding: 12px 10px 48px; }
          .org-panel { padding: 14px; }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div style={{
        width: '100%', background: '#060810',
        paddingTop: '20px', paddingBottom: '0',
        borderBottom: '1px solid rgba(255,255,255,.04)',
      }}>
        <div className="org-banner-wrap" style={{ padding: '0 48px' }}>
          <div style={{
            position: 'relative', width: '100%', maxHeight: '160px',
            overflow: 'hidden', borderRadius: '20px',
          }}>
            <img src={banner} alt="banner" style={{ width: '100%', objectFit: 'contain', display: 'block' }}/>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100px',
              background: 'linear-gradient(to top, #060810, transparent)',
              pointerEvents: 'none',
            }}/>
          </div>
        </div>
      </div>

      <div className="org-page-body">

        {/* ── HEADER ── */}
        <div className="org-header">
          <div>
            <div className="org-breadcrumb" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '10px', color: 'rgba(255,255,255,.25)',
              letterSpacing: '2.5px', textTransform: 'uppercase',
              marginBottom: '14px', fontWeight: 700,
              fontFamily: 'Onest, sans-serif',
            }}>
              <span>Реестр</span>
              <span style={{ opacity: .35 }}><IconChevron /></span>
              <span style={{ color: 'rgba(255,255,255,.5)' }}>Государственные структуры</span>
            </div>

            <h1 className="org-title" style={{
              margin: 0, fontSize: '46px', fontWeight: 800,
              letterSpacing: '-2px', lineHeight: 1,
              background: 'linear-gradient(125deg, #ffffff 0%, rgba(255,255,255,.5) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontFamily: 'Syne, sans-serif',
            }}>
              Организации
            </h1>
            <p className="org-subtitle" style={{
              margin: '10px 0 0', fontSize: '14px',
              color: 'rgba(255,255,255,.32)', fontWeight: 500, letterSpacing: '.2px',
            }}>
              Управление и контроль государственных структур
            </p>
          </div>

          <button
            onClick={load}
            className="org-btn org-header-refresh"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.55)',
              padding: '12px 24px', borderRadius: '14px',
              fontSize: '11px', letterSpacing: '2px', fontWeight: 700,
              textTransform: 'uppercase', fontFamily: 'Onest, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.1)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,.55)'
            }}
          >
            <IconRefresh spinning={refreshing} />
            Обновить
          </button>
        </div>

        {/* ── GRID + PANEL ── */}
        <div className="org-layout">

          {/* ── ORG CARDS ── */}
          <div>
            {loading ? (
              <div style={{
                color: 'rgba(255,255,255,.2)', fontSize: '11px',
                padding: '80px 0', animation: 'org-pulse 1.4s ease infinite',
                letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 700,
                fontFamily: 'Onest, sans-serif',
              }}>
                Загрузка данных…
              </div>
            ) : (
              <div className="org-card-grid">
                {orgs.map((org, idx) => {
                  const isSel    = sel?.name === org.name
                  const isVacant = org.leader === 'Вакантно'
                  const accent   = ORG_ACCENTS[idx % ORG_ACCENTS.length]
                  const orgIcon  = ORG_ICONS[org.name]
                  const initials = isVacant ? '?' : org.leader.slice(0, 2).toUpperCase()

                  return (
                    <div
                      key={org.name}
                      className="org-card"
                      onClick={() => setSel(org)}
                      style={{
                        background: isSel
                          ? `linear-gradient(150deg, ${accent.dark} 0%, rgba(8,10,18,.97) 60%)`
                          : isVacant
                            ? 'linear-gradient(160deg, rgba(248,113,113,.04) 0%, rgba(8,10,18,.95) 70%)'
                            : 'linear-gradient(160deg, rgba(255,255,255,.025) 0%, rgba(8,10,18,.95) 70%)',
                        border: `1px solid ${
                          isSel ? accent.main + '55'
                            : isVacant ? 'rgba(248,113,113,.18)'
                            : 'rgba(255,255,255,.07)'
                        }`,
                        borderRadius: '24px',
                        padding: '26px 26px 30px',
                        boxShadow: isSel
                          ? `0 12px 48px ${accent.glow}, 0 0 0 1px ${accent.main}18, inset 0 1px 0 rgba(255,255,255,.07)`
                          : isVacant
                            ? '0 4px 24px rgba(248,113,113,.05), inset 0 1px 0 rgba(255,255,255,.03)'
                            : '0 4px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.03)',
                        animation: `org-fadeUp .5s ease both ${idx * 0.07}s`,
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      {/* top glow stripe */}
                      {isSel && (
                        <div style={{
                          position: 'absolute', top: 0, left: '20px', right: '20px', height: '1.5px',
                          background: `linear-gradient(90deg, transparent, ${accent.main}90, transparent)`,
                          animation: 'glow-pulse 2.5s ease-in-out infinite',
                        }}/>
                      )}

                      {/* ambient orb */}
                      {isSel && (
                        <div style={{
                          position: 'absolute', top: '-80px', right: '-80px',
                          width: '200px', height: '200px',
                          background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
                          pointerEvents: 'none',
                          animation: 'float-orb 4.5s ease-in-out infinite',
                        }}/>
                      )}

                      {/* ── TOP ROW: org icon + id badge ── */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        marginBottom: '20px',
                      }}>
                        {/* Org icon */}
                        <div className="org-card-icon" style={{
                          width: '48px', height: '48px',
                          borderRadius: '14px',
                          background: isSel ? `${accent.light}` : 'rgba(255,255,255,.05)',
                          border: `1px solid ${isSel ? accent.main + '35' : 'rgba(255,255,255,.08)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: isSel ? `0 4px 16px ${accent.glow}` : 'none',
                          transition: 'all .28s',
                          flexShrink: 0,
                        }}>
                          {orgIcon ? (
                            <img
                              src={orgIcon}
                              alt={org.name}
                              width={28}
                              height={28}
                              style={{
                                objectFit: 'contain',
                                filter: isSel
                                  ? 'brightness(1) saturate(1.2)'
                                  : 'brightness(.55) saturate(0)',
                                transition: 'filter .28s',
                              }}
                            />
                          ) : (
                            <span style={{
                              color: isSel ? accent.main : 'rgba(255,255,255,.2)',
                              transition: 'color .28s',
                            }}>
                              <IconShield size={20} />
                            </span>
                          )}
                        </div>

                        {/* ID badge */}
                        <span style={{
                          fontSize: '9px', fontWeight: 800,
                          color: isSel ? accent.main : 'rgba(255,255,255,.25)',
                          letterSpacing: '2px', textTransform: 'uppercase',
                          background: isSel ? `${accent.light}` : 'rgba(255,255,255,.04)',
                          padding: '5px 10px', borderRadius: '8px',
                          border: `1px solid ${isSel ? accent.main + '35' : 'rgba(255,255,255,.07)'}`,
                          transition: 'all .25s',
                          fontFamily: 'Onest, sans-serif',
                        }}>
                          #{org.id}
                        </span>
                      </div>

                      {/* ── ORG NAME ── */}
                      <div className="org-card-org-name" style={{
                        fontSize: '13px', fontWeight: 700,
                        letterSpacing: '2.5px', textTransform: 'uppercase',
                        color: isSel ? accent.main : 'rgba(255,255,255,.4)',
                        marginBottom: '10px',
                        transition: 'color .25s',
                        fontFamily: 'Onest, sans-serif',
                      }}>
                        {org.name}
                      </div>

                      {/* ── LEADER — приоритет ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: '18px',
                      }}>
                        {/* Avatar circle */}
                        <div className="leader-avatar" style={{
                          background: isVacant
                            ? 'rgba(248,113,113,.1)'
                            : isSel
                              ? accent.light
                              : 'rgba(255,255,255,.07)',
                          border: `1.5px solid ${
                            isVacant ? 'rgba(248,113,113,.3)'
                              : isSel ? accent.main + '50'
                              : 'rgba(255,255,255,.1)'
                          }`,
                          color: isVacant ? '#f87171'
                            : isSel ? accent.main
                            : 'rgba(255,255,255,.5)',
                          boxShadow: isSel && !isVacant ? `0 0 16px ${accent.glow}` : 'none',
                          transition: 'all .28s',
                        }}>
                          {isVacant ? '—' : initials}
                        </div>

                        {/* Name block */}
                        <div style={{ minWidth: 0 }}>
                          <div className="org-card-leader-name" style={{
                            fontSize: '16px', fontWeight: 800,
                            color: isVacant ? 'rgba(248,113,113,.6)' : '#eef2f5',
                            fontStyle: isVacant ? 'italic' : 'normal',
                            letterSpacing: isVacant ? '.5px' : '-0.3px',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: isVacant ? 'inherit' : 'Onest, sans-serif',
                            transition: 'color .25s',
                          }}>
                            {org.leader}
                          </div>
                          {!isVacant && (
                            <div className="org-card-leader-role" style={{
                              fontSize: '10px', color: isSel ? accent.main : 'rgba(255,255,255,.28)',
                              fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                              marginTop: '2px', transition: 'color .25s',
                              fontFamily: 'Onest, sans-serif',
                              display: 'flex', alignItems: 'center', gap: '5px',
                            }}>
                              <IconCrown /> Лидер
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── WARN BADGES ── */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                          {
                            label: `СВ · ${org.strict}/3`, active: org.strict > 0,
                            color: '#f87171', border: 'rgba(248,113,113,.4)',
                            bg: 'linear-gradient(135deg, rgba(248,113,113,.18), rgba(248,113,113,.08))',
                          },
                          {
                            label: `УВ · ${org.oral}/3`, active: org.oral > 0,
                            color: '#fbbf24', border: 'rgba(251,191,36,.4)',
                            bg: 'linear-gradient(135deg, rgba(251,191,36,.18), rgba(251,191,36,.08))',
                          },
                        ].map(b => (
                          <span key={b.label} className="org-card-badge" style={{
                            padding: '4px 12px', borderRadius: '10px',
                            fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.5px',
                            border: `1px solid ${b.active ? b.border : 'rgba(255,255,255,.06)'}`,
                            color: b.active ? b.color : 'rgba(255,255,255,.18)',
                            background: b.active ? b.bg : 'transparent',
                            boxShadow: b.active ? `0 2px 10px rgba(0,0,0,.25)` : 'none',
                            fontFamily: 'Onest, sans-serif',
                          }}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="org-panel org-panel-scroll">
            {sel ? (
              <div key={sel.name} style={{ animation: 'org-fadeUp .3s ease both' }}>

                {/* ── PANEL HEADER ── */}
                <div style={{ marginBottom: '22px' }}>
                  <div className="org-section-label">Управление</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* org icon in panel */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: selAccent.light,
                      border: `1px solid ${selAccent.main}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 20px ${selAccent.glow}`,
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {ORG_ICONS[sel.name] ? (
                        <img
                          src={ORG_ICONS[sel.name]} alt={sel.name}
                          width={28} height={28}
                          style={{ objectFit: 'contain', filter: 'brightness(1.1) saturate(1.3)' }}
                        />
                      ) : (
                        <span style={{ color: selAccent.main }}><IconShield size={22}/></span>
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '28px', fontWeight: 800,
                        letterSpacing: '-1px', lineHeight: 1,
                        color: selAccent.main,
                        filter: `drop-shadow(0 0 14px ${selAccent.main}70)`,
                        fontFamily: 'Syne, sans-serif',
                      }}>
                        {sel.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CURRENT LEADER CARD ── */}
                <div style={{
                  background: `linear-gradient(135deg, ${selAccent.dark} 0%, rgba(255,255,255,.015) 100%)`,
                  border: `1px solid ${selAccent.main}28`,
                  borderRadius: '18px',
                  padding: '18px',
                  marginBottom: '22px',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.05), 0 4px 24px rgba(0,0,0,.4)`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                    background: `linear-gradient(90deg, transparent, ${selAccent.main}55, transparent)`,
                  }}/>

                  <div style={{
                    fontSize: '9px', color: selAccent.main, letterSpacing: '2.5px',
                    textTransform: 'uppercase', marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontWeight: 700, opacity: .85, fontFamily: 'Onest, sans-serif',
                  }}>
                    <IconCrown /> Текущий лидер
                  </div>

                  {/* leader big display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                      background: vacant
                        ? 'rgba(248,113,113,.1)'
                        : `linear-gradient(135deg, ${selAccent.light} 0%, ${selAccent.dark} 100%)`,
                      border: `2px solid ${vacant ? 'rgba(248,113,113,.3)' : selAccent.main + '60'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 900,
                      color: vacant ? '#f87171' : selAccent.main,
                      boxShadow: vacant ? 'none' : `0 0 24px ${selAccent.glow}`,
                      fontFamily: 'Onest, sans-serif',
                    }}>
                      {vacant ? '—' : sel.leader.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '18px', fontWeight: 800,
                        color: vacant ? 'rgba(248,113,113,.5)' : '#f0f4fa',
                        fontStyle: vacant ? 'italic' : 'normal',
                        lineHeight: 1.2,
                        fontFamily: 'Onest, sans-serif',
                      }}>
                        {sel.leader}
                      </div>
                      {sel.vk && sel.vk !== '—' && (
                        <div style={{
                          fontSize: '11px', color: 'rgba(255,255,255,.3)',
                          fontWeight: 500, marginTop: '3px',
                        }}>
                          {sel.vk}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="org-divider" />

                {vacant ? (
                  /* ── VACANT: appoint form ── */
                  <>
                    <div className="org-section-label">Назначение лидера</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                      {[
                        { val: fNick,  set: setFNick,  ph: 'Ник лидера',       icon: <IconUser/> },
                        { val: fVK,    set: setFVK,    ph: 'VK',               icon: <IconLink/> },
                        { val: fForum, set: setFForum, ph: 'Форумный аккаунт', icon: <IconLink/> },
                      ].map(f => (
                        <div key={f.ph} style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,.22)', pointerEvents: 'none', display: 'flex',
                          }}>
                            {f.icon}
                          </span>
                          <input
                            type="text" className="org-input"
                            placeholder={f.ph} value={f.val}
                            onChange={e => f.set(e.target.value)}
                            style={{
                              background: 'rgba(255,255,255,.04)',
                              border: '1px solid rgba(255,255,255,.09)',
                              color: '#eef2f8',
                              padding: '12px 14px 12px 38px',
                              borderRadius: '13px', fontSize: '13px', width: '100%',
                              fontFamily: 'inherit',
                              boxShadow: 'inset 0 1px 4px rgba(0,0,0,.3)',
                            }}
                            onFocus={e => {
                              e.currentTarget.style.borderColor = selAccent.main + '70'
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}14, inset 0 1px 4px rgba(0,0,0,.3)`
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'
                              e.currentTarget.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,.3)'
                            }}
                          />
                        </div>
                      ))}

                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{
                            fontSize: '9px', color: 'rgba(255,255,255,.28)',
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            marginBottom: '6px', paddingLeft: '2px', fontWeight: 700,
                            fontFamily: 'Onest, sans-serif',
                          }}>
                            {f.label}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <span style={{
                              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                              color: 'rgba(255,255,255,.22)', pointerEvents: 'none', display: 'flex',
                            }}>
                              <IconCalendar />
                            </span>
                            <input
                              type="date" className="org-input" value={f.val}
                              onChange={e => f.set(e.target.value)}
                              style={{
                                background: 'rgba(255,255,255,.04)',
                                border: '1px solid rgba(255,255,255,.09)',
                                color: '#eef2f8',
                                padding: '12px 14px 12px 38px',
                                borderRadius: '13px', fontSize: '13px', width: '100%',
                                fontFamily: 'inherit', colorScheme: 'dark',
                                boxShadow: 'inset 0 1px 4px rgba(0,0,0,.3)',
                              }}
                              onFocus={e => {
                                e.currentTarget.style.borderColor = selAccent.main + '70'
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}14, inset 0 1px 4px rgba(0,0,0,.3)`
                              }}
                              onBlur={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'
                                e.currentTarget.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,.3)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="org-btn"
                      onClick={handleSetLeader}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                        border: '1px solid rgba(34,197,94,.4)',
                        color: '#fff', padding: '14px 20px', borderRadius: '14px',
                        fontSize: '11px', letterSpacing: '2px', fontWeight: 800,
                        width: '100%', textTransform: 'uppercase',
                        boxShadow: '0 4px 28px rgba(34,197,94,.3)',
                        fontFamily: 'Onest, sans-serif',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = '0 8px 36px rgba(34,197,94,.5)'
                        e.currentTarget.style.filter = 'brightness(1.1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = '0 4px 28px rgba(34,197,94,.3)'
                        e.currentTarget.style.filter = 'brightness(1)'
                      }}
                    >
                      <IconUserPlus /> Назначить лидера
                    </button>
                  </>
                ) : (
                  /* ── HAS LEADER: warns + date edit + dismiss ── */
                  <>
                    <div className="org-section-label">Взыскания</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {[
                        {
                          label: 'Строгий выговор', icon: <IconWarn/>, type: 'CHANGE_STRICT',
                          bg: 'rgba(248,113,113,.1)', bgHover: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                          border: 'rgba(248,113,113,.25)', borderHover: 'rgba(248,113,113,.6)',
                          color: '#f87171', colorHover: '#fff', glow: 'rgba(239,68,68,.4)',
                        },
                        {
                          label: 'Устный выговор', icon: <IconSpeech/>, type: 'CHANGE_ORAL',
                          bg: 'rgba(251,191,36,.08)', bgHover: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'rgba(251,191,36,.22)', borderHover: 'rgba(251,191,36,.6)',
                          color: '#fbbf24', colorHover: '#fff', glow: 'rgba(245,158,11,.4)',
                        },
                      ].map(btn => (
                        <button
                          key={btn.type}
                          className="org-btn"
                          onClick={() => openWarnModal(btn)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: btn.bg,
                            border: `1px solid ${btn.border}`,
                            color: btn.color,
                            padding: '13px 16px', borderRadius: '14px',
                            fontSize: '11px', letterSpacing: '1.5px', fontWeight: 800,
                            width: '100%', textAlign: 'left', textTransform: 'uppercase',
                            fontFamily: 'Onest, sans-serif',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = btn.bgHover
                            e.currentTarget.style.borderColor = btn.borderHover
                            e.currentTarget.style.color = btn.colorHover
                            e.currentTarget.style.boxShadow = `0 6px 24px ${btn.glow}`
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = btn.bg
                            e.currentTarget.style.borderColor = btn.border
                            e.currentTarget.style.color = btn.color
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          {btn.icon} {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="org-divider" />

                    <div className="org-section-label">Изменить даты</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                        { label: `Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{
                            fontSize: '9px', color: 'rgba(255,255,255,.28)',
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            marginBottom: '6px', paddingLeft: '2px', fontWeight: 700,
                            fontFamily: 'Onest, sans-serif',
                          }}>
                            {f.label}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <span style={{
                              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                              color: 'rgba(255,255,255,.22)', pointerEvents: 'none', display: 'flex',
                            }}>
                              <IconCalendar />
                            </span>
                            <input
                              type="date" className="org-input" value={f.val}
                              onChange={e => f.set(e.target.value)}
                              style={{
                                background: 'rgba(255,255,255,.04)',
                                border: '1px solid rgba(255,255,255,.09)',
                                color: '#eef2f8',
                                padding: '12px 14px 12px 38px',
                                borderRadius: '13px', fontSize: '13px', width: '100%',
                                fontFamily: 'inherit', colorScheme: 'dark',
                                boxShadow: 'inset 0 1px 4px rgba(0,0,0,.3)',
                              }}
                              onFocus={e => {
                                e.currentTarget.style.borderColor = selAccent.main + '70'
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${selAccent.main}14, inset 0 1px 4px rgba(0,0,0,.3)`
                              }}
                              onBlur={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'
                                e.currentTarget.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,.3)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="org-btn"
                      onClick={() => {
                        if (!canRemoveLeader(user)) { alert('Недостаточно прав для снятия лидера'); return }
                        send({ type: 'KICK_LEADER', rowId: sel.id })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        background: 'rgba(239,68,68,.08)',
                        border: '1px solid rgba(239,68,68,.2)',
                        color: '#f87171', padding: '14px 20px', borderRadius: '14px',
                        fontSize: '11px', letterSpacing: '2px', fontWeight: 800,
                        width: '100%', textTransform: 'uppercase',
                        fontFamily: 'Onest, sans-serif',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                        e.currentTarget.style.color = '#fff'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,.5)'
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(239,68,68,.45)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,.08)'
                        e.currentTarget.style.color = '#f87171'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,.2)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <IconUserX /> Снять лидера
                    </button>
                  </>
                )}

              </div>
            ) : (
              /* ── EMPTY STATE ── */
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: 'rgba(255,255,255,.15)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
                }}>
                  <IconShield size={26} />
                </div>
                <div style={{
                  fontSize: '13px', color: 'rgba(255,255,255,.28)',
                  fontWeight: 700, letterSpacing: '.8px',
                  fontFamily: 'Onest, sans-serif',
                }}>
                  Выберите организацию
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.13)', marginTop: '5px' }}>
                  для управления
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── WARN NOTE MODAL ── */}
      {warnModal && (
        <div
          className="org-warn-modal-overlay"
          onClick={closeWarnModal}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.75)',
            backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 60,
            animation: 'org-fadeIn .18s ease both',
            padding: '20px',
          }}
        >
          <div
            className="org-warn-modal-box"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg, #141b2e 0%, #090d1a 100%)',
              border: `1px solid ${warnModal.color}30`,
              borderRadius: '26px',
              padding: '32px',
              width: '100%', maxWidth: '420px',
              boxShadow: `0 40px 100px rgba(0,0,0,.8), 0 0 0 1px ${warnModal.color}15, inset 0 1px 0 rgba(255,255,255,.06)`,
              animation: 'org-fadeUp .22s cubic-bezier(.34,1.56,.64,1) both',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: '20px', right: '20px', height: '1.5px',
              background: `linear-gradient(90deg, transparent, ${warnModal.color}70, transparent)`,
            }}/>

            {/* icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                background: `rgba(${warnModal.color === '#f87171' ? '248,113,113' : '251,191,36'},.12)`,
                border: `1px solid ${warnModal.color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: warnModal.color,
                boxShadow: `0 4px 18px ${warnModal.glow}`,
              }}>
                {warnModal.type === 'CHANGE_STRICT' ? <IconWarn /> : <IconSpeech />}
              </div>
              <div>
                <div style={{
                  fontSize: '9px', color: warnModal.color, letterSpacing: '3px',
                  textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px',
                  fontFamily: 'Onest, sans-serif', opacity: .8,
                }}>
                  Выговор
                </div>
                <div style={{
                  fontSize: '18px', fontWeight: 800, color: '#f0f4fa',
                  letterSpacing: '-0.3px', fontFamily: 'Syne, sans-serif',
                }}>
                  {warnModal.label}
                </div>
              </div>
            </div>

            {/* label */}
            <div style={{
              fontSize: '9px', color: 'rgba(255,255,255,.28)',
              letterSpacing: '2.5px', textTransform: 'uppercase',
              fontWeight: 700, marginBottom: '10px',
              fontFamily: 'Onest, sans-serif',
            }}>
              Примечание к выговору
            </div>

            {/* textarea */}
            <textarea
              autoFocus
              placeholder="Опишите причину выговора…"
              value={warnNote}
              onChange={e => setWarnNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) confirmWarn() }}
              rows={4}
              style={{
                width: '100%', resize: 'none',
                background: 'rgba(255,255,255,.04)',
                border: `1px solid ${warnNote.trim() ? warnModal.color + '50' : 'rgba(255,255,255,.09)'}`,
                color: '#eef2f8',
                padding: '14px 16px',
                borderRadius: '14px', fontSize: '13px',
                fontFamily: 'Onest, sans-serif',
                lineHeight: 1.6,
                colorScheme: 'dark',
                boxShadow: warnNote.trim()
                  ? `0 0 0 3px ${warnModal.color}12, inset 0 1px 4px rgba(0,0,0,.3)`
                  : 'inset 0 1px 4px rgba(0,0,0,.3)',
                outline: 'none',
                transition: 'border-color .18s, box-shadow .18s',
                marginBottom: '8px',
              }}
            />
            <div style={{
              fontSize: '10px', color: 'rgba(255,255,255,.18)',
              textAlign: 'right', marginBottom: '20px',
              fontFamily: 'Onest, sans-serif',
            }}>
              Ctrl+Enter — подтвердить
            </div>

            {/* buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="org-btn"
                onClick={closeWarnModal}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'rgba(255,255,255,.5)',
                  padding: '13px 0', borderRadius: '13px',
                  fontSize: '11px', letterSpacing: '1.5px',
                  fontWeight: 800, textTransform: 'uppercase',
                  fontFamily: 'Onest, sans-serif',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,.1)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,.5)'
                }}
              >
                Назад
              </button>

              <button
                className="org-btn"
                onClick={confirmWarn}
                disabled={!warnNote.trim()}
                style={{
                  flex: 2,
                  background: warnNote.trim()
                    ? warnModal.type === 'CHANGE_STRICT'
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'rgba(255,255,255,.05)',
                  border: `1px solid ${warnNote.trim() ? warnModal.color + '50' : 'rgba(255,255,255,.08)'}`,
                  color: warnNote.trim() ? '#fff' : 'rgba(255,255,255,.2)',
                  padding: '13px 0', borderRadius: '13px',
                  fontSize: '11px', letterSpacing: '1.5px',
                  fontWeight: 800, textTransform: 'uppercase',
                  fontFamily: 'Onest, sans-serif',
                  boxShadow: warnNote.trim() ? `0 4px 20px ${warnModal.glow}` : 'none',
                  cursor: warnNote.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => {
                  if (!warnNote.trim()) return
                  e.currentTarget.style.boxShadow = `0 8px 32px ${warnModal.glow}`
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = warnNote.trim() ? `0 4px 20px ${warnModal.glow}` : 'none'
                  e.currentTarget.style.filter = 'brightness(1)'
                }}
              >
                Выдать выговор
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUSY OVERLAY ── */}
      {busy && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.82)',
          backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
          animation: 'org-fadeIn .18s ease both',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #121828 0%, #080b14 100%)',
            border: '1px solid rgba(255,255,255,.09)',
            borderRadius: '26px',
            padding: '42px 64px',
            textAlign: 'center',
            boxShadow: '0 40px 100px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.06)',
          }}>
            <div style={{
              width: '40px', height: '40px', margin: '0 auto 20px',
              border: '2.5px solid rgba(255,255,255,.07)',
              borderTopColor: '#fbbf24',
              borderRadius: '50%',
              animation: 'org-spin .7s linear infinite',
              boxShadow: '0 0 20px rgba(251,191,36,.2)',
            }}/>
            <div style={{
              color: 'rgba(255,255,255,.4)', fontSize: '10px',
              letterSpacing: '4px', textTransform: 'uppercase',
              fontWeight: 800, fontFamily: 'Onest, sans-serif',
            }}>
              Сохранение…
            </div>
          </div>
        </div>
      )}
    </div>
  )
}