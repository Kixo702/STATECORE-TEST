import { useEffect, useMemo, useState } from 'react'
import { getUser } from '../lib/api'
import { getFactionByRoleName, isLeader, isChief, isDeputy, canEditRoles } from '../lib/roles'

/*
  ── Профиль пользователя (просмотр чужого аккаунта) ─────────────
  Аналог Profile.jsx, но:
   • Данные — чужие: подгружаются с бэкенда по userId (или передаются
     готовым объектом через проп user).
   • Только просмотр — без загрузки аватара, заявок на смену ника и
     управления 2FA. Всё, что можно менять — меняется на странице
     «Пользователи» (Users.jsx), сюда ведёт кнопка «Управлять».

  Использование:
    <ProfileUsers userId={someId} onBack={() => ...} />
    <ProfileUsers user={alreadyLoadedUserObject} onBack={() => ...} />
*/

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function getPlayerUid(id) {
  if (!id) return 'SC-000000'
  return `SC-${String(id).replace(/-/g, '').toUpperCase().slice(0, 6)}`
}

// ── SVG ИКОНКИ ──────────────────────────────────────────────────
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const T = {
  bg: '#0b0e14',
  panel: '#11151d',
  panel2: '#151a24',
  border: 'rgba(255,255,255,0.07)',
  borderSoft: 'rgba(255,255,255,0.045)',
  text: '#e6e9f0',
  muted: '#8891a1',
  faint: 'rgba(255,255,255,0.28)',
  accent: '#5b8def',
  accentSoft: 'rgba(91,141,239,0.12)',
  warn: '#d69a3c',
  warnSoft: 'rgba(214,154,60,0.12)',
  danger: '#e2635f',
  dangerSoft: 'rgba(226,99,95,0.12)',
  success: '#3fb787',
  successSoft: 'rgba(63,183,135,0.12)',
}

function getRoleColor(roleName = '') {
  if (roleName === 'Главный Разработчик') return T.danger
  if (roleName.startsWith('ГС') || roleName.startsWith('Главный Следящий')) return T.warn
  if (roleName.startsWith('ЗГС') || roleName.startsWith('Заместитель Главного Следящего')) return T.warn
  if (roleName.startsWith('Следящий')) return '#8b93f0'
  if (roleName.startsWith('Лидер')) return T.success
  return T.accent
}

