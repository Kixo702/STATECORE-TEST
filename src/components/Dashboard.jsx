import { useState, useEffect } from 'react'
import banner from '../assets/banner.png'

// ── Constants ────────────────────────────────────────────────
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1pYaxNrSm37hydzEyLNuQsYOHF4jTfClDoJbqbSCkk2M/export?format=csv'
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKkpW841ffumVxopzGxtECxH9-4yp-mbQa_8L4_uMrAKVsl3-yrso54sjYQrbo2Ym1/exec'

const todayISO = () => new Date().toISOString().split('T')[0]
const addDays  = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const fmtDate  = iso => { if (!iso) return ''; const [y,m,day] = iso.split('-'); return `${day}.${m}.${y}` }

// ── Icons ─────────────────────────────────────────────────────
const IC = {
  org:     <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M4 21V7l8-4 8 4v14" stroke="currentColor" strokeWidth="1.6"/><path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.6"/></svg>,
  crown:   <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="1.6"/></svg>,
  cross:   <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6"/></svg>,
  warning: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><path d="M12 3l9 18H3l9-18z" stroke="currentColor" strokeWidth="1.6"/></svg>,
  bell:    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:       <svg viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  user:    <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>,
  link:    <svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  cal:     <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shield:  <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spin:    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="56" strokeDashoffset="14" strokeLinecap="round"/></svg>,
}

