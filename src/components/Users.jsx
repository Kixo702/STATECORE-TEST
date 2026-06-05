import { useState, useMemo } from 'react'

const ROLES = [
  { value: 'Игрок',             color: '#6b7280' },
  { value: 'Лидер',             color: '#06b6d4' },
  { value: 'Следящий',          color: '#8b5cf6' },
  { value: 'Главный Следящий',  color: '#f59e0b' },
  { value: 'Администратор',     color: '#ff8c00' },
]

function roleColor(r) {
  return ROLES.find(x => x.value === r)?.color || '#6b7280'
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function getPlayerUid(id) {
  if (!id) return 'SC-??????'
  return `SC-${id.replace(/-/g, '').toUpperCase().slice(0, 6)}`
}

export default function Users({ currentUser }) {
  // Guard: only Главный Следящий or specific logins
  const allowedLogins = ['kixo', 'kamiya']
  if (!currentUser || (currentUser.roleName !== 'Главный Следящий' && !allowedLogins.includes((currentUser.login || '').toLowerCase()))) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.2)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div style={{ fontSize: 14 }}>Нет доступа</div>
        </div>
      </div>
    )
  }

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('Все')
  const [pendingRole, setPendingRole] = useState({}) // userId → newRole
  const [saving, setSaving] = useState(null) // userId being saved
  const [saved, setSaved] = useState(null)   // userId just saved
  const [confirmModal, setConfirmModal] = useState(null) // { user, role }

  const allUsers = useMemo(() => {
    try {
      const raw = localStorage.getItem('sc_users')
      if (!raw || raw === 'undefined' || raw === 'null') return []
      return JSON.parse(raw)
    } catch { return [] }
  }, [saved]) // re-read after save

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allUsers.filter(u => {
      const matchSearch = !q ||
        (u.nickname || '').toLowerCase().includes(q) ||
        (u.login || '').toLowerCase().includes(q)
      const matchRole = filterRole === 'Все' || (u.roleName || 'Игрок') === filterRole
      return matchSearch && matchRole
    })
  }, [allUsers, search, filterRole])

  const handleRoleChange = (userId, newRole) => {
    setPendingRole(p => ({ ...p, [userId]: newRole }))
  }

  const handleSave = (u) => {
    const newRole = pendingRole[u.id]
    if (!newRole || newRole === (u.roleName || 'Игрок')) return
    setConfirmModal({ user: u, role: newRole })
  }

  const confirmSave = () => {
    const { user: u, role: newRole } = confirmModal
    setConfirmModal(null)
    setSaving(u.id)
    setTimeout(() => {
      try {
        let users = []
        try {
          const raw = localStorage.getItem('sc_users')
          users = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : []
        } catch(e) { users = [] }
        const idx = users.findIndex(x => x.id === u.id)
        if (idx !== -1) {
          users[idx].roleName = newRole
          localStorage.setItem('sc_users', JSON.stringify(users))
          // Update sc_user session if it's the current user (edge case)
          let session = {}
          try {
            const sraw = localStorage.getItem('sc_user')
            session = (sraw && sraw !== 'undefined' && sraw !== 'null') ? JSON.parse(sraw) : {}
          } catch(e) { session = {} }
          if (session.id === u.id) {
            session.roleName = newRole
            localStorage.setItem('sc_user', JSON.stringify(session))
          }
          // Write change log for target user
          const logsKey = `sc_logs_${u.id}`
          let logs = []
          try {
            const lraw = localStorage.getItem(logsKey)
            logs = (lraw && lraw !== 'undefined' && lraw !== 'null') ? JSON.parse(lraw) : []
          } catch(e) { logs = [] }
          logs.unshift({ text: `Роль изменена: «${u.roleName || 'Игрок'}» → «${newRole}» (Главным Следящим)`, at: new Date().toISOString() })
          localStorage.setItem(logsKey, JSON.stringify(logs.slice(0, 30)))
        }
        setPendingRole(p => { const n = { ...p }; delete n[u.id]; return n })
        setSaved(u.id + Date.now()) // trigger re-read
      } catch(e) { console.error(e) }
      setSaving(null)
    }, 350)
  }

  const roleCounts = useMemo(() => {
    const counts = {}
    allUsers.forEach(u => {
      const r = u.roleName || 'Игрок'
      counts[r] = (counts[r] || 0) + 1
    })
    return counts
  }, [allUsers])

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#e8edf3', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '32px 24px' }}>
      <style>{`
        @keyframes u-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes u-spin   { to{transform:rotate(360deg)} }
        @keyframes u-pop    { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }

        .u-input {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          color: #e8edf3; padding: 9px 14px;
          border-radius: 10px; font-size: 13px;
          font-family: inherit; outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .u-input:focus { border-color: rgba(255,140,0,.4); box-shadow: 0 0 0 3px rgba(255,140,0,.1); }

        .u-select {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          color: #e8edf3; padding: 7px 10px;
          border-radius: 9px; font-size: 12px;
          font-family: inherit; font-weight: 600;
          outline: none; cursor: pointer;
          transition: border-color .15s;
          appearance: none;
          -webkit-appearance: none;
        }
        .u-select:focus { border-color: rgba(255,140,0,.4); }

        .u-row {
          display: grid;
          grid-template-columns: 36px 1fr 120px 160px 90px;
          gap: 12px;
          align-items: center;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.05);
          background: rgba(255,255,255,.02);
          transition: background .15s, border-color .15s;
          animation: u-fadeUp .25s ease both;
        }
        .u-row:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08); }

        .u-save-btn {
          padding: 6px 14px; border-radius: 8px; border: none;
          font-family: inherit; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: background .15s, opacity .15s;
        }
        .u-save-btn:disabled { opacity: .4; cursor: default; }

        .u-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
        }

        /* Modal backdrop */
        .u-modal-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.6);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          animation: u-fadeUp .15s ease both;
        }
        .u-modal {
          background: #0e1829;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 18px;
          padding: 28px 28px 24px;
          width: 340px;
          box-shadow: 0 24px 64px rgba(0,0,0,.6);
          animation: u-pop .2s ease both;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, animation: 'u-fadeUp .3s ease both' }}>
          <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Управление
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>Пользователи</h1>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, animation: 'u-fadeUp .3s .05s ease both', animationFillMode: 'both' }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>
            Всего: {allUsers.length}
          </div>
          {ROLES.filter(r => roleCounts[r.value]).map(r => (
            <div key={r.value} style={{ padding: '6px 14px', borderRadius: 20, background: `${r.color}15`, border: `1px solid ${r.color}30`, fontSize: 12, fontWeight: 700, color: r.color }}>
              {r.value}: {roleCounts[r.value]}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, animation: 'u-fadeUp .3s .08s ease both', animationFillMode: 'both', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="u-input"
              style={{ width: '100%', paddingLeft: 34, boxSizing: 'border-box' }}
              placeholder="Поиск по нику или логину…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select className="u-select" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ paddingRight: 28 }}>
              <option value="Все">Все роли</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
            </select>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" strokeLinecap="round" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 160px 90px', gap: 12, padding: '6px 16px', marginBottom: 6 }}>
          {['', 'Пользователь', 'Текущая роль', 'Новая роль', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,.15)', fontSize: 13 }}>
              Пользователи не найдены
            </div>
          )}
          {filtered.map((u, i) => {
            const currentRole = u.roleName || 'Игрок'
            const selected = pendingRole[u.id] ?? currentRole
            const changed = selected !== currentRole
            const isSaving = saving === u.id
            const isMe = u.id === currentUser?.id

            return (
              <div key={u.id} className="u-row" style={{ animationDelay: `${i * 0.03}s` }}>

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: `${roleColor(currentRole)}18`,
                  border: `1px solid ${roleColor(currentRole)}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: roleColor(currentRole),
                  flexShrink: 0,
                }}>
                  {(u.nickname || u.login || '?')[0].toUpperCase()}
                </div>

                {/* User info */}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.nickname || u.login}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,140,0,.15)', color: '#ff8c00', fontWeight: 700, letterSpacing: '1px', flexShrink: 0 }}>
                        ВЫ
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 1, fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                    {getPlayerUid(u.id)}
                  </div>
                </div>

                {/* Current role badge */}
                <div>
                  <span className="u-badge" style={{ background: `${roleColor(currentRole)}18`, border: `1px solid ${roleColor(currentRole)}35`, color: roleColor(currentRole) }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor(currentRole), flexShrink: 0 }}/>
                    {currentRole}
                  </span>
                </div>

                {/* Role selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    className="u-select"
                    value={selected}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={isSaving}
                    style={{
                      width: '100%', paddingRight: 26,
                      borderColor: changed ? 'rgba(255,140,0,.45)' : undefined,
                      color: changed ? '#ff8c00' : undefined,
                    }}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.value}</option>
                    ))}
                  </select>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Save button */}
                <div>
                  {isSaving ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,140,0,.3)', borderTopColor: '#ff8c00', borderRadius: '50%', animation: 'u-spin .7s linear infinite' }}/>
                    </div>
                  ) : changed ? (
                    <button
                      className="u-save-btn"
                      onClick={() => handleSave(u)}
                      style={{ background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff', width: '100%' }}
                    >
                      Сохранить
                    </button>
                  ) : (
                    <button
                      className="u-save-btn"
                      disabled
                      style={{ background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.2)', width: '100%', border: '1px solid rgba(255,255,255,.06)' }}
                    >
                      —
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>

      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <div className="u-modal-bg" onClick={() => setConfirmModal(null)}>
          <div className="u-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              Подтверждение
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900 }}>Изменить роль?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
              Пользователь <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> получит роль{' '}
              <span style={{ color: roleColor(confirmModal.role), fontWeight: 700 }}>{confirmModal.role}</span>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={confirmSave}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              >
                Подтвердить
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}