function StateBlock({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}

export default function ProfileUsers({ userId, user, currentUser, onBack, onManage }) {
  const [account, setAccount] = useState(user || null)
  const [loading, setLoading] = useState(!user && !!userId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) { setAccount(user); setLoading(false); return }
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setError('')
    getUser(userId)
      .then((u) => { if (!cancelled) setAccount(u) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Не удалось загрузить профиль') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, user])

  const data = useMemo(() => ({
    registeredAt: account?.registeredAt || account?.createdAt || account?.regDate || null,
    vk: account?.vk || account?.vkCode || account?.vkUrl || '—',
    forum: account?.forum || '—',
    role: account?.roleName || 'Игрок',
    nickname: account?.nickname || account?.username || account?.name || account?.login || 'Гость',
    id: account?.id || null,
    login: account?.login || '—',
    avatar: account?.avatar || null,
    twoFactorEnabled: !!account?.twoFactorEnabled,
    warnings: Number(account?.warnings) || 0,
    isBanned: !!account?.isBanned,
  }), [account])

  const playerUid = getPlayerUid(data.id)
  const roleColor = getRoleColor(data.role)
  const faction = useMemo(() => getFactionByRoleName(data.role), [data.role])
  const canManage = currentUser ? canEditRoles(currentUser) : false

  if (loading) {
    return (
      <StateBlock>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 26, height: 26, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'pu-spin .7s linear infinite' }} />
          <style>{`@keyframes pu-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Загрузка профиля…</div>
        </div>
      </StateBlock>
    )
  }

  if (error || !account) {
    return (
      <StateBlock>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Не удалось открыть профиль</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.5 }}>
            {error || 'Пользователь не найден'}
          </div>
          {onBack && (
            <button
              onClick={onBack}
              style={{ padding: '9px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'rgba(255,255,255,.03)', color: T.text, fontFamily: 'inherit' }}
            >
              Назад
            </button>
          )}
        </div>
      </StateBlock>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '40px 48px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes pu-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .pu-panel {
          background: ${T.panel};
          border: 1px solid ${T.border};
          border-radius: 14px; padding: 28px;
          animation: pu-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .pu-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 4px; border-bottom: 1px solid ${T.borderSoft};
          gap: 12px;
        }
        .pu-row:last-child { border-bottom: none; }
        .pu-label { font-size: 12px; color: ${T.muted}; font-weight: 600; }
        .pu-value { font-size: 13.5px; font-weight: 600; color: ${T.text}; }
        .pu-link { color: ${T.accent}; text-decoration: none; font-size: 13.5px; font-weight: 600; }
        .pu-link:hover { text-decoration: underline; }
        .pu-back {
          display: inline-flex; align-items: center; gap: 7px;
          background: none; border: none; color: ${T.muted}; cursor: pointer;
          font-family: inherit; font-size: 12.5px; font-weight: 700; padding: 0;
        }
        .pu-back:hover { color: #fff; }
        .pu-btn {
          padding: 9px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
          cursor: pointer; border: none; font-family: inherit; transition: opacity .15s;
        }
        .pu-btn:hover { opacity: .88; }
        .avatar-circle {
          width: 84px; height: 84px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 800; color: var(--rc);
          background: linear-gradient(160deg, var(--rc-soft) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid var(--rc-border);
        }
        .avatar-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .role-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;
          background: var(--rc-soft); color: var(--rc); border: 1px solid var(--rc-border);
        }
        .status-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: T.faint, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 600 }}>
            <span>Пользователи</span>
            <span style={{ opacity: .5 }}><IconChevron /></span>
            <span style={{ color: 'rgba(255,255,255,.45)' }}>Профиль</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              {onBack && (
                <button className="pu-back" onClick={onBack} style={{ marginBottom: 10 }}>
                  <IconArrowLeft /> Назад к списку
                </button>
              )}
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
                Профиль пользователя
              </h1>
              <div style={{ fontSize: '13px', color: T.muted, marginTop: '4px' }}>
                Просмотр данных аккаунта «{data.nickname}»
              </div>
            </div>

            {canManage && onManage && (
              <button
                className="pu-btn"
                onClick={() => onManage(account)}
                style={{ background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}40` }}
              >
                Управлять в разделе «Пользователи»
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div className="pu-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                className="avatar-circle"
                style={{
                  '--rc': roleColor,
                  '--rc-soft': `${roleColor}1a`,
                  '--rc-border': `${roleColor}40`,
                }}
              >
                {data.avatar ? <img src={data.avatar} alt="avatar" /> : (data.nickname[0] || '?').toUpperCase()}
              </div>

              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>{data.nickname}</h2>
                  {data.isBanned && (
                    <span className="status-pill" style={{ background: T.dangerSoft, color: T.danger, border: `1px solid ${T.danger}40` }}>
                      Заблокирован
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div
                    className="role-badge"
                    style={{
                      '--rc': roleColor,
                      '--rc-soft': `${roleColor}18`,
                      '--rc-border': `${roleColor}40`,
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor }} />
                    {data.role}
                  </div>
                  {faction?.label && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: T.muted, fontWeight: 600 }}>
                      Фракция: {faction.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pu-panel">
              <div style={{ fontSize: '11px', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Реквизиты аккаунта
              </div>
              <div className="pu-row">
                <span className="pu-label">Идентификатор (UID)</span>
                <span className="pu-value" style={{ fontFamily: 'monospace', color: T.accent }}>{playerUid}</span>
              </div>
              <div className="pu-row">
                <span className="pu-label">Логин авторизации</span>
                <span className="pu-value">{data.login}</span>
              </div>
              <div className="pu-row">
                <span className="pu-label">Дата регистрации</span>
                <span className="pu-value" style={{ color: 'rgba(255,255,255,.7)' }}>{fmtDate(data.registeredAt)}</span>
              </div>
              <div className="pu-row">
                <span className="pu-label">Профиль ВКонтакте</span>
                {data.vk && data.vk !== '—' ? (
                  <a href={data.vk} target="_blank" rel="noopener noreferrer" className="pu-link">{data.vk.replace('https://vk.com/', '@')}</a>
                ) : (
                  <span style={{ fontSize: '13px', color: T.faint }}>Не указан</span>
                )}
              </div>
              <div className="pu-row">
                <span className="pu-label">Аккаунт форума</span>
                {data.forum && data.forum !== '—' ? (
                  <a href={data.forum} target="_blank" rel="noopener noreferrer" className="pu-link">Перейти в профиль</a>
                ) : (
                  <span style={{ fontSize: '13px', color: T.faint }}>Не указан</span>
                )}
              </div>

              <div className="pu-row" style={{ marginTop: '8px', paddingTop: '16px', borderTop: `1px dashed ${T.border}` }}>
                <span className="pu-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: data.twoFactorEnabled ? T.success : T.muted }}><IconShield /></span>
                  Google Authenticator (2FA)
                </span>
                <span
                  className="status-pill"
                  style={
                    data.twoFactorEnabled
                      ? { background: T.successSoft, color: T.success, border: `1px solid ${T.success}30` }
                      : { background: 'rgba(255,255,255,.04)', color: T.faint, border: `1px solid ${T.border}` }
                  }
                >
                  {data.twoFactorEnabled ? 'Подключено' : 'Не подключено'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="pu-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${T.borderSoft}`, paddingBottom: '12px' }}>
                <span style={{ color: T.muted, display: 'flex' }}><IconUsers /></span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: T.muted }}>Статус в структуре</span>
              </div>

              <div className="pu-row" style={{ padding: '6px 0' }}>
                <span className="pu-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: data.warnings > 0 ? T.warn : T.muted }}><IconWarn /></span>
                  Выговоры
                </span>
                <span
                  className="status-pill"
                  style={
                    data.warnings > 0
                      ? { background: T.warnSoft, color: T.warn, border: `1px solid ${T.warn}40` }
                      : { background: 'rgba(255,255,255,.04)', color: T.faint, border: `1px solid ${T.border}` }
                  }
                >
                  {data.warnings > 0 ? `${data.warnings}` : 'Нет'}
                </span>
              </div>

              <div className="pu-row" style={{ padding: '6px 0' }}>
                <span className="pu-label">Статус аккаунта</span>
                <span
                  className="status-pill"
                  style={
                    data.isBanned
                      ? { background: T.dangerSoft, color: T.danger, border: `1px solid ${T.danger}40` }
                      : { background: T.successSoft, color: T.success, border: `1px solid ${T.success}30` }
                  }
                >
                  {data.isBanned ? 'Заблокирован' : 'Активен'}
                </span>
              </div>

              {(isLeader(account) || isChief(account) || isDeputy(account)) && (
                <div style={{ fontSize: '11.5px', color: T.muted, lineHeight: 1.5, paddingTop: '4px' }}>
                  Изменение роли, выдача выговора и снятие с должности доступны в разделе "Пользователи" - в зависимости от ваших прав доступа.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}