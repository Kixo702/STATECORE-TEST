import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  canViewAll,
  canEditRoles,
  canIssueReprimand,
  canRemoveLeader,
  canReviewNickRequests,
  isLeader,
  getAllLeaderRoles,
  CHIEF_ROLES_BY_DIRECTION,
  DEPUTY_ROLES_BY_DIRECTION,
} from '../lib/roles'
import { getNickRequests, reviewNickRequest } from '../lib/requests'
import { setSession, removeUser } from '../lib/userStore'
import { getUsers, updateUser, deleteUser } from '../lib/api'

// Оформление групп фракций в выпадающих списках ролей
const FACTION_CATEGORY_META = {
  gov:    { group: 'Госструктуры', color: '#3b82f6' },
  mafia:  { group: 'Мафия',        color: '#dc2626' },
  ghetto: { group: 'Гетто',        color: '#84cc16' },
  bikers: { group: 'Байкеры',      color: '#eab308' },
  radio:  { group: 'Радио',        color: '#06b6d4' },
}

// Оформление направлений для ролей ГС/ЗГС (совпадает по духу с FACTION_CATEGORY_META,
// но включает направление "БО", которого нет во фракциях-лидерах)
const DIRECTION_META = {
  gov:    { color: '#3b82f6' },
  mafia:  { color: '#dc2626' },
  ghetto: { color: '#84cc16' },
  bo:     { color: '#a855f7' },
  bikers: { color: '#eab308' },
}

// Роли-лидеры генерируются по всем фракциям из lib/roles.js —
// добавление новой фракции туда автоматически добавит роль и сюда
const LEADER_ROLES = getAllLeaderRoles().map((f) => ({
  value: f.roleName,
  color: FACTION_CATEGORY_META[f.category]?.color || '#06b6d4',
  group: FACTION_CATEGORY_META[f.category]?.group || 'Лидеры',
}))

// ГС/ЗГС по направлениям — тоже генерируются из lib/roles.js, чтобы новое
// направление не пришлось дублировать здесь вручную
const LEADERSHIP_ROLES = [
  ...Object.entries(CHIEF_ROLES_BY_DIRECTION).map(([direction, roleName]) => ({
    value: roleName,
    color: DIRECTION_META[direction]?.color || '#f59e0b',
    group: 'Руководство',
  })),
  ...Object.entries(DEPUTY_ROLES_BY_DIRECTION).map(([direction, roleName]) => ({
    value: roleName,
    color: DIRECTION_META[direction]?.color || '#f59e0b',
    group: 'Руководство',
  })),
]

const ROLES = [
  { value: 'Игрок', color: '#6b7280', group: 'Роли' },
  ...LEADER_ROLES,
  { value: 'Следящий', color: '#8b5cf6', group: 'Роли' },
  ...LEADERSHIP_ROLES,
  // Старые докатегорийные роли ГС/ЗГС — оставлены в списке отдельной группой
  // только для совместимости с уже назначенными аккаунтами (сортировка,
  // отображение цвета и т.п.). Для новых назначений используйте роли
  // из группы "Руководство" выше.
  { value: 'Заместитель Главного Следящего', color: '#f59e0b', group: 'Роли (устаревшие)' },
  { value: 'Главный Следящий', color: '#f59e0b', group: 'Роли (устаревшие)' },
  { value: 'Разработчик', color: '#22c55e', group: 'Роли' },
  { value: 'PR-Assistent', color: '#ec4899', group: 'Роли' },
  { value: 'Главный Разработчик', color: '#ff8c00', group: 'Роли' },
]