// ── Assign Leader Modal ───────────────────────────────────────
function AssignLeaderModal({ onClose }) {
  const [orgs, setOrgs]         = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [selOrg, setSelOrg]     = useState(null)

  const [fNick, setFNick]       = useState('')
  const [fVK, setFVK]           = useState('')
  const [fForum, setFForum]     = useState('')
  const [fAppoint, setFAppoint] = useState(todayISO())
  const [fExpiry, setFExpiry]   = useState(addDays(todayISO(), 28))

  const [busy, setBusy]         = useState(false)
  const [done, setDone]         = useState(false)
  const [visible, setVisible]   = useState(false)

  // animate in
  useEffect(() => { setTimeout(() => setVisible(true), 10) }, [])

  // load vacant orgs
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${SHEETS_URL}&cacheBust=${Date.now()}`)
        const csv = await res.text()
        const rows = csv.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
        const parsed = rows.slice(5, 14).map((row, i) => {
          const c = s => s?.replace(/"/g, '').trim() || ''
          return { id: i + 6, name: c(row[3]), leader: c(row[2]) || 'Вакантно' }
        }).filter(o => o.leader === 'Вакантно' && o.name)
        setOrgs(parsed)
      } catch (e) { console.error(e) }
      finally { setLoadingOrgs(false) }
    }
    load()
  }, [])

  // auto-update expiry when appoint or org changes
  useEffect(() => {
    setFExpiry(addDays(fAppoint, selOrg?.name === 'GOV' ? 30 : 28))
  }, [fAppoint, selOrg])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleSubmit = async () => {
    if (!selOrg || !fNick.trim()) return
    setBusy(true)
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SET_LEADER',
          rowId: selOrg.id,
          name:  fNick,
          vk:    fVK,
          forum: fForum,
          appointDate: fmtDate(fAppoint),
          expiryDate:  fmtDate(fExpiry),
        }),
      })
      await new Promise(r => setTimeout(r, 1000))
      setDone(true)
      setTimeout(handleClose, 1600)
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  const canSubmit = selOrg && fNick.trim()

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: visible ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(14px)' : 'blur(0px)',
        transition: 'all .28s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'linear-gradient(160deg, #141b2e 0%, #0d1120 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 28,
        boxShadow: '0 40px 100px rgba(0,0,0,.75), 0 0 0 1px rgba(255,140,0,.06), inset 0 1px 0 rgba(255,255,255,.06)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(24px)',
        transition: 'all .28s cubic-bezier(.34,1.2,.64,1)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* top accent bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #ff8c00, #ff5500, #ff8c00)',
          backgroundSize: '200% 100%',
          animation: 'db-shimmer 3s linear infinite',
        }}/>

        {/* glow orb */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(255,140,0,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ padding: '28px 32px 32px' }}>

          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 10, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase',
                color: '#ff8c00', marginBottom: 10, opacity: .85,
              }}>
                <span style={{ width: 16, height: 16, display: 'flex' }}>{IC.shield}</span>
                Назначение лидера
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#f0f4fc', letterSpacing: '-0.4px' }}>
                Выберите организацию
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,.38)', lineHeight: 1.5 }}>
                Заполните данные нового лидера для вакантной должности
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                flexShrink: 0, width: 34, height: 34,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,.4)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='rgba(255,255,255,.4)' }}
            >
              <span style={{ width: 16, height: 16, display: 'flex' }}>{IC.x}</span>
            </button>
          </div>

          {done ? (
            /* ── SUCCESS ── */
            <div style={{ textAlign: 'center', padding: '24px 0 8px', animation: 'db-fadeUp .3s ease both' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(34,197,94,.4)',
                animation: 'db-success .5s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <span style={{ color: '#fff', width: 22, height: 22, display: 'flex' }}>{IC.check}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f0f4fc', marginBottom: 6 }}>Лидер назначен!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Данные сохранены в таблице</div>
            </div>
          ) : (
            <>
              {/* ── ORG SELECTOR ── */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 10 }}>
                  Организация
                </div>
                {loadingOrgs ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.25)', padding: '12px 0', animation: 'db-pulse 1.4s ease infinite' }}>
                    Загрузка…
                  </div>
                ) : orgs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,.07)' }}>
                    Нет вакантных организаций
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {orgs.map(org => {
                      const active = selOrg?.id === org.id
                      return (
                        <button
                          key={org.id}
                          onClick={() => setSelOrg(org)}
                          style={{
                            padding: '8px 18px',
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all .18s cubic-bezier(.34,1.4,.64,1)',
                            background: active
                              ? 'linear-gradient(135deg, #ff8c00, #e06000)'
                              : 'rgba(255,255,255,.05)',
                            border: `1px solid ${active ? 'rgba(255,140,0,.5)' : 'rgba(255,255,255,.1)'}`,
                            color: active ? '#fff' : 'rgba(255,255,255,.6)',
                            boxShadow: active ? '0 4px 18px rgba(255,140,0,.3)' : 'none',
                            transform: active ? 'scale(1.04)' : 'scale(1)',
                          }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,.09)'; e.currentTarget.style.color='#fff' } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.6)' } }}
                        >
                          {org.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── DIVIDER ── */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin: '4px 0 22px' }}/>

              {/* ── FORM FIELDS ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>

                {/* text inputs */}
                {[
                  { val: fNick,  set: setFNick,  ph: 'Ник лидера',        icon: IC.user, req: true  },
                  { val: fVK,    set: setFVK,    ph: 'VK (ссылка/ник)',   icon: IC.link, req: false },
                  { val: fForum, set: setFForum, ph: 'Форумный аккаунт',  icon: IC.link, req: false },
                ].map(f => (
                  <div key={f.ph} style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,.28)', pointerEvents: 'none',
                      width: 15, height: 15, display: 'flex',
                    }}>{f.icon}</span>
                    <input
                      type="text"
                      placeholder={f.ph + (f.req ? ' *' : '')}
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,.05)',
                        border: '1px solid rgba(255,255,255,.1)',
                        borderRadius: 13, padding: '12px 14px 12px 40px',
                        fontSize: 14, color: '#eef2f8', fontFamily: 'inherit',
                        outline: 'none', transition: 'border-color .15s, box-shadow .15s, background .15s',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,140,0,.55)'
                        e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(255,140,0,.12)'
                        e.currentTarget.style.background = 'rgba(255,255,255,.07)'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
                        e.currentTarget.style.boxShadow  = 'none'
                        e.currentTarget.style.background = 'rgba(255,255,255,.05)'
                      }}
                    />
                  </div>
                ))}

                {/* date inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Дата назначения', val: fAppoint, set: setFAppoint },
                    { label: `Снятие (+${selOrg?.name === 'GOV' ? 30 : 28}д)`, val: fExpiry, set: setFExpiry },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 6, paddingLeft: 2 }}>
                        {f.label}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                          color: 'rgba(255,255,255,.28)', pointerEvents: 'none',
                          width: 14, height: 14, display: 'flex',
                        }}>{IC.cal}</span>
                        <input
                          type="date"
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,.05)',
                            border: '1px solid rgba(255,255,255,.1)',
                            borderRadius: 12, padding: '11px 12px 11px 36px',
                            fontSize: 13, color: '#eef2f8', fontFamily: 'inherit',
                            outline: 'none', colorScheme: 'dark',
                            transition: 'border-color .15s, box-shadow .15s',
                          }}
                          onFocus={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,140,0,.55)'
                            e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(255,140,0,.12)'
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
                            e.currentTarget.style.boxShadow  = 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SUBMIT ── */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || busy}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '14px 20px', borderRadius: 14, border: 'none',
                  background: canSubmit && !busy
                    ? 'linear-gradient(135deg, #ff8c00 0%, #e05a00 100%)'
                    : 'rgba(255,255,255,.07)',
                  color: canSubmit && !busy ? '#fff' : 'rgba(255,255,255,.3)',
                  fontSize: 14, fontWeight: 800, letterSpacing: '0.3px',
                  cursor: canSubmit && !busy ? 'pointer' : 'default',
                  boxShadow: canSubmit && !busy ? '0 6px 24px rgba(255,140,0,.3)' : 'none',
                  transition: 'all .2s ease',
                }}
                onMouseEnter={e => { if (canSubmit && !busy) e.currentTarget.style.filter='brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter='brightness(1)' }}
              >
                {busy ? (
                  <>
                    <span style={{ animation: 'db-spin .7s linear infinite', width: 17, height: 17, display: 'flex' }}>{IC.spin}</span>
                    Сохранение…
                  </>
                ) : (
                  <>
                    <span style={{ width: 17, height: 17, display: 'flex' }}>{IC.crown}</span>
                    Назначить лидера
                  </>
                )}
              </button>

              {!selOrg && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 10 }}>
                  Сначала выберите организацию
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [stats] = useState({
    organizations: 12, leaders: 9, vacancies: 3,
    strictWarns: 7, oralWarns: 14, blacklist: 28
  })

  const [showAssign, setShowAssign] = useState(false)

  const recentActions = [
    { admin: 'Robert_Kamiya', action: 'Выдал строгий выговор', target: 'LSPD', time: '13:42' },
    { admin: 'Robert_Kamiya', action: 'Назначил лидера',        target: 'FBI',  time: '12:17' },
    { admin: 'Robert_Kamiya', action: 'Добавил запрет',         target: 'Nick_Ross', time: '11:05' },
    { admin: 'Robert_Kamiya', action: 'Снял лидера',            target: 'LSMC', time: '10:28' },
  ]

  const statCards = [
    { title: 'Организаций',       value: stats.organizations, icon: IC.org,     color: 'text-blue-400'   },
    { title: 'Активных лидеров',  value: stats.leaders,       icon: IC.crown,   color: 'text-orange-400' },
    { title: 'Ваканток',          value: stats.vacancies,     icon: IC.cross,   color: 'text-red-400'    },
    { title: 'Строгих выговоров', value: stats.strictWarns,   icon: IC.warning, color: 'text-yellow-400' },
    { title: 'Устных выговоров',  value: stats.oralWarns,     icon: IC.warning, color: 'text-slate-300'  },
    { title: 'Запретов',          value: stats.blacklist,     icon: IC.cross,   color: 'text-red-500'    },
  ]

  return (
    <div className="text-white bg-[#0b0f19] min-h-screen">
      <style>{`
        @keyframes db-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes db-spin    { to{transform:rotate(360deg)} }
        @keyframes db-fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-pulse   { 0%,100%{opacity:.3} 50%{opacity:.8} }
        @keyframes db-success { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* BANNER */}
      <div className="w-full bg-[#0b0f19] pt-4 pb-2 border-b border-white/5">
        <div className="px-8">
          <div className="relative w-full max-h-[140px] overflow-hidden rounded-2xl">
            <img src={banner} alt="banner" className="w-full object-contain block" />
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#0b0f19] to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-10 py-10 mt-2">

        {/* HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">Мониторинг системы</h1>
            <p className="text-slate-400">Актуальная статистика государственных структур</p>
          </div>
          <button
            style={{
              width: 44, height: 44,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, color: 'rgba(255,255,255,.45)',
              cursor: 'pointer', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,140,0,.1)'; e.currentTarget.style.borderColor='rgba(255,140,0,.25)'; e.currentTarget.style.color='#ff8c00' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.45)' }}
            title="Уведомления (скоро)"
          >
            {IC.bell}
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          {statCards.map(card => (
            <div key={card.title} className="bg-[#111827] border border-white/5 rounded-3xl p-6 hover:border-orange-500/20 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{card.title}</p>
                  <h2 className="text-4xl font-black mt-2">{card.value}</h2>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${card.color}`}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

          {/* ASSIGN LEADER — opens modal */}
          <button
            onClick={() => setShowAssign(true)}
            className="group relative overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 hover:scale-[1.02] shadow-lg shadow-orange-500/20"
          >
            <div className="text-orange-900 mb-3">{IC.crown}</div>
            <h3 className="font-black text-xl mb-1">Назначить лидера</h3>
            <p className="text-white/80 text-sm">Быстрое назначение на должность</p>
          </button>

          {/* BLACKLIST */}
          <button className="group relative overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 hover:bg-gradient-to-br hover:from-red-500 hover:to-pink-600 hover:text-white hover:scale-[1.02]">
            <div className="text-red-400 mb-3 transition group-hover:text-white">{IC.cross}</div>
            <h3 className="font-black text-xl mb-1">Внести в реестр запретов</h3>
            <p className="text-sm text-slate-300 group-hover:text-white/80">Запреты на вступление в гос.организации</p>
          </button>

        </div>

        {/* ACTIVITY */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">Последние действия</h2>
            <button className="text-blue-400 hover:text-blue-300 transition">Все логи →</button>
          </div>
          <div className="space-y-4">
            {recentActions.map((log, i) => (
              <div key={i} className="flex items-center justify-between bg-black/20 rounded-2xl p-4 hover:bg-black/30 hover:translate-x-1 transition-all">
                <div>
                  <h4 className="font-bold">{log.admin}</h4>
                  <p className="text-slate-400 text-sm">{log.action}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{log.target}</p>
                  <span className="text-xs text-slate-500">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL */}
      {showAssign && <AssignLeaderModal onClose={() => setShowAssign(false)} />}
    </div>
  )
}