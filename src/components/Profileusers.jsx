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

  Дизайн приведён к единому стилю с Dashboard.jsx: тёмный радиальный
  градиент фона, карточки rounded-xl border-white/[0.08] bg-white/[0.015]
  с цветной полосой слева, аптейс-заголовки секций с разделителем,
  скелетоны с шиммер-анимацией вместо спиннера.

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

// ── SVG ИКОНКИ (в стиле IC из Dashboard.jsx) ────────────────────
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
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconWarn = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconLink = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconAlert = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3l9 18H3l9-18z"/>
  </svg>
)

// Роль → акцентный цвет (rgb-триплет, как в Dashboard: `rgb(${accent})` / `rgba(${accent},.12)`)
function getRoleAccent(roleName = '') {
  if (roleName === 'Главный Разработчик') return '226,99,95'      // danger
  if (roleName.startsWith('ГС') || roleName.startsWith('Главный Следящий')) return '251,146,60' // orange
  if (roleName.startsWith('ЗГС') || roleName.startsWith('Заместитель Главного Следящего')) return '251,146,60'
  if (roleName.startsWith('Следящий')) return '139,147,240'       // indigo
  if (roleName.startsWith('Лидер')) return '63,183,135'           // success
  return '91,141,239'                                              // accent blue
}

// Пилюля-статус в едином стиле дешборда
function StatusPill({ children, accent, muted }) {
  if (muted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/[0.04] text-white/35 border border-white/[0.08]">
        {children}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: `rgba(${accent},.12)`, color: `rgb(${accent})`, border: `1px solid rgba(${accent},.35)` }}
    >
      {children}
    </span>
  )
}