function roleColor(r) {
  return ROLES.find(x => x.value === r)?.color || '#6b7280'
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`
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

// Группирует список ролей по полю group, сохраняя порядок первого появления группы
function groupRoles(roles, query = '') {
  const filtered = query.trim()
    ? roles.filter(r => r.value.toLowerCase().includes(query.trim().toLowerCase()))
    : roles

  const grouped = []
  const groupIndex = new Map()
  for (const r of filtered) {
    const g = r.group || 'Роли'
    if (!groupIndex.has(g)) {
      groupIndex.set(g, grouped.length)
      grouped.push([g, []])
    }
    grouped[groupIndex.get(g)][1].push(r)
  }
  return { filtered, grouped }
}

// Список ролей для выпадающих меню: группировка по фракциям + поиск
function RoleOptionsList({ roles, onPick, activeValue, showAllOption, onPickAll }) {
  const [q, setQ] = useState('')
  const showSearch = roles.length > 10
  const { filtered, grouped } = groupRoles(roles, q)

  return (
    <>
      {showSearch && (
        <input
          autoFocus
          className="u-role-search"
          placeholder="Поиск роли…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onClick={e => e.stopPropagation()}
        />
      )}
      {showAllOption && !q.trim() && (
        <button className="u-role-option" onClick={onPickAll}>
          <span>Все роли</span>
          <span style={{ color: '#ff8c00' }}>●</span>
        </button>
      )}
      {grouped.map(([group, items]) => (
        <div key={group}>
          {showSearch && <div className="u-role-group-label">{group}</div>}
          {items.map(r => (
            <button
              key={r.value}
              className="u-role-option"
              onClick={() => onPick(r.value)}
              style={activeValue === r.value ? { background: 'rgba(255,255,255,.09)', borderColor: `${r.color}55` } : undefined}
            >
              <span>{r.value}</span>
              <span style={{ color: r.color }}>●</span>
            </button>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ padding: '10px 8px', fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
          Ничего не найдено
        </div>
      )}
    </>
  )
}

function getPlayerUid(id) {
  if (!id) return 'SC-??????'
  return `SC-${id.replace(/-/g, '').toUpperCase().slice(0, 6)}`
}

// ── Icons ───────────────────
const IC = {
  bell:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowLeft: <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/><polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:         <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  user:      <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>,
  crown:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M3 7l4 5 5-6 5 6 4-5v10H3V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  shield:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  warning:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 3l9 18H3l9-18z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  ban:       <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth="1.7"/></svg>,
  link:      <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  cal:       <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8"/></svg>,
  check:     <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spin:      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="56" strokeDashoffset="14" strokeLinecap="round"/></svg>,
  trash:     <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

export default function Users({ currentUser }) {
  if (!canViewAll(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
        <div className="text-center text-white/20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom: 16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div className="text-sm">Нет доступа</div>
        </div>
      </div>
    )
  }

  const canEditRolesPerm = canEditRoles(currentUser)
  const canReprimand = canIssueReprimand(currentUser)
  const canRemoveLead = canRemoveLeader(currentUser)
  const canReviewNick = canReviewNickRequests(currentUser)
  const canDeleteAccount = canEditRolesPerm

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
  const [profileModalId, setProfileModalId] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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

  // ── Пользователи из бэкенда ──────────────
  const [allUsers, setAllUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState(null)

  const loadUsers = () => {
    setUsersLoading(true)
    setUsersError(null)
    getUsers()
      .then(list => setAllUsers(Array.isArray(list) ? list : []))
      .catch(err => {
        console.error(err)
        setUsersError(err?.message || 'Не удалось загрузить пользователей')
      })
      .finally(() => setUsersLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [saved])

  const usersById = useMemo(() => {
    const map = {}
    allUsers.forEach(u => { map[u.id] = u })
    return map
  }, [allUsers])

  const profileModal = profileModalId ? usersById[profileModalId] || null : null

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

  // Обновлено: теперь функция может гибко принимать роль напрямую (для вызова из модалки)
  const handleSaveRole = (u, targetRole = null) => {
    const newRole = targetRole || pendingRole[u.id]
    if (!newRole || newRole === (u.roleName || 'Игрок')) return
    setConfirmModal({ kind: 'role', user: u, role: newRole })
  }

  const writeUsers = async ({ id, patch }) => {
    await updateUser(id, patch)

    let session = {}
    try {
      const sraw = localStorage.getItem('sc_user')
      session = (sraw && sraw !== 'undefined' && sraw !== 'null') ? JSON.parse(sraw) : {}
    } catch {
      session = {}
    }
    if (session.id === id) {
      const nextSession = { ...session, ...patch }
      localStorage.setItem('sc_user', JSON.stringify(nextSession))
      setSession(nextSession)
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

  const confirmAction = async () => {
    const modal = confirmModal
    setConfirmModal(null)
    if (!modal) return
    const { kind, user: u, role: newRole, ban } = modal
    setSaving(u.id)

    try {
      if (kind === 'role') {
        const prevRole = u.roleName || 'Игрок'

        // Оптимистично обновляем стейт интерфейса сразу
        setAllUsers(prev => prev.map(item => item.id === u.id ? { ...item, roleName: newRole } : item))

        await writeUsers({ id: u.id, patch: { roleName: newRole } })
        pushLog(u.id, `Роль изменена: «${prevRole}» → «${newRole}» (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
        setPendingRole(p => { const n = { ...p }; delete n[u.id]; return n })
      } else if (kind === 'reprimand') {
        const nextWarnings = (u.warnings || 0) + 1
        setAllUsers(prev => prev.map(item => item.id === u.id ? { ...item, warnings: nextWarnings } : item))
        
        await writeUsers({ id: u.id, patch: { warnings: nextWarnings } })
        pushLog(u.id, `Выдан выговор (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
      } else if (kind === 'removeLeader') {
        setAllUsers(prev => prev.map(item => item.id === u.id ? { ...item, roleName: 'Игрок' } : item))

        await writeUsers({ id: u.id, patch: { roleName: 'Игрок' } })
        pushLog(u.id, `Статус лидера снят (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
      } else if (kind === 'ban') {
        setAllUsers(prev => prev.map(item => item.id === u.id ? { ...item, isBanned: ban } : item))

        await writeUsers({ id: u.id, patch: { isBanned: ban, banReason: ban ? 'Забанен администратором' : '' } })
        pushLog(u.id, ban ? `Пользователь забанен (${currentUser?.nickname || currentUser?.login || 'модератор'})` : `Пользователь разбанен (${currentUser?.nickname || currentUser?.login || 'модератор'})`)
      } else if (kind === 'delete') {
        await deleteUser(u.id)
        removeUser(u.id)
        try { localStorage.removeItem(`sc_logs_${u.id}`) } catch {}
        setPendingRole(p => { const n = { ...p }; delete n[u.id]; return n })
        if (profileModalId === u.id) setProfileModalId(null)
        setDeleteConfirmText('')
      }
      loadUsers()
      setSaved(`${u.id}_${Math.random().toString(36).slice(2, 8)}`)
    } catch (e) {
      console.error(e)
      loadUsers() // Откатываем интерфейс при ошибке
      setUsersError(e?.message || (kind === 'delete' ? 'Не удалось удалить аккаунт' : 'Не удалось сохранить изменения'))
    } finally {
      setSaving(null)
    }
  }

  const handleReview = async (req, decision) => {
    try {
      await reviewNickRequest(req.id, decision, currentUser)
      refreshNickRequests()
      if (decision === 'approved') loadUsers()
      setSaved(`req_${Math.random().toString(36).slice(2, 8)}`)
    } catch (e) {
      console.error(e)
      setUsersError(e?.message || 'Не удалось применить решение по заявке')
    }
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
    @keyframes u-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes u-success { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }

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
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      color: rgba(255,255,255,.65); padding: 8px 12px;
      border-radius: 10px; font-size: 12px;
      font-family: inherit; font-weight: 600;
      outline: none; cursor: pointer;
      transition: border-color .15s, box-shadow .15s, background .15s, color .15s;
      appearance: none;
      -webkit-appearance: none;
    }
    .u-select:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); color: #e8edf3; }
    .u-select:focus { border-color: rgba(255,140,0,.35); box-shadow: 0 0 0 3px rgba(255,140,0,.1); }
    .u-select:disabled { opacity: .5; cursor: default; }

    .u-row {
      display: grid;
      grid-template-columns: 36px 1fr 120px 160px auto;
      gap: 12px;
      align-items: center;
      padding: 13px 16px;
      animation: u-fadeUp .25s ease both;
    }

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
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 2px;
      font-size: 12px; font-weight: 600;
      color: rgba(255,255,255,.55);
    }

    .u-role-menu {
      z-index: 10000;
      background: linear-gradient(180deg, #121b2d 0%, #0d1424 100%);
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px; padding: 8px; min-width: 186px;
      max-height: 360px; overflow-y: auto;
      box-shadow: 0 18px 42px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04);
      animation: u-fadeUp .12s ease both;
    }
    .u-menu-backdrop {
      position: fixed; inset: 0; z-index: 9999; background: transparent;
    }
    .u-filter-wrap {
      position: relative; overflow: visible;
    }

    .u-role-search {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.1);
      color: #e8edf3; padding: 7px 10px;
      border-radius: 8px; font-size: 12px;
      font-family: inherit; outline: none;
      margin-bottom: 6px;
    }
    .u-role-search:focus { border-color: rgba(255,140,0,.4); }

    .u-role-group-label {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1.2px; color: rgba(255,255,255,.3);
      padding: 8px 10px 4px;
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

    .u-modal-bg {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.6);
      z-index: 300;
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
      <div className="min-h-screen text-white" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <style>{sharedStyles}</style>
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <button className="u-ghost-btn" onClick={() => setPage('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            {IC.arrowLeft} К списку пользователей
          </button>

          <div style={{ marginBottom: 24 }}>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80" style={{ marginBottom: 6 }}>
              Модерирование
            </div>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ letterSpacing: '-0.5px' }}>Заявки на смену никнейма</h1>
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
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{sharedStyles}</style>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80" style={{ marginBottom: 6 }}>
              Управление
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black" style={{ letterSpacing: '-0.5px' }}>Пользователи</h1>
            <p className="text-slate-400" style={{ marginTop: 6, maxWidth: 480 }}>Роли, дисциплина и заявки на смену никнейма</p>
          </div>
          {canReviewNick && (
            <button className="u-ghost-btn" onClick={() => setPage('requests')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {IC.bell} Заявки на ник
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
            <div style={{ color: '#d69a3c', display: 'flex', flexShrink: 0 }}>{IC.bell}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
              <strong style={{ color: '#d69a3c' }}>{pendingNickRequests.length}</strong>{' '}
              {pendingNickRequests.length === 1 ? 'пользователь хочет' : 'пользователей хотят'} сменить никнейм — требуется решение модератора.
            </div>
            <button className="u-save-btn" onClick={() => setPage('requests')} style={{ background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff' }}>
              Перейти к заявкам
            </button>
          </div>
        )}

        {/* ── СТАТИСТИКА ───────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Статистика</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
            <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: '#ff8c00' }} />
            <div className="flex items-center justify-between pl-5 pr-5 py-5">
              <div>
                <p className="text-slate-400 text-sm">Всего пользователей</p>
                <h2 className="text-3xl font-black mt-1.5 tabular-nums">{usersLoading ? '—' : allUsers.length}</h2>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,140,0,.12)', color: '#ff8c00' }}>
                {IC.user}
              </div>
            </div>
          </div>
          {ROLES.filter(r => roleCounts[r.value]).map(r => {
            const rgb = hexToRgb(r.color)
            return (
              <div key={r.value} className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200">
                <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: r.color }} />
                <div className="flex items-center justify-between pl-5 pr-5 py-5">
                  <div>
                    <p className="text-slate-400 text-sm">{r.value}</p>
                    <h2 className="text-3xl font-black mt-1.5 tabular-nums">{roleCounts[r.value]}</h2>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(${rgb},.12)`, color: r.color }}>
                    {IC.crown}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── ФИЛЬТРЫ ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
          <div className="flex-1" style={{ minWidth: 220, position: 'relative' }}>
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35" style={{ display: 'block', marginBottom: 8 }}>Поиск</span>
            <div style={{ position: 'relative' }}>
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
          </div>
          <div className="u-filter-wrap" style={{ position: 'relative' }}>
            <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35" style={{ display: 'block', marginBottom: 8 }}>Роль</span>
            <button
              ref={filterBtnRef}
              className="u-select"
              onClick={() => {
                if (filterRoleOpen) { setFilterRoleOpen(false); return }
                const rect = filterBtnRef.current?.getBoundingClientRect()
                if (rect) setFilterMenuPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
                setFilterRoleOpen(true)
              }}
              style={{ paddingRight: 28, minWidth: 200, textAlign: 'left' }}
            >
              {filterRole === 'Все' ? 'Все роли' : filterRole}
            </button>
            {filterRoleOpen && filterMenuPos && createPortal(
              <>
                <div className="u-menu-backdrop" onClick={() => setFilterRoleOpen(false)} />
                <div
                  className="u-role-menu"
                  style={{ position: 'fixed', top: filterMenuPos.top, left: filterMenuPos.left, minWidth: Math.max(200, filterMenuPos.width) }}
                >
                  <RoleOptionsList
                    roles={ROLES}
                    activeValue={filterRole}
                    showAllOption
                    onPickAll={() => { setFilterRole('Все'); setFilterRoleOpen(false) }}
                    onPick={(v) => { setFilterRole(v); setFilterRoleOpen(false) }}
                  />
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* ── СПИСОК ПОЛЬЗОВАТЕЛЕЙ ────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-white/35">Пользователи ({filtered.length})</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 160px auto', gap: 12, padding: '0 16px', marginBottom: 6 }}>
          {['', 'Пользователь', 'Текущая роль', canEditRolesPerm ? 'Новая роль' : '', 'Действия'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usersError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(226,99,95,.1)', border: '1px solid rgba(226,99,95,.3)', color: '#e2635f', fontSize: 13 }}>
              <span>Ошибка загрузки: {usersError}</span>
              <button className="u-ghost-btn danger" onClick={loadUsers}>Повторить</button>
            </div>
          )}
          {usersLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,.25)', fontSize: 13 }}>
              Загрузка пользователей…
            </div>
          )}
          {!usersLoading && !usersError && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,.15)', fontSize: 13 }}>
              Пользователи не найдены
            </div>
          )}
          {!usersLoading && filtered.map((u, i) => {
            const currentRole = u.roleName || 'Игрок'
            const selected = pendingRole[u.id] ?? currentRole
            const changed = selected !== currentRole
            const isSaving = saving === u.id
            const isMe = u.id === currentUser?.id
            const targetIsLeader = isLeader(u)
            const accentRgb = hexToRgb(roleColor(currentRole))

            return (
              <div
                key={u.id}
                className="u-row relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.14] transition-colors duration-200"
                style={{ animationDelay: `${i * 0.02}s` }}
              >
                <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: roleColor(currentRole) }} />

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, overflow: 'hidden',
                  background: `rgba(${accentRgb},.15)`,
                  border: `1px solid rgba(${accentRgb},.3)`,
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
                <div style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setProfileModalId(u.id)}>
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
                  <span className="u-badge">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor(currentRole), flexShrink: 0 }}/>
                    {currentRole}
                  </span>
                </div>

                {/* Role selector */}
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
                            <RoleOptionsList
                              roles={ROLES}
                              activeValue={selected}
                              onPick={(v) => { handleRoleChange(u.id, v); setRoleMenuOpen(null) }}
                            />
                          </div>
                        </>,
                        document.body
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.15)' }}>—</span>
                  )}
                </div>

                {/* Actions */}
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
                      <button className="u-ghost-btn" onClick={() => setProfileModalId(u.id)}>
                        Профиль
                      </button>
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

      {/* ── ПАНЕЛЬ МОДЕРАТОРА ───────────────── */}
      {profileModal && (
        <ModeratorPanel
          user={profileModal}
          currentUser={currentUser}
          onClose={() => setProfileModalId(null)}
          canEditRolesPerm={canEditRolesPerm}
          canReprimand={canReprimand}
          canRemoveLead={canRemoveLead}
          canBan={canBan}
          canDelete={canDeleteAccount}
          pendingRole={pendingRole}
          onRoleChange={handleRoleChange}
          onSaveRole={(u, newRole) => handleSaveRole(u, newRole)}
          onReprimand={(u) => setConfirmModal({ kind: 'reprimand', user: u })}
          onBanToggle={(u) => setConfirmModal({ kind: 'ban', user: u, ban: !u.isBanned })}
          onRemoveLeader={(u) => setConfirmModal({ kind: 'removeLeader', user: u })}
          onDelete={(u) => { setDeleteConfirmText(''); setProfileModalId(null); setConfirmModal({ kind: 'delete', user: u }) }}
          saving={saving === profileModal.id}
        />
      )}

      {/* Confirm modal */}
      {confirmModal && createPortal(
        <div className="u-modal-bg" onClick={() => { setConfirmModal(null); setDeleteConfirmText('') }}>
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
            {confirmModal.kind === 'delete' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900, color: '#e2635f' }}>Удалить аккаунт навсегда?</h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                  Аккаунт <span style={{ color: '#e8edf3', fontWeight: 700 }}>{confirmModal.user.nickname || confirmModal.user.login}</span> и все связанные данные будут{' '}
                  <span style={{ color: '#e2635f', fontWeight: 700 }}>безвозвратно удалены из базы данных</span>.
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                  Чтобы подтвердить, введите логин пользователя: <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{confirmModal.user.login}</span>
                </p>
                <input
                  className="u-input"
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
                  placeholder="Введите логин для подтверждения"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  autoFocus
                />
              </>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={confirmAction}
                disabled={confirmModal.kind === 'delete' && deleteConfirmText.trim() !== confirmModal.user.login}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: confirmModal.kind === 'delete'
                    ? 'linear-gradient(135deg, #e2635f, #b8342f)'
                    : 'linear-gradient(135deg, #ff8c00, #e06000)',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: (confirmModal.kind === 'delete' && deleteConfirmText.trim() !== confirmModal.user.login) ? 'default' : 'pointer',
                  opacity: (confirmModal.kind === 'delete' && deleteConfirmText.trim() !== confirmModal.user.login) ? .45 : 1,
                }}
              >
                {confirmModal.kind === 'delete' ? 'Удалить навсегда' : 'Подтвердить'}
              </button>
              <button
                onClick={() => { setConfirmModal(null); setDeleteConfirmText('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function ModeratorPanel({
  user, currentUser, onClose,
  canEditRolesPerm, canReprimand, canRemoveLead, canBan, canDelete,
  pendingRole, onRoleChange, onSaveRole,
  onReprimand, onBanToggle, onRemoveLeader, onDelete,
  saving,
}) {
  const [visible, setVisible] = useState(false)
  const [roleQuery, setRoleQuery] = useState('')
  useEffect(() => { const t = setTimeout(() => setVisible(true), 10); return () => clearTimeout(t) }, [])

  const handleClose = () => { setVisible(false); setTimeout(onClose, 220) }
  const { grouped: roleGroups } = groupRoles(ROLES, roleQuery)

  const isMe = user.id === currentUser?.id
  const targetIsLeader = isLeader(user)
  const currentRole = user.roleName || 'Игрок'
  const selectedRole = pendingRole[user.id] ?? currentRole
  const roleChanged = selectedRole !== currentRole
  const accentRgb = hexToRgb(roleColor(currentRole))

  const hasAnyModAction = !isMe && (canEditRolesPerm || canReprimand || canBan || canDelete || (canRemoveLead && targetIsLeader))

  const statTiles = [
    { label: 'Роль', value: currentRole, icon: IC.crown, accent: roleColor(currentRole) },
    { label: 'Выговоры', value: user.warnings || 0, icon: IC.warning, accent: (user.warnings || 0) > 0 ? '#e2635f' : '#6b7280' },
    { label: 'Статус', value: user.isBanned ? 'Забанен' : 'Активен', icon: IC.ban, accent: user.isBanned ? '#ef4444' : '#22c55e' },
    { label: 'Регистрация', value: fmtDate(user.registeredAt), icon: IC.cal, accent: '#38bdf8' },
  ]

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
        width: '100%', maxWidth: 560,
        maxHeight: '88vh', overflowY: 'auto',
        background: 'linear-gradient(160deg, #141b2e 0%, #0d1120 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 28,
        boxShadow: '0 40px 100px rgba(0,0,0,.75), 0 0 0 1px rgba(255,140,0,.06), inset 0 1px 0 rgba(255,255,255,.06)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(.94) translateY(24px)',
        transition: 'all .28s cubic-bezier(.34,1.2,.64,1)',
        position: 'relative',
      }}>
        <div style={{
          height: 3, position: 'sticky', top: 0, zIndex: 1,
          background: 'linear-gradient(90deg, #ff8c00, #ff5500, #ff8c00)',
          backgroundSize: '200% 100%',
          animation: 'u-shimmer 3s linear infinite',
        }}/>

        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(255,140,0,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ padding: '28px 32px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                background: `rgba(${accentRgb},.15)`, border: `1px solid rgba(${accentRgb},.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: roleColor(currentRole),
              }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user.nickname || user.login || '?')[0].toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  fontSize: 10, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase',
                  color: '#ff8c00', marginBottom: 4, opacity: .85,
                }}>
                  {IC.shield} Панель модератора
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#f0f4fc', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.nickname || user.login}
                </h2>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2, fontFamily: 'monospace' }}>
                  {user.login} · {getPlayerUid(user.id)}
                </div>
              </div>
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
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)' }}
            >
              {IC.x}
            </button>
          </div>

          {/* Stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            {statTiles.map(s => {
              const rgb = s.accent.startsWith('#') ? hexToRgb(s.accent) : s.accent
              return (
                <div key={s.label} className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: s.accent.startsWith('#') ? s.accent : `rgb(${s.accent})` }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{s.label}</p>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f4fc', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                    </div>
                    <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `rgba(${rgb},.15)`, color: s.accent.startsWith('#') ? s.accent : `rgb(${s.accent})` }}>
                      {s.icon}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {(user.vk || user.forum) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
              {user.vk && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{IC.link} {user.vk}</span>}
              {user.forum && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{IC.link} {user.forum}</span>}
            </div>
          )}

          {isMe && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', padding: '10px 0' }}>
              Модераторские действия недоступны для собственного профиля.
            </div>
          )}

          {hasAnyModAction && (
            <>
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin: '4px 0 18px' }}/>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>
                Действия
              </div>

              {canEditRolesPerm && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>Изменить роль</div>
                  <input
                    className="u-role-search"
                    placeholder="Поиск роли (например «LSPD» или «Yakuza»)…"
                    value={roleQuery}
                    onChange={e => setRoleQuery(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                    {roleGroups.map(([group, items]) => (
                      <div key={group} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,.3)', marginBottom: 6 }}>
                          {group}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {items.map(r => {
                            const active = selectedRole === r.value
                            return (
                              <button
                                key={r.value}
                                onClick={() => onRoleChange(user.id, r.value)}
                                style={{
                                  padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', transition: 'all .18s cubic-bezier(.34,1.4,.64,1)',
                                  background: active ? 'linear-gradient(135deg, #ff8c00, #e06000)' : 'rgba(255,255,255,.05)',
                                  border: `1px solid ${active ? 'rgba(255,140,0,.5)' : 'rgba(255,255,255,.1)'}`,
                                  color: active ? '#fff' : 'rgba(255,255,255,.6)',
                                  boxShadow: active ? '0 4px 18px rgba(255,140,0,.3)' : 'none',
                                }}
                              >
                                {r.value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {roleGroups.length === 0 && (
                      <div style={{ padding: '10px 0', fontSize: 12, color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
                        Ничего не найдено
                      </div>
                    )}
                  </div>
                  {roleChanged && (
                    <button
                      onClick={() => onSaveRole(user, selectedRole)}
                      disabled={saving}
                      style={{
                        marginTop: 10, padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, #ff8c00, #e06000)', color: '#fff',
                        fontSize: 12, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? .5 : 1,
                      }}
                    >
                      Сохранить роль «{selectedRole}»
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {canReprimand && (
                  <button className="u-ghost-btn warn" onClick={() => onReprimand(user)} disabled={saving}>
                    Выдать выговор
                  </button>
                )}
                {canBan && (
                  <button className="u-ghost-btn danger" onClick={() => onBanToggle(user)} disabled={saving}>
                    {user.isBanned ? 'Разбанить' : 'Забанить'}
                  </button>
                )}
                {canRemoveLead && targetIsLeader && (
                  <button className="u-ghost-btn danger" onClick={() => onRemoveLeader(user)} disabled={saving}>
                    Снять лидера
                  </button>
                )}
              </div>

              {canDelete && (
                <div style={{
                  marginTop: 20, padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(226,99,95,.06)', border: '1px solid rgba(226,99,95,.25)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#e2635f', marginBottom: 8 }}>
                    Опасная зона
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, flex: 1, minWidth: 180 }}>
                      Полностью удалит аккаунт и все данные из базы данных. Действие необратимо.
                    </p>
                    <button
                      onClick={() => onDelete(user)}
                      disabled={saving}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(226,99,95,.4)',
                        background: 'rgba(226,99,95,.12)', color: '#e2635f',
                        fontSize: 12, fontWeight: 800, cursor: saving ? 'default' : 'pointer',
                        opacity: saving ? .5 : 1, whiteSpace: 'nowrap',
                        fontFamily: 'inherit',
                      }}
                    >
                      {IC.trash} Удалить аккаунт
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}