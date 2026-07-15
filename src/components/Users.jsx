import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  canViewAll,
  canEditRoles,
  canIssueReprimand,
  canRemoveLeader,
  canReviewNickRequests,
  isLeader,
} from '../lib/roles'
import { getNickRequests, reviewNickRequest } from '../lib/requests'
import { getUsers, saveUsers, setSession } from '../lib/userStore'

const ROLES = [
  { value: 'Игрок', color: '#6b7280' },
  { value: 'Лидер', color: '#06b6d4' },
  { value: 'Следящий', color: '#8b5cf6' },
  { value: 'Заместитель Главного Следящего', color: '#f59e0b' },
  { value: 'Главный Следящий', color: '#f59e0b' },
  { value: 'Разработчик', color: '#22c55e' },
  { value: 'PR-Assistent', color: '#ec4899' },
  { value: 'Главный Разработчик', color: '#ff8c00' },
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

const IconBell = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)

export default function Users({ currentUser }) {
  // Доступ к разделу теперь определяется матрицей ролей, а не белым списком логинов
  if (!canViewAll(currentUser)) {
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

  const canEditRolesPerm = canEditRoles(currentUser)
  const canReprimand = canIssueReprimand(currentUser)
  const canRemoveLead = canRemoveLeader(currentUser)
  const canReviewNick = canReviewNickRequests(currentUser)

  const [page, setPage] = useState('list') // 'list' | 'requests'
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('Все')
  const [filterRoleOpen, setFilterRoleOpen] = useState(false)
  const [filterMenuPos, setFilterMenuPos] = useState(null)
  const filterBtnRef = useRef(null)
  const [pendingRole, setPendingRole] = useState({}) // userId → newRole
  const [roleMenuOpen, setRoleMenuOpen] = useState(null)
  const [roleMenuPos, setRoleMenuPos] = useState(null)
  const roleBtnRefs = useRef({})

  // Закрываем открытое меню при скролле/ресайзе, чтобы оно не "отклеивалось" от кнопки
  useEffect(() => {
    if (!roleMenuOpen && !filterRoleOpen) return
    const close = () => { setRoleMenuOpen(null); setFilterRoleOpen(false) }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [roleMenuOpen, filterRoleOpen])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { kind, user, role?, ban? }
  const [profileModal, setProfileModal] = useState(null)

  const [nickRequests, setNickRequests] = useState(() => getNickRequests())
  const refreshNickRequests = () => setNickRequests(getNickRequests())

  useEffect(() => {
    const handler = () => refreshNickRequests()
    window.addEventListener('sc:nick-requests-updated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('sc:nick-requests-updated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const pendingNickRequests = useMemo(() => nickRequests.filter(r => r.status === 'pending'), [nickRequests])

  const allUsers = useMemo(() => getUsers(), [saved])

  const usersById = useMemo(() => {
    const map = {}
    allUsers.forEach(u => { map[u.id] = u })
    return map
  }, [allUsers])

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

  const handleSaveRole = (u) => {
    const newRole = pendingRole[u.id]
    if (!newRole || newRole === (u.roleName || 'Игрок')) return
    setConfirmModal({ kind: 'role', user: u, role: newRole })
  }

  const writeUsers = (mutator) => {
    let users = getUsers()
    const idx = users.findIndex(x => x.id === mutator.id)
    if (idx === -1) return
    mutator.apply(users[idx])
    saveUsers(users)

    let session = {}
    try {
      const sraw = localStorage.getItem('sc_user')
      session = (sraw && sraw !== 'undefined' && sraw !== 'null') ? JSON.parse(sraw) : {}
    } catch {
      session = {}
    }
    if (session.id === mutator.id) {
      mutator.apply(session)
      localStorage.setItem('sc_user', JSON.stringify(session))
      setSession(session)
      window.dispatchEvent(new CustomEvent('statecore:users-updated'))
    }
  }

  const pushLog = (userId, text) => {
    const logsKey = `sc_logs_${userId}`
    let logs = []
    try {
      const lraw = localStorage.getItem(logsKey)
      logs = (lraw && lraw !== 'undefined' && lraw !== 'null') ? JSON.parse(lraw) : []
    } catch {
      logs = []
    }
    logs.unshift({ text, at: new Date().toISOString() })
    localStorage.setItem(logsKey, JSON.stringify(logs.slice(0, 30)))
  }

  const confirmAction = () => {
    const modal = confirmModal
    setConfirmModal(null)
    if (!modal) return
    const { kind, user: u, role: newRole, ban } = modal
    setSaving(u.id)
    setTimeout(() => {
      try {
        if (kind === 'role') {
          const prevRole = u.roleName || 'Игрок'
          writeUsers({ id: u.id, apply: (obj) => { obj.roleName = newRole } })
          pushLog(u.id, `Роль изменена: «${prevRole}» → «${newRole}» (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
          setPendingRole(p => { const n = { ...p }; delete n[u.id]; return n })
          window.setTimeout(() => window.location.reload(), 220)
        } else if (kind === 'reprimand') {
          writeUsers({ id: u.id, apply: (obj) => { obj.warnings = (obj.warnings || 0) + 1 } })
          pushLog(u.id, `Выдан выговор (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
          window.setTimeout(() => window.location.reload(), 220)
        } else if (kind === 'removeLeader') {
          writeUsers({ id: u.id, apply: (obj) => { obj.roleName = 'Игрок' } })
          pushLog(u.id, `Статус лидера снят (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
          window.setTimeout(() => window.location.reload(), 220)
        } else if (kind === 'ban') {
          writeUsers({ id: u.id, apply: (obj) => { obj.isBanned = ban; obj.banReason = ban ? 'Забанен администратором' : '' } })
          pushLog(u.id, ban ? `Пользователь забанен (${currentUser?.nickname || currentUser?.login || 'модератор'})` : `Пользователь разбанен (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
          window.setTimeout(() => window.location.reload(), 220)
        }
        setSaved(`${u.id}_${Math.random().toString(36).slice(2, 8)}`)
      } catch(e) { console.error(e) }
      setSaving(null)
    }, 350)
  }

  const handleReview = (req, decision) => {
    reviewNickRequest(req.id, decision, currentUser)
    refreshNickRequests()
    setSaved(`req_${Math.random().toString(36).slice(2, 8)}`)
  }

  const roleCounts = useMemo(() => {
    const counts = {}
    allUsers.forEach(u => {
      const r = u.roleName || 'Игрок'
      counts[r] = (counts[r] || 0) + 1
    })
    return counts
  }, [allUsers])

  const canBan = canEditRolesPerm || canReprimand

  const sharedStyles = `
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
      background: linear-gradient(180deg, #161f30 0%, #111827 100%);
      border: 1px solid rgba(255,255,255,.16);
      color: #f8fafc; padding: 8px 12px;
      border-radius: 10px; font-size: 12px;
      font-family: inherit; font-weight: 700;
      outline: none; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, background .15s;
      appearance: none;
      -webkit-appearance: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    }
    .u-select:hover { background: linear-gradient(180deg, #1b2538 0%, #131b2a 100%); border-color: rgba(255,140,0,.4); }
    .u-select:focus { border-color: rgba(255,140,0,.45); box-shadow: 0 0 0 3px rgba(255,140,0,.16); }
    .u-select:disabled { opacity: .5; cursor: default; }

    .u-row {
      display: grid;
      grid-template-columns: 36px 1fr 120px 160px auto;
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
      white-space: nowrap;
    }
    .u-save-btn:disabled { opacity: .4; cursor: default; }

    .u-ghost-btn {
      padding: 6px 12px; border-radius: 8px;
      font-family: inherit; font-size: 11.5px; font-weight: 700;
      cursor: pointer; transition: background .15s, opacity .15s;
      white-space: nowrap; border: 1px solid rgba(255,255,255,.1);
      background: rgba(255,255,255,.03); color: rgba(255,255,255,.6);
    }
    .u-ghost-btn:hover { background: rgba(255,255,255,.07); color: #fff; }
    .u-ghost-btn.danger { border-color: rgba(226,99,95,.35); color: #e2635f; }
    .u-ghost-btn.danger:hover { background: rgba(226,99,95,.12); }
    .u-ghost-btn.warn { border-color: rgba(214,154,60,.35); color: #d69a3c; }
    .u-ghost-btn.warn:hover { background: rgba(214,154,60,.12); }

    .u-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700;
    }

    .u-role-menu {
      z-index: 10000;
      background: linear-gradient(180deg, #121b2d 0%, #0d1424 100%);
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px; padding: 8px; min-width: 186px;
      box-shadow: 0 18px 42px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04);
      animation: u-fadeUp .12s ease both;
    }
    .u-menu-backdrop {
      position: fixed; inset: 0; z-index: 9999; background: transparent;
    }
    .u-filter-wrap {
      position: relative; overflow: visible;
    }

    .u-role-option {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,.04); color: #f3f6fb;
      font-size: 12px; font-weight: 700; cursor: pointer; text-align: left;
      transition: background .15s, border-color .15s, transform .15s;
    }
    .u-role-option:hover {
      background: rgba(255,255,255,.08);
      border-color: rgba(255,255,255,.08);
      transform: translateX(1px);
    }

    .u-profile-card {
      position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 120;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .u-profile-card > div {
      width: min(420px, 100%); background: #0f172a; border: 1px solid rgba(255,255,255,.1); border-radius: 20px; padding: 22px; box-shadow: 0 24px 70px rgba(0,0,0,.45);
    }

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

    .u-warn-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 18px; border-radius: 14px;
      background: rgba(214,154,60,.1); border: 1px solid rgba(214,154,60,.3);
      margin-bottom: 22px; animation: u-fadeUp .3s ease both;
    }

    .u-req-row {
      display: grid;
      grid-template-columns: 1fr 170px 130px;
      gap: 12px; align-items: center;
      padding: 14px 16px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,.05);
      background: rgba(255,255,255,.02);
      animation: u-fadeUp .25s ease both;
    }
  `

  if (page === 'requests') {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', color: '#e8edf3', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '32px 24px' }}>
        <style>{sharedStyles}</style>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button className="u-ghost-btn" onClick={() => setPage('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <IconArrowLeft /> К списку пользователей
          </button>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Модерирование
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>Заявки на смену никнейма</h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
              {pendingNickRequests.length > 0
                ? `Ожидают решения: ${pendingNickRequests.length}`
                : 'Новых заявок нет'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nickRequests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,.15)', fontSize: 13 }}>
                Заявок пока не было
              </div>
            )}
            {nickRequests.map((r, i) => {
              const target = usersById[r.userId]
              const statusColor = r.status === 'pending' ? '#d69a3c' : r.status === 'approved' ? '#3fb787' : '#e2635f'
              const statusLabel = r.status === 'pending' ? 'На рассмотрении' : r.status === 'approved' ? 'Одобрена' : 'Отклонена'
              return (
                <div key={r.id} className="u-req-row" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8edf3' }}>
                      {target?.nickname || r.currentNickname || r.login || 'Неизвестный'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
                      «{r.currentNickname}» → <span style={{ color: '#fff', fontWeight: 700 }}>«{r.requestedNickname}»</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.25)', marginTop: 4 }}>
                      Отправлено {fmtDate(r.createdAt)}
                      {r.reviewedBy && ` · рассмотрено: ${r.reviewedBy} (${fmtDate(r.reviewedAt)})`}
                    </div>
                  </div>

                  <div>
                    <span className="u-badge" style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                      {statusLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {r.status === 'pending' && canReviewNick ? (
                      <>
                        <button className="u-save-btn" onClick={() => handleReview(r, 'approved')} style={{ background: 'linear-gradient(135deg, #3fb787, #1f8f66)', color: '#fff' }}>
                          Одобрить
                        </button>
                        <button className="u-ghost-btn danger" onClick={() => handleReview(r, 'rejected')}>
                          Отклонить
                        </button>
                      </>
                    ) : r.status === 'pending' ? (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Нет прав</span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#e8edf3', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '32px 24px' }}>
      <style>{sharedStyles}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20, animation: 'u-fadeUp .3s ease both', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Управление
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>Пользователи</h1>
          </div>
          {canReviewNick && (
            <button className="u-ghost-btn" onClick={() => setPage('requests')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <IconBell /> Заявки на ник
              {pendingNickRequests.length > 0 && (
                <span style={{ background: '#d69a3c', color: '#1a1206', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '1px 7px' }}>
                  {pendingNickRequests.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Warning banner */}
        {canReviewNick && pendingNickRequests.length > 0 && (
          <div className="u-warn-banner">
            <div style={{ color: '#d69a3c', display: 'flex', flexShrink: 0 }}><IconBell /></div>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
              <strong style={{ color: '#d69a3c' }}>{pendingNickRequests.length}</strong>{' '}
              {pendingNickRequests.length === 1 ? 'пользователь хочет' : 'пользователей хотят'} сменить никнейм — требуется решение модератора.
            </div>
            <button className="u-save-btn" onClick={() => setPage('requests')} style={{ background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff' }}>
              Перейти к заявкам
            </button>
          </div>
        )}

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
          <div className="u-filter-wrap" style={{ position: 'relative' }}>
            <button
              ref={filterBtnRef}
              className="u-select"
              onClick={() => {
                if (filterRoleOpen) { setFilterRoleOpen(false); return }
                const rect = filterBtnRef.current?.getBoundingClientRect()
                if (rect) setFilterMenuPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
                setFilterRoleOpen(true)
              }}
              style={{ paddingRight: 28, minWidth: 180, textAlign: 'left' }}
            >
              {filterRole === 'Все' ? 'Все роли' : filterRole}
            </button>
            {filterRoleOpen && filterMenuPos && createPortal(
              <>
                <div className="u-menu-backdrop" onClick={() => setFilterRoleOpen(false)} />
                <div
                  className="u-role-menu"
                  style={{ position: 'fixed', top: filterMenuPos.top, left: filterMenuPos.left, minWidth: Math.max(186, filterMenuPos.width) }}
                >
                  <button className="u-role-option" onClick={() => { setFilterRole('Все'); setFilterRoleOpen(false) }}>
                    <span>Все роли</span>
                    <span style={{ color: '#ff8c00' }}>●</span>
                  </button>
                  {ROLES.map(r => (
                    <button key={r.value} className="u-role-option" onClick={() => { setFilterRole(r.value); setFilterRoleOpen(false) }}>
                      <span>{r.value}</span>
                      <span style={{ color: r.color }}>●</span>
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 160px auto', gap: 12, padding: '6px 16px', marginBottom: 6 }}>
          {['', 'Пользователь', 'Текущая роль', canEditRolesPerm ? 'Новая роль' : '', 'Действия'].map((h, i) => (
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
            const targetIsLeader = isLeader(u)

            return (
              <div key={u.id} className="u-row" style={{ animationDelay: `${i * 0.03}s` }}>

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, overflow: 'hidden',
                  background: `${roleColor(currentRole)}18`,
                  border: `1px solid ${roleColor(currentRole)}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: roleColor(currentRole),
                  flexShrink: 0,
                }}>
                  {u.avatar ? (
                    <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (u.nickname || u.login || '?')[0].toUpperCase()
                  )}
                </div>

                {/* User info */}
                <div style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setProfileModal(u)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.nickname || u.login}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,140,0,.15)', color: '#ff8c00', fontWeight: 700, letterSpacing: '1px', flexShrink: 0 }}>
                        ВЫ
                      </span>
                    )}
                    {u.isBanned && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(239,68,68,.15)', color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>
                        BAN
                      </span>
                    )}
                    {u.warnings > 0 && (
                      <span title="Количество выговоров" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(226,99,95,.15)', color: '#e2635f', fontWeight: 700, flexShrink: 0 }}>
                        ⚠ {u.warnings}
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

                {/* Role selector (кастомный, без браузерного select) */}
                <div style={{ position: 'relative' }}>
                  {canEditRolesPerm ? (
                    <>
                      <button
                        ref={el => { roleBtnRefs.current[u.id] = el }}
                        className="u-select"
                        disabled={isSaving}
                        onClick={() => {
                          if (roleMenuOpen === u.id) { setRoleMenuOpen(null); return }
                          const rect = roleBtnRefs.current[u.id]?.getBoundingClientRect()
                          if (rect) setRoleMenuPos({ top: rect.bottom + 6, left: rect.right, width: rect.width })
                          setRoleMenuOpen(u.id)
                        }}
                        style={{
                          width: '100%', paddingRight: 28,
                          borderColor: changed ? 'rgba(255,140,0,.45)' : undefined,
                          color: changed ? '#ff8c00' : undefined,
                        }}
                      >
                        {selected}
                      </button>
                      {roleMenuOpen === u.id && roleMenuPos && createPortal(
                        <>
                          <div className="u-menu-backdrop" onClick={() => setRoleMenuOpen(null)} />
                          <div
                            className="u-role-menu"
                            style={{ position: 'fixed', top: roleMenuPos.top, left: roleMenuPos.left - Math.max(186, roleMenuPos.width) }}
                          >
                            {ROLES.map(r => (
                              <button
                                key={r.value}
                                className="u-role-option"
                                onClick={() => { handleRoleChange(u.id, r.value); setRoleMenuOpen(null) }}
                              >
                                <span>{r.value}</span>
                                <span style={{ color: r.color }}>●</span>
                              </button>
                            ))}
                          </div>
                        </>,
                        document.body
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.15)' }}>—</span>
                  )}
                </div>

                {/* Actions — набор зависит от роли текущего пользователя */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {isSaving ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,140,0,.3)', borderTopColor: '#ff8c00', borderRadius: '50%', animation: 'u-spin .7s linear infinite' }}/>
                    </div>
                  ) : (
                    <>
                      {canEditRolesPerm && changed && (
                        <button
                          className="u-save-btn"
                          onClick={() => handleSaveRole(u)}
                          style={{ background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff' }}
                        >
                          Сохранить
                        </button>
                      )}
                      {canReprimand && !isMe && (
                        <button
                          className="u-ghost-btn warn"
                          onClick={() => setConfirmModal({ kind: 'reprimand', user: u })}
                        >
                          Выговор
                        </button>
                      )}
                      {canBan && !isMe && (
                        <button
                          className="u-ghost-btn danger"
                          onClick={() => setConfirmModal({ kind: 'ban', user: u, ban: !u.isBanned })}
                        >
                          {u.isBanned ? 'Разбан' : 'Бан'}
                        </button>
                      )}
                      {canRemoveLead && targetIsLeader && (
                        <button
                          className="u-ghost-btn danger"
                          onClick={() => setConfirmModal({ kind: 'removeLeader', user: u })}
                        >
                          Снять лидера
                        </button>
                      )}
                      {!canEditRolesPerm && !canReprimand && !(canRemoveLead && targetIsLeader) && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.15)' }}>—</span>
                      )}
                    </>
                  )}
                </div>

              </div>
            )
          })}
        </div>

      </div>

      {profileModal && (
        <div className="u-profile-card" onClick={() => setProfileModal(null)}>
          <div onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              Мини-статистика
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', background: `${roleColor(profileModal.roleName || 'Игрок')}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: roleColor(profileModal.roleName || 'Игрок') }}>
                {(profileModal.nickname || profileModal.login || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{profileModal.nickname || profileModal.login}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{profileModal.login}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>Роль:</b> {profileModal.roleName || 'Игрок'}</div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>Выговоры:</b> {profileModal.warnings || 0}</div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>Статус бана:</b> {profileModal.isBanned ? 'Забанен' : 'Активен'}</div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>Дата регистрации:</b> {fmtDate(profileModal.registeredAt)}</div>
              {profileModal.vk && <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>VK:</b> {profileModal.vk}</div>}
              {profileModal.forum && <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><b>Форум:</b> {profileModal.forum}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="u-modal-bg" onClick={() => setConfirmModal(null)}>
          <div className="u-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: '#ff8c00', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
              Подтверждение
            </div>
            {confirmModal.kind === 'role' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900 }}>Изменить роль?</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                  Пользователь <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> получит роль{' '}
                  <span style={{ color: roleColor(confirmModal.role), fontWeight: 700 }}>{confirmModal.role}</span>.
                </p>
              </>
            )}
            {confirmModal.kind === 'reprimand' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900 }}>Выдать выговор?</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                  Пользователю <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> будет добавлен выговор в личное дело.
                </p>
              </>
            )}
            {confirmModal.kind === 'removeLeader' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900 }}>Снять статус лидера?</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                  Пользователь <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> потеряет статус лидера и получит роль «Игрок».
                </p>
              </>
            )}
            {confirmModal.kind === 'ban' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900 }}>{confirmModal.ban ? 'Забанить пользователя?' : 'Разбанить пользователя?'}</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                  Пользователь <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> будет {confirmModal.ban ? 'забанен' : 'разбанен'}.
                </p>
              </>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={confirmAction}
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