// Строка «лейбл — значение» внутри карточки реквизитов
function InfoRow({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-3.5 ${last ? '' : 'border-b border-white/[0.05]'}`}>
      <span className="text-[12px] font-semibold text-white/45">{label}</span>
      <span className="text-[13.5px] font-semibold text-right">{children}</span>
    </div>
  )
}

function SkeletonProfile() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 flex items-center gap-5">
          <div className="skeleton-text w-20 h-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="skeleton-text h-6 w-48" />
            <div className="skeleton-text h-5 w-32" />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 space-y-4">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="skeleton-text h-3.5 w-32" />
              <div className="skeleton-text h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 space-y-4">
        <div className="skeleton-text h-3.5 w-28" />
        <div className="skeleton-text h-5 w-full" />
        <div className="skeleton-text h-5 w-full" />
      </div>
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
  const accent = getRoleAccent(data.role)
  const faction = useMemo(() => getFactionByRoleName(data.role), [data.role])
  const canManage = currentUser ? canEditRoles(currentUser) : false

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes db-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes db-fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-statPop  { 0%{opacity:0;transform:translateY(6px) scale(.94)} 100%{opacity:1;transform:translateY(0) scale(1)} }

        .skeleton-text {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: db-shimmer 1.6s infinite linear;
          border-radius: 6px;
        }
      `}</style>

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── BREADCRUMB / HEADER ───────────────────────────── */}
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[1.5px] uppercase text-white/35 mb-5">
          <span>Пользователи</span>
          <span className="opacity-50"><IconChevron /></span>
          <span className="text-white/60">Профиль</span>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-white/45 hover:text-white text-[12.5px] font-bold mb-3 transition-colors"
              >
                <IconArrowLeft /> Назад к списку
              </button>
            )}
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Профиль пользователя</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">
              {loading ? 'Загрузка…' : data.nickname}
            </h1>
            {!loading && !error && (
              <p className="text-slate-400 max-w-lg">Просмотр данных аккаунта «{data.nickname}»</p>
            )}
          </div>

          {!loading && !error && canManage && onManage && (
            <button
              onClick={() => onManage(account)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-400 transition-all duration-150"
            >
              Управлять в разделе «Пользователи»
            </button>
          )}
        </div>

        {/* ── СОСТОЯНИЯ: загрузка / ошибка / данные ─────────── */}
        {loading ? (
          <SkeletonProfile />
        ) : error || !account ? (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015] mb-6"
            style={{ minHeight: 220 }}
          >
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-white/5 text-orange-300/80">
                <IconAlert />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Не удалось открыть профиль</h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {error || 'Пользователь не найден'}
              </p>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white transition-all duration-150"
                >
                  Назад
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

            <div className="flex flex-col gap-5">

              {/* ── КАРТОЧКА АВАТАРА / РОЛИ ────────────────── */}
              <div
                className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]"
                style={{ animation: 'db-fadeUp .35s ease both' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accent})` }} />
                <div className="flex items-center gap-5 pl-6 pr-6 py-6 flex-wrap">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden font-black text-2xl"
                    style={{ background: `rgba(${accent},.12)`, color: `rgb(${accent})`, border: `1px solid rgba(${accent},.35)` }}
                  >
                    {data.avatar ? (
                      <img src={data.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (data.nickname[0] || '?').toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black tracking-tight truncate">{data.nickname}</h2>
                      {data.isBanned && <StatusPill accent="226,99,95">Заблокирован</StatusPill>}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap mt-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-bold"
                        style={{ background: `rgba(${accent},.1)`, color: `rgb(${accent})`, border: `1px solid rgba(${accent},.3)` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accent})` }} />
                        {data.role}
                      </span>
                      {faction?.label && (
                        <span className="text-xs text-slate-400 font-semibold">Фракция: {faction.label}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── РЕКВИЗИТЫ АККАУНТА ─────────────────────── */}
              <div
                className="rounded-xl border border-white/[0.08] bg-white/[0.015] px-6 py-5"
                style={{ animation: 'db-fadeUp .35s ease .05s both' }}
              >
                <div className="text-[11px] font-extrabold tracking-[2px] uppercase text-white/35 mb-1">
                  Реквизиты аккаунта
                </div>

                <InfoRow label="Идентификатор (UID)">
                  <span className="font-mono" style={{ color: `rgb(${accent})` }}>{playerUid}</span>
                </InfoRow>
                <InfoRow label="Логин авторизации">{data.login}</InfoRow>
                <InfoRow label="Дата регистрации">
                  <span className="text-slate-300">{fmtDate(data.registeredAt)}</span>
                </InfoRow>
                <InfoRow label="Профиль ВКонтакте">
                  {data.vk && data.vk !== '—' ? (
                    <a
                      href={data.vk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-orange-300/90 hover:text-orange-300 underline decoration-dotted underline-offset-2 transition-colors"
                    >
                      <IconLink />{data.vk.replace('https://vk.com/', '@')}
                    </a>
                  ) : (
                    <span className="text-white/30 font-medium">Не указан</span>
                  )}
                </InfoRow>
                <InfoRow label="Аккаунт форума" last>
                  {data.forum && data.forum !== '—' ? (
                    <a
                      href={data.forum}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-orange-300/90 hover:text-orange-300 underline decoration-dotted underline-offset-2 transition-colors"
                    >
                      <IconLink />Перейти в профиль
                    </a>
                  ) : (
                    <span className="text-white/30 font-medium">Не указан</span>
                  )}
                </InfoRow>

                <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-dashed border-white/[0.08]">
                  <span className="text-[12px] font-semibold text-white/45 inline-flex items-center gap-1.5">
                    <span style={{ color: data.twoFactorEnabled ? 'rgb(63,183,135)' : 'rgba(255,255,255,.35)' }}><IconShield /></span>
                    Google Authenticator (2FA)
                  </span>
                  {data.twoFactorEnabled
                    ? <StatusPill accent="63,183,135">Подключено</StatusPill>
                    : <StatusPill muted>Не подключено</StatusPill>}
                </div>
              </div>
            </div>

            {/* ── СТАТУС В СТРУКТУРЕ ───────────────────────── */}
            <div
              className="rounded-xl border border-white/[0.08] bg-white/[0.015] px-6 py-5 flex flex-col gap-4"
              style={{ animation: 'db-fadeUp .35s ease .1s both' }}
            >
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                <span className="text-white/40"><IconUsers /></span>
                <span className="text-[12px] font-bold text-white/50">Статус в структуре</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-white/45 inline-flex items-center gap-1.5">
                  <span style={{ color: data.warnings > 0 ? 'rgb(251,146,60)' : 'rgba(255,255,255,.35)' }}><IconWarn /></span>
                  Выговоры
                </span>
                {data.warnings > 0
                  ? <StatusPill accent="251,146,60">{data.warnings}</StatusPill>
                  : <StatusPill muted>Нет</StatusPill>}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-white/45">Статус аккаунта</span>
                {data.isBanned
                  ? <StatusPill accent="226,99,95">Заблокирован</StatusPill>
                  : <StatusPill accent="63,183,135">Активен</StatusPill>}
              </div>

              {(isLeader(account) || isChief(account) || isDeputy(account)) && (
                <div className="text-[11.5px] text-white/40 leading-relaxed pt-1 border-t border-white/[0.05] mt-1">
                  Изменение роли, выдача выговора и снятие с должности доступны в разделе «Пользователи» — в зависимости от ваших прав доступа.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}