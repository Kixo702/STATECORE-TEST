import { useEffect, useState } from 'react'
import banner from '../assets/banner.png'

// ── SVG Icons ────────────────────────────────────────────────
const IconShield = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconRefresh = ({ spinning }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'org-spin 0.7s linear infinite' : 'none' }}>
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconSpeech = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUserPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
)
const IconUserX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconCrown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z"/>
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

// ── Main ─────────────────────────────────────────────────────
export default function Organizations() {
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

  return (
    <div style={{
      fontFamily: 'inherit',
      color: '#e8edf3',
      background: '#0b0f19',
      minHeight: '100vh',
    }}>
      <style>{`
        @keyframes org-spin    { to { transform: rotate(360deg); } }
        @keyframes org-fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes org-pulse   { 0%,100%{opacity:.35} 50%{opacity:.85} }
        @keyframes org-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes org-glow    { 0%,100%{box-shadow:0 0 20px rgba(255,140,0,.15)} 50%{box-shadow:0 0 35px rgba(255,140,0,.35)} }

        .org-card {
          transition: border-color .22s ease, background .22s ease,
                      transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease;
          cursor: pointer;
        }
        .org-card:hover { transform: translateY(-3px) scale(1.01) !important; }
        .org-card:active { transform: translateY(-1px) scale(1.005) !important; }

        .org-btn {
          transition: background .16s ease, border-color .16s ease,
                      box-shadow .16s ease, transform .12s cubic-bezier(.34,1.56,.64,1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .org-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background .16s ease;
          border-radius: inherit;
        }
        .org-btn:hover { transform: translateY(-2px); }
        .org-btn:active { transform: translateY(0) scale(.98); }

        .org-input {
          transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
          box-sizing: border-box;
        }
        .org-input:focus {
          outline: none;
          border-color: rgba(255,140,0,.6) !important;
          background: rgba(255,255,255,0.07) !important;
          box-shadow: 0 0 0 3px rgba(255,140,0,.1), inset 0 1px 3px rgba(0,0,0,.2) !important;
        }
        .org-input::placeholder { color: rgba(255,255,255,.25); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.6); cursor: pointer; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { filter: invert(.9); }

        .org-panel-scroll::-webkit-scrollbar { width: 4px; }
        .org-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .org-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

        .org-page-body {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 40px;
        }
        .org-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .org-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        .org-card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .org-panel {
          background: linear-gradient(160deg, rgba(17,24,39,.95) 0%, rgba(11,15,25,.98) 100%);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 24px;
          padding: 22px;
          position: sticky;
          top: 24px;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05);
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .org-banner { width: 100%; }

        @media (max-width: 900px) {
          .org-page-body { padding: 24px 20px 32px; }
          .org-header { align-items: flex-start; }
          .org-layout { grid-template-columns: 1fr; }
          .org-panel { position: static; top: auto; max-height: none; }
        }
        @media (max-width: 640px) {
          .org-page-body { padding: 20px 14px 28px; }
          .org-card-grid { grid-template-columns: 1fr; }
          .org-panel { border-radius: 20px; padding: 18px; }
          .org-btn { width: 100%; }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div className="org-banner" style={{ width:'100%', background:'#0b0f19', paddingTop:'16px', paddingBottom:'8px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ padding:'0 32px' }}>
          <div style={{ position:'relative', width:'100%', maxHeight:'140px', overflow:'hidden', borderRadius:'16px' }}>
            <img
              src={banner}
              alt="banner"
              style={{ width:'100%', objectFit:'contain', display:'block' }}
            />
            <div style={{
              position:'absolute', bottom:0, left:0, width:'100%', height:'80px',
              background:'linear-gradient(to top, #0b0f19, transparent)',
              pointerEvents:'none',
            }}/>
          </div>
        </div>
      </div>

      <div className="org-page-body">

      {/* ── HEADER ── */}
      <div className="org-header">
        <div>
          <div style={{
            fontSize:'10px', color:'#5a6370',
            letterSpacing:'3.5px', textTransform:'uppercase', marginBottom:'8px',
          }}>
            Реестр / Государственные структуры
          </div>
          <h1 style={{ margin:0, fontSize:'32px', fontWeight:900, letterSpacing:'-0.5px', color:'#e8edf3' }}>
            Организации
          </h1>
          <p style={{ margin:'6px 0 0', fontSize:'13px', color:'#9aa3b0' }}>
            Управление и контроль государственных структур
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={load}
          className="org-btn"
          style={{
            display:'flex', alignItems:'center', gap:'8px',
            background:'rgba(255,255,255,.05)',
            border:'1px solid rgba(255,255,255,.1)',
            color:'#9aa3b0', padding:'10px 20px', borderRadius:'12px',
            fontSize:'12px', letterSpacing:'0.5px', fontWeight:600,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,.09)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'
            e.currentTarget.style.color = '#e8edf3'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
            e.currentTarget.style.color = '#9aa3b0'
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
              color:'#5a6370', fontSize:'13px', padding:'40px 0',
              animation:'org-pulse 1.4s ease infinite', letterSpacing:'2px', textTransform:'uppercase',
            }}>
              Загрузка данных…
            </div>
          ) : (
            <div className="org-card-grid">
              {orgs.map((org, idx) => {
                const isSel = sel?.name === org.name
                const isVacant = org.leader === 'Вакантно'
                const hasWarns = org.strict > 0 || org.oral > 0
                return (
                  <div
                    key={org.name}
                    className="org-card"
                    onClick={() => setSel(org)}
                    style={{
                      background: isSel
                        ? 'linear-gradient(135deg, rgba(255,140,0,.1) 0%, rgba(255,100,0,.05) 100%)'
                        : isVacant
                          ? 'linear-gradient(160deg, rgba(232,80,80,.07) 0%, rgba(17,24,39,.9) 60%)'
                          : 'linear-gradient(160deg, rgba(46,190,100,.07) 0%, rgba(17,24,39,.9) 60%)',
                      border: `1px solid ${
                        isSel
                          ? 'rgba(255,140,0,.45)'
                          : isVacant
                            ? 'rgba(232,80,80,.2)'
                            : 'rgba(46,190,100,.2)'
                      }`,
                      borderRadius:'20px',
                      padding:'20px 22px',
                      boxShadow: isSel
                        ? '0 8px 32px rgba(255,140,0,.15), inset 0 1px 0 rgba(255,255,255,.05)'
                        : isVacant
                          ? '0 2px 12px rgba(232,80,80,.08), inset 0 1px 0 rgba(255,255,255,.03)'
                          : '0 2px 12px rgba(46,190,100,.08), inset 0 1px 0 rgba(255,255,255,.03)',
                      animation: `org-fadeUp .4s ease both ${idx * 0.07}s`,
                      position:'relative', overflow:'hidden',
                    }}
                  >
                    {/* glow orb top-right when selected */}
                    {isSel && (
                      <div style={{
                        position:'absolute', top:'-50px', right:'-50px',
                        width:'130px', height:'130px',
                        background:'radial-gradient(circle, rgba(255,140,0,.18) 0%, transparent 70%)',
                        pointerEvents:'none',
                      }}/>
                    )}

                    {/* row id + shield icon */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                      <span style={{
                        fontSize:'9px', color:'#5a6370',
                        letterSpacing:'2.5px', textTransform:'uppercase',
                        background:'rgba(255,255,255,.04)', padding:'3px 8px', borderRadius:'6px',
                        border:'1px solid rgba(255,255,255,.07)',
                      }}>
                        Ряд {org.id}
                      </span>
                      <span style={{
                        color: isSel ? 'rgba(255,140,0,.9)' : 'rgba(255,255,255,.2)',
                        transition:'color .2s, filter .2s',
                        filter: isSel ? 'drop-shadow(0 0 5px rgba(255,140,0,.5))' : 'none',
                      }}>
                        <IconShield size={16} />
                      </span>
                    </div>

                    {/* org name */}
                    <div style={{
                      fontSize:'22px', fontWeight:900,
                      color: isSel ? '#ff8c00' : '#e8edf3',
                      marginBottom:'10px', letterSpacing:'-0.3px',
                      transition:'color .2s',
                    }}>
                      {org.name}
                    </div>

                    {/* leader */}
                    <div style={{ marginBottom:'14px' }}>
                      <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'4px' }}>
                        Лидер
                      </div>
                      <div style={{
                        fontSize:'12px',
                        color: isVacant ? '#5a6370' : '#9aa3b0',
                        fontStyle: isVacant ? 'italic' : 'normal',
                        display:'flex', alignItems:'center', gap:'5px',
                      }}>
                        {!isVacant && <span style={{ color:'rgba(255,255,255,.25)' }}><IconUser /></span>}
                        {org.leader}
                      </div>
                    </div>

                    {/* warning badges */}
                    <div style={{ display:'flex', gap:'6px' }}>
                      {[
                        {
                          label: `С ${org.strict}/3`, active: org.strict > 0,
                          color:'#e85050', border:'rgba(232,80,80,.4)', bg:'linear-gradient(135deg, rgba(232,80,80,.18), rgba(232,80,80,.08))'
                        },
                        {
                          label: `У ${org.oral}/3`, active: org.oral > 0,
                          color:'#f5a623', border:'rgba(245,166,35,.4)', bg:'linear-gradient(135deg, rgba(245,166,35,.18), rgba(245,166,35,.08))'
                        },
                      ].map(b => (
                        <span key={b.label} style={{
                          padding:'3px 10px', borderRadius:'8px', fontSize:'10px', fontWeight:800,
                          border:`1px solid ${b.active ? b.border : 'rgba(255,255,255,.08)'}`,
                          color: b.active ? b.color : '#5a6370',
                          background: b.active ? b.bg : 'transparent',
                          letterSpacing:'0.3px',
                          boxShadow: b.active ? `0 2px 8px ${b.active ? 'rgba(0,0,0,.2)' : 'none'}` : 'none',
                        }}>{b.label}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="org-panel org-panel-scroll"
          style={{ overflowY:'auto' }}
        >
          {sel ? (
            <div key={sel.name} style={{ animation:'org-fadeUp .28s ease both' }}>

              {/* panel header */}
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'7px' }}>
                  Управление
                </div>
                <div style={{ fontSize:'22px', fontWeight:900, color:'#ff8c00', letterSpacing:'-0.3px' }}>
                  {sel.name}
                </div>
              </div>

              {/* current leader card */}
              <div style={{
                background:'linear-gradient(135deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.02) 100%)',
                border:'1px solid rgba(255,255,255,.08)',
                borderRadius:'14px', padding:'14px 16px', marginBottom:'16px',
                boxShadow:'inset 0 1px 0 rgba(255,255,255,.04)',
              }}>
                <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <IconCrown /> Текущий лидер
                </div>
                <div style={{
                  fontSize:'14px', fontWeight:700,
                  color: vacant ? '#5a6370' : '#e8edf3',
                  fontStyle: vacant ? 'italic' : 'normal',
                }}>
                  {sel.leader}
                </div>
                <div style={{ fontSize:'11px', color:'#5a6370', marginTop:'4px' }}>{sel.vk}</div>
              </div>

              {/* divider */}
              <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin:'16px 0' }}/>

              {vacant ? (
                /* ── VACANT: only appoint form ── */
                <>
                  <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>
                    Назначение лидера
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'12px' }}>
                    {[
                      { val:fNick,  set:setFNick,  ph:'Ник лидера',       icon:<IconUser/> },
                      { val:fVK,    set:setFVK,    ph:'VK',               icon:<IconLink/> },
                      { val:fForum, set:setFForum, ph:'Форумный аккаунт', icon:<IconLink/> },
                    ].map(f => (
                      <div key={f.ph} style={{ position:'relative' }}>
                        <span style={{
                          position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)',
                          color:'rgba(255,255,255,.28)', pointerEvents:'none', display:'flex',
                        }}>
                          {f.icon}
                        </span>
                        <input
                          type="text"
                          className="org-input"
                          placeholder={f.ph}
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          style={{
                            background:'rgba(255,255,255,.05)',
                            border:'1px solid rgba(255,255,255,.1)',
                            color:'#e8edf3', padding:'10px 12px 10px 34px',
                            borderRadius:'10px', fontSize:'12px',
                            width:'100%', fontFamily:'inherit',
                            boxShadow:'inset 0 1px 3px rgba(0,0,0,.2)',
                          }}
                        />
                      </div>
                    ))}

                    {[
                      { label:'Дата назначения', val:fAppoint, set:setFAppoint },
                      { label:`Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val:fExpiry, set:setFExpiry },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'5px', paddingLeft:'2px' }}>
                          {f.label}
                        </div>
                        <div style={{ position:'relative' }}>
                          <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.28)', pointerEvents:'none', display:'flex' }}>
                            <IconCalendar />
                          </span>
                          <input
                            type="date"
                            className="org-input"
                            value={f.val}
                            onChange={e => f.set(e.target.value)}
                            style={{
                              background:'rgba(255,255,255,.05)',
                              border:'1px solid rgba(255,255,255,.1)',
                              color:'#e8edf3', padding:'10px 12px 10px 34px',
                              borderRadius:'10px', fontSize:'12px',
                              width:'100%', fontFamily:'inherit', colorScheme:'dark',
                              boxShadow:'inset 0 1px 3px rgba(0,0,0,.2)',
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
                      display:'flex', alignItems:'center', gap:'9px',
                      background:'linear-gradient(135deg, #3ecf6e 0%, #27a856 100%)',
                      border:'1px solid rgba(62,207,110,.35)',
                      color:'#fff', padding:'12px 16px', borderRadius:'12px',
                      fontSize:'11px', letterSpacing:'0.8px', fontWeight:900,
                      width:'100%', textTransform:'uppercase',
                      boxShadow:'0 4px 20px rgba(62,207,110,.2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 6px 28px rgba(62,207,110,.4)'
                      e.currentTarget.style.filter = 'brightness(1.08)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(62,207,110,.2)'
                      e.currentTarget.style.filter = 'brightness(1)'
                    }}
                  >
                    <IconUserPlus /> Назначить лидера
                  </button>
                </>
              ) : (
                /* ── HAS LEADER: warns + date edit + dismiss ── */
                <>
                  {/* warn buttons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                    {[
                      {
                        label:'Строгий выговор', icon:<IconWarn/>,
                        type:'CHANGE_STRICT',
                        gradient:'linear-gradient(135deg, rgba(232,80,80,.25) 0%, rgba(200,50,50,.15) 100%)',
                        gradientHover:'linear-gradient(135deg, rgba(232,80,80,.5) 0%, rgba(200,50,50,.35) 100%)',
                        border:'rgba(232,80,80,.35)', borderHover:'rgba(232,80,80,.7)',
                        color:'#e85050', glow:'rgba(232,80,80,.3)',
                      },
                      {
                        label:'Устный выговор', icon:<IconSpeech/>,
                        type:'CHANGE_ORAL',
                        gradient:'linear-gradient(135deg, rgba(245,166,35,.2) 0%, rgba(220,140,20,.12) 100%)',
                        gradientHover:'linear-gradient(135deg, rgba(245,166,35,.45) 0%, rgba(220,140,20,.3) 100%)',
                        border:'rgba(245,166,35,.3)', borderHover:'rgba(245,166,35,.65)',
                        color:'#f5a623', glow:'rgba(245,166,35,.25)',
                      },
                    ].map(btn => (
                      <button
                        key={btn.type}
                        className="org-btn"
                        onClick={() => send({ type: btn.type, rowId: sel.id, value: 1 })}
                        style={{
                          display:'flex', alignItems:'center', gap:'9px',
                          background: btn.gradient, border:`1px solid ${btn.border}`,
                          color: btn.color, padding:'11px 15px', borderRadius:'12px',
                          fontSize:'11px', letterSpacing:'0.8px', fontWeight:800,
                          width:'100%', textAlign:'left', textTransform:'uppercase',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = btn.gradientHover
                          e.currentTarget.style.borderColor = btn.borderHover
                          e.currentTarget.style.boxShadow = `0 4px 20px ${btn.glow}`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = btn.gradient
                          e.currentTarget.style.borderColor = btn.border
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {btn.icon} {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* divider */}
                  <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin:'16px 0' }}/>

                  {/* date edit */}
                  <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>
                    Изменить даты
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                    {[
                      { label:'Дата назначения', val:fAppoint, set:setFAppoint },
                      { label:`Дата снятия (+${sel.name === 'GOV' ? 30 : 28}д)`, val:fExpiry, set:setFExpiry },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize:'9px', color:'#5a6370', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'5px', paddingLeft:'2px' }}>
                          {f.label}
                        </div>
                        <div style={{ position:'relative' }}>
                          <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.28)', pointerEvents:'none', display:'flex' }}>
                            <IconCalendar />
                          </span>
                          <input
                            type="date"
                            className="org-input"
                            value={f.val}
                            onChange={e => f.set(e.target.value)}
                            style={{
                              background:'rgba(255,255,255,.05)',
                              border:'1px solid rgba(255,255,255,.1)',
                              color:'#e8edf3', padding:'10px 12px 10px 34px',
                              borderRadius:'10px', fontSize:'12px',
                              width:'100%', fontFamily:'inherit', colorScheme:'dark',
                              boxShadow:'inset 0 1px 3px rgba(0,0,0,.2)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* dismiss button */}
                  <button
                    className="org-btn"
                    onClick={() => send({ type:'KICK_LEADER', rowId: sel.id })}
                    style={{
                      display:'flex', alignItems:'center', gap:'9px',
                      background:'linear-gradient(135deg, rgba(232,80,80,.15) 0%, rgba(200,50,50,.08) 100%)',
                      border:'1px solid rgba(232,80,80,.3)',
                      color:'#e85050', padding:'12px 16px', borderRadius:'12px',
                      fontSize:'11px', letterSpacing:'0.8px', fontWeight:900,
                      width:'100%', textTransform:'uppercase',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #e85050 0%, #c83232 100%)'
                      e.currentTarget.style.color = '#fff'
                      e.currentTarget.style.borderColor = 'rgba(232,80,80,.6)'
                      e.currentTarget.style.boxShadow = '0 6px 24px rgba(232,80,80,.35)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(232,80,80,.15) 0%, rgba(200,50,50,.08) 100%)'
                      e.currentTarget.style.color = '#e85050'
                      e.currentTarget.style.borderColor = 'rgba(232,80,80,.3)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <IconUserX /> Снять лидера
                  </button>
                </>
              )}

            </div>
          ) : (
            /* empty state */
            <div style={{ padding:'60px 0', textAlign:'center' }}>
              <div style={{
                width:'52px', height:'52px', borderRadius:'16px',
                background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 14px', color:'rgba(255,255,255,.2)',
              }}>
                <IconShield size={22} />
              </div>
              <div style={{ fontSize:'12px', color:'#5a6370', letterSpacing:'0.5px' }}>
                Выберите организацию
              </div>
              <div style={{ fontSize:'11px', color:'rgba(90,99,112,.6)', marginTop:'4px' }}>
                для управления
              </div>
            </div>
          )}
        </div>
      </div>

      </div>{/* end content padding */}

      {/* ── BUSY OVERLAY ── */}
      {busy && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,.75)',
          backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:50, animation:'org-fadeUp .2s ease both',
        }}>
          <div style={{
            background:'linear-gradient(160deg, #161c2e 0%, #0e1220 100%)',
            border:'1px solid rgba(255,255,255,.1)',
            borderRadius:'20px', padding:'34px 50px', textAlign:'center',
            boxShadow:'0 30px 90px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.07)',
          }}>
            <div style={{
              width:'34px', height:'34px', margin:'0 auto 16px',
              border:'2.5px solid rgba(255,140,0,.15)',
              borderTopColor:'#ff8c00',
              borderRadius:'50%',
              animation:'org-spin .7s linear infinite',
              boxShadow:'0 0 14px rgba(255,140,0,.2)',
            }}/>
            <div style={{
              color:'#9aa3b0', fontSize:'11px',
              letterSpacing:'3px', textTransform:'uppercase', fontWeight:700,
            }}>
              Сохранение…
            </div>
          </div>
        </div>
      )}
    </div>
  )
}