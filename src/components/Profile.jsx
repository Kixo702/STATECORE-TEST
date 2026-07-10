import { useMemo, useState, useEffect } from 'react'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function getPlayerUid(id) {
  if (!id) return 'SC-000000'
  return `SC-${id.replace(/-/g, '').toUpperCase().slice(0, 6)}`
}

// ── SVG ИКОНКИ ДЛЯ ЛАКОНИЧНОСТИ ─────────────────────────────────
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

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
  const logsKey = `sc_logs_${data.id || 'guest'}`
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(logsKey)) || [] } catch { return [] }
  })

  const [showAddSharedModal, setShowAddSharedModal] = useState(false)
  const [addingShared, setAddingShared] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [nickValue, setNickValue] = useState(data.nickname)
  const [nickError, setNickError] = useState('')
  const [nickSaving, setNickSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('sc_user') || 'null')
      if (!session || !session.id) return
      const raw = localStorage.getItem('sc_users')
      const users = raw ? JSON.parse(raw) : null
      const exists = Array.isArray(users) && users.find(x => x.id === session.id || (x.login && session.login && x.login.toLowerCase() === (session.login || '').toLowerCase()))
      if (!exists) setShowAddSharedModal(true)
    } catch (e) {}
  }, [])

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
        let stored = {}
        try { stored = JSON.parse(localStorage.getItem('sc_user') || '{}') } catch { stored = {} }
        stored.nickname = trimmed
        localStorage.setItem('sc_user', JSON.stringify(stored))

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

  const addSessionToShared = async () => {
    try {
      setAddingShared(true)
      const session = JSON.parse(localStorage.getItem('sc_user') || 'null')
      if (!session || !session.id) return
      let users = []
      try {
        const raw = localStorage.getItem('sc_users')
        if (raw) users = JSON.parse(raw)
      } catch(e) { users = [] }

      const exists = users.find(x => x.id === session.id)
      if (!exists) {
        users.push({
          id: session.id,
          login: session.login || session.id,
          nickname: session.nickname || '—',
          vk: session.vk || '',
          forum: session.forum || '',
          password: '',
          registeredAt: session.registeredAt || new Date().toISOString(),
          roleName: session.roleName || 'Игрок'
        })
        localStorage.setItem('sc_users', JSON.stringify(users))
        pushLog('Добавлен в базу пользователей')
      }
      setShowAddSharedModal(false)
    } finally { setAddingShared(false) }
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(playerUid).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Цвета ролей под тон проекта
  const roleColor = {
    'Администратор': '#ef4444',
    'Главный Следящий': '#fb923c',
    'Следящий': '#8b5cf6',
    'Лидер': '#34d399',
    'Игрок': '#60a5fa',
  }[data.role] || '#60a5fa'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060810',
      color: '#e8edf5',
      fontFamily: "'Syne', 'Onest', 'Segoe UI', sans-serif",
      padding: '40px 48px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Onest:wght@400;500;600;700;800&display=swap');

        @keyframes prof-fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes prof-spin { to{transform:rotate(360deg)} }

        .prof-panel {
          background: linear-gradient(160deg, rgba(13,17,30,.6) 0%, rgba(7,9,16,.8) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px; padding: 32px; backdrop-filter: blur(20px);
          box-shadow: 0 30px 90px rgba(0,0,0,.3);
          animation: prof-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .prof-mini-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 14px; padding: 14px 16px;
        }
        .prof-input-edit {
          background: rgba(255,255,255,.03); border: 1px solid rgba(96,165,250,0.3);
          color: #fff; padding: 10px; border-radius: 12px; font-size: 15px;
          width: 100%; outline: none; text-align: center; font-family: inherit; font-weight: 600;
        }
        .prof-input-edit:focus { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(96,165,250,0.1); }
        .prof-link {
          color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 600;
          transition: opacity 0.2s; display: inline-block; margin-top: 4px;
        }
        .prof-link:hover { opacity: 0.8; }
        .log-scroller::-webkit-scrollbar { width: 4px; }
        .log-scroller::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Хлебные крошки и заголовок */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,.25)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, fontFamily: 'Onest, sans-serif' }}>
            <span>Личный кабинет</span>
            <span style={{ opacity: .35 }}><IconChevron /></span>
            <span style={{ color: 'rgba(255,255,255,.4)' }}>Управление аккаунтом</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', background: 'linear-gradient(125deg, #ffffff 30%, rgba(255,255,255,.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Syne, sans-serif' }}>
            Профиль игрока
          </h1>
        </div>

        {/* Сетка разметки */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          
          {/* ЛЕВАЯ СТОРОНА: Главный блок аккаунта */}
          <div className="prof-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Карточка юзера (Аватар + Ник + Роль) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '28px' }}>
              <div style={{
                width: '74px', height: '74px', borderRadius: '18px',
                background: `linear-gradient(135deg, ${roleColor}15 0%, rgba(255,255,255,0.01) 100%)`,
                border: `1px solid ${roleColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 800, color: roleColor, fontFamily: 'Syne', boxShadow: `0 8px 24px ${roleColor}08`
              }}>
                {data.nickname[0]?.toUpperCase()}
              </div>

              <div style={{ flexGrow: 1 }}>
                {editingNick ? (
                  <div style={{ maxWidth: '300px' }}>
                    <input
                      className="prof-input-edit"
                      value={nickValue}
                      onChange={e => { setNickValue(e.target.value); setNickError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveNick(); if (e.key === 'Escape') { setEditingNick(false); setNickValue(data.nickname); setNickError('') } }}
                      autoFocus
                      maxLength={24}
                    />
                    {nickError && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>{nickError}</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={handleSaveNick} disabled={nickSaving} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#60a5fa', color: '#060810', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        Сохранить
                      </button>
                      <button onClick={() => { setEditingNick(false); setNickValue(data.nickname); setNickError('') }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Onest' }}>{data.nickname}</h2>
                    <button onClick={() => setEditingNick(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
                      <IconEdit />
                    </button>
                  </div>
                )}

                {/* Роль в системе */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', fontWeight: 700, color: roleColor }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor }} />
                  {data.role}
                </div>
              </div>
            </div>

            {/* Сетка системных параметров аккаунта */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="prof-mini-card">
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '6px' }}>Идентификатор (UID)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.5px' }}>{playerUid}</span>
                  <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0 }}>
                    {copied ? '✅' : '[Копировать]'}
                  </button>
                </div>
              </div>

              <div className="prof-mini-card">
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '6px' }}>Логин авторизации</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f4fa' }}>{data.login}</div>
              </div>

              <div className="prof-mini-card">
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '6px' }}>Дата регистрации</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{fmtDate(data.registeredAt)}</div>
              </div>
            </div>

            {/* Блок привязанных социальных сетей (Компактный) */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: '16px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Профиль ВКонтакте</div>
                {data.vk && data.vk !== '—' ? (
                  <a href={data.vk} target="_blank" rel="noopener noreferrer" className="prof-link">{data.vk.replace('https://vk.com/', '@')}</a>
                ) : (
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.15)', display: 'block', marginTop: '4px' }}>Не указан</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Аккаунт форума</div>
                {data.forum && data.forum !== '—' ? (
                  <a href={data.forum} target="_blank" rel="noopener noreferrer" className="prof-link">Перейти в профиль</a>
                ) : (
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.15)', display: 'block', marginTop: '4px' }}>Не указан</span>
                )}
              </div>
            </div>

          </div>

          {/* ПРАВАЯ СТОРОНА: Лаконичный лог изменений */}
          <div className="prof-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', display: 'flex' }}><IconClock /></span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Лог сессии</span>
              {logs.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '6px', padding: '1px 6px', fontWeight: 700 }}>
                  {logs.length}
                </span>
              )}
            </div>

            <div className="log-scroller" style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
                  Действия не зафиксированы
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.4 }}>{log.text}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px', fontWeight: 600 }}>
                      {new Date(log.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ В БАЗУ */}
        {showAddSharedModal && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddSharedModal(false)} />
            <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', width: '400px', zIndex: 1210 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Синхронизация</div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px', fontFamily: 'Onest' }}>Внести вас в реестр пользователей?</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', lineHeight: 1.5 }}>Ваш профиль будет сохранен в общей локальной таблице `sc_users` для быстрого доступа.</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addSessionToShared} disabled={addingShared} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#60a5fa', color: '#060810', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                  {addingShared ? 'Сохранение...' : 'Да, синхронизировать'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}