import { useMemo, useState, useEffect } from 'react'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  } catch { return iso }
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  } catch { return iso }
}

// Generates a short player UID from UUID or creates one
function getPlayerUid(id) {
  if (!id) return 'SC-000000'
  const clean = id.replace(/-/g, '').toUpperCase().slice(0, 6)
  return `SC-${clean}`
}

export default function Profile({ user, onUpdate }) {
  const u = user || (() => {
    try { return JSON.parse(localStorage.getItem('sc_user')) } catch { return null }
  })()

  const data = useMemo(() => ({
    registeredAt: u?.registeredAt || u?.createdAt || u?.regDate || null,
    vk: u?.vk || u?.vkCode || u?.vkUrl || '—',
    forum: u?.forum || '—',
    role: u?.roleName || 'Игрок',
    nickname: u?.nickname || u?.username || u?.name || 'Гость',
    id: u?.id || null,
    login: u?.login || '—',
  }), [u])

  const playerUid = getPlayerUid(data.id)

  // Change logs – stored in localStorage per user
  const logsKey = `sc_logs_${data.id || 'guest'}`
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(logsKey)) || [] } catch { return [] }
  })

  // Nickname editing
  const [editingNick, setEditingNick] = useState(false)
  const [nickValue, setNickValue] = useState(data.nickname)
  const [nickError, setNickError] = useState('')
  const [nickSaving, setNickSaving] = useState(false)

  const pushLog = (text) => {
    const entry = { text, at: new Date().toISOString() }
    const updated = [entry, ...logs].slice(0, 30)
    setLogs(updated)
    localStorage.setItem(logsKey, JSON.stringify(updated))
  }

  const handleSaveNick = () => {
    const trimmed = nickValue.trim()
    if (!trimmed) { setNickError('Никнейм не может быть пустым'); return }
    if (trimmed === data.nickname) { setEditingNick(false); return }
    setNickSaving(true)
    setTimeout(() => {
      try {
        // Update sc_user
        const stored = JSON.parse(localStorage.getItem('sc_user') || '{}')
        stored.nickname = trimmed
        localStorage.setItem('sc_user', JSON.stringify(stored))
        // Update sc_users list
        const raw = localStorage.getItem('sc_users')
        if (raw) {
          const users = JSON.parse(raw)
          const idx = users.findIndex(x => x.id === data.id)
          if (idx !== -1) { users[idx].nickname = trimmed; localStorage.setItem('sc_users', JSON.stringify(users)) }
        }
        pushLog(`Смена никнейма: «${data.nickname}» → «${trimmed}»`)
        onUpdate && onUpdate({ ...stored, nickname: trimmed })
      } catch(e) { console.error(e) }
      setEditingNick(false)
      setNickSaving(false)
      setNickError('')
    }, 400)
  }

  // Copy UID
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(playerUid).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const roleColor = {
    'Администратор': '#ff8c00',
    'Главный Следящий': '#f59e0b',
    'Следящий': '#8b5cf6',
    'Лидер': '#06b6d4',
    'Игрок': '#9aa3b0',
  }[data.role] || '#9aa3b0'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#e8edf3',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '32px 24px',
    }}>
      <style>{`
        @keyframes prof-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes prof-spin { to{transform:rotate(360deg)} }
        @keyframes prof-pop { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes prof-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .prof-input {
          background: rgba(255,255,255,.05);
          border: 1.5px solid rgba(255,140,0,.5);
          color: #e8edf3;
          padding: 9px 13px;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          font-weight: 700;
          width: 100%;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .prof-input:focus {
          border-color: #ff8c00;
          box-shadow: 0 0 0 3px rgba(255,140,0,.15);
        }
        .prof-card {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 14px;
          padding: 16px 18px;
          transition: border-color .2s;
        }
        .prof-card:hover { border-color: rgba(255,255,255,.1); }
        .prof-log-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
          animation: prof-fadeUp .25s ease both;
        }
        .prof-log-item:last-child { border-bottom: none; }
        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,.3);
          padding: 2px 6px;
          border-radius: 6px;
          transition: color .15s, background .15s;
          display: inline-flex;
          align-items: center;
        }
        .copy-btn:hover { color: #ff8c00; background: rgba(255,140,0,.1); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, animation: 'prof-fadeUp .3s ease both' }}>
          <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Следящая Администрация
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>Профиль</h1>
        </div>

        {/* Three-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr 300px',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* ── LEFT: Info panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'prof-fadeUp .35s .05s ease both', animationFillMode:'both' }}>

            <div className="prof-card">
              <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontWeight: 600 }}>Идентификатор</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#ff8c00', letterSpacing: '1px' }}>{playerUid}</span>
                <button className="copy-btn" onClick={handleCopy} title="Скопировать">
                  {copied ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3ecf6e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'prof-pop .3s ease both'}}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="prof-card">
              <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontWeight: 600 }}>Логин</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#c8d0db' }}>{data.login}</div>
            </div>

            <div className="prof-card">
              <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontWeight: 600 }}>Регистрация</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#c8d0db', lineHeight: 1.5 }}>{fmtDate(data.registeredAt)}</div>
            </div>

            <div className="prof-card">
              <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontWeight: 600 }}>ВКонтакте</div>
              {data.vk && data.vk !== '—' ? (
                <a href={data.vk} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4a9eff', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                  {data.vk.replace('https://vk.com/', '@')}
                </a>
              ) : (
                <div style={{ fontSize: 12, color: '#5a6370' }}>Не указан</div>
              )}
            </div>

            <div className="prof-card">
              <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, fontWeight: 600 }}>Форум</div>
              {data.forum && data.forum !== '—' ? (
                <a href={data.forum} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4a9eff', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                  {data.forum.replace(/^https?:\/\//, '').slice(0, 30)}…
                </a>
              ) : (
                <div style={{ fontSize: 12, color: '#5a6370' }}>Не указан</div>
              )}
            </div>

          </div>

          {/* ── CENTER: Profile card ── */}
          <div style={{ animation: 'prof-fadeUp .35s .1s ease both', animationFillMode:'both' }}>
            <div style={{
              background: 'linear-gradient(160deg, rgba(255,140,0,.06) 0%, rgba(255,255,255,.02) 60%)',
              border: '1px solid rgba(255,140,0,.15)',
              borderRadius: 20,
              padding: '36px 32px',
              textAlign: 'center',
            }}>

              {/* Avatar */}
              <div style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                background: 'linear-gradient(135deg, rgba(255,140,0,.2) 0%, rgba(255,140,0,.05) 100%)',
                border: '2px solid rgba(255,140,0,.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 900,
                color: '#ff8c00',
                margin: '0 auto 20px',
                boxShadow: '0 8px 32px rgba(255,140,0,.15)',
                letterSpacing: '-1px',
              }}>
                {data.nickname[0]?.toUpperCase()}
              </div>

              {/* Nickname + edit */}
              {editingNick ? (
                <div style={{ marginBottom: 16 }}>
                  <input
                    className="prof-input"
                    value={nickValue}
                    onChange={e => { setNickValue(e.target.value); setNickError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNick(); if (e.key === 'Escape') { setEditingNick(false); setNickValue(data.nickname); setNickError('') } }}
                    autoFocus
                    maxLength={32}
                    style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}
                  />
                  {nickError && <div style={{ color: '#e85050', fontSize: 12, marginTop: 6 }}>{nickError}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                    <button
                      onClick={handleSaveNick}
                      disabled={nickSaving}
                      style={{
                        padding: '7px 18px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, #ff8c00, #e06000)',
                        color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {nickSaving ? (
                        <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'prof-spin .7s linear infinite' }}/>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      Сохранить
                    </button>
                    <button
                      onClick={() => { setEditingNick(false); setNickValue(data.nickname); setNickError('') }}
                      style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#9aa3b0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px' }}>{data.nickname}</h2>
                    <button
                      onClick={() => setEditingNick(true)}
                      title="Изменить никнейм"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.25)',
                        padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
                        transition: 'color .15s, background .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ff8c00'; e.currentTarget.style.background = 'rgba(255,140,0,.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.25)'; e.currentTarget.style.background = 'none' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Role badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: `${roleColor}18`,
                border: `1px solid ${roleColor}40`,
                borderRadius: 20, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, color: roleColor,
                marginBottom: 28,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor, animation: 'prof-pulse 2s ease infinite' }}/>
                {data.role}
              </div>

              {/* Stats row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                borderTop: '1px solid rgba(255,255,255,.06)',
                paddingTop: 24,
              }}>
                {[
                  { label: 'ID игрока', value: playerUid, mono: true },
                  { label: 'Статус', value: 'Активен', color: '#3ecf6e' },
                  { label: 'Изменений', value: logs.length.toString() },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.color || (s.mono ? '#ff8c00' : '#e8edf3'), fontFamily: s.mono ? 'monospace' : 'inherit', letterSpacing: s.mono ? '0.5px' : 'normal' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Change logs ── */}
          <div style={{ animation: 'prof-fadeUp .35s .15s ease both', animationFillMode:'both' }}>
            <div style={{
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa3b0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#9aa3b0' }}>Лог изменений</span>
                {logs.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(255,140,0,.15)', color: '#ff8c00', border: '1px solid rgba(255,140,0,.3)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>
                    {logs.length}
                  </span>
                )}
              </div>

              <div style={{ padding: '0 18px', maxHeight: 440, overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <div style={{ fontSize: 12, color: '#3a4250' }}>Изменений пока нет</div>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="prof-log-item" style={{ animationDelay: `${i * 0.04}s` }}>
                      <div style={{ fontSize: 12, color: '#c8d0db', fontWeight: 500, lineHeight: 1.4 }}>{log.text}</div>
                      <div style={{ fontSize: 10, color: '#3a4250', fontWeight: 500 }}>{fmtDateShort(log.at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}