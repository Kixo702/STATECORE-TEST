import { useMemo, useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getPendingNickRequestForUser, createNickRequest } from '../lib/requests'
import { getUsers, saveUsers, setSession, getSession, upsertUser } from '../lib/userStore'
import { updateUserOnServer } from '../lib/api' // Подключите ваш API-метод сохранения, если есть

// ── Вспомогательные функции для TOTP / Google Authenticator ──────
function generateBase32Secret(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    secret += chars[array[i] % chars.length]
  }
  return secret
}

function base32ToBytes(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  let hex = ''
  const cleaned = base32.replace(/=+$/, '').toUpperCase()
  for (let i = 0; i < cleaned.length; i++) {
    const val = base32chars.indexOf(cleaned.charAt(i))
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4)
    hex += parseInt(chunk, 2).toString(16)
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

async function verifyTOTP(secret, token) {
  try {
    const keyBytes = base32ToBytes(secret)
    const epoch = Math.floor(Date.now() / 1000)
    const timeStep = 30
    const counter = Math.floor(epoch / timeStep)

    for (let errorWindow = -1; errorWindow <= 1; errorWindow++) {
      const currentCounter = counter + errorWindow
      const buffer = new ArrayBuffer(8)
      const view = new DataView(buffer)
      view.setUint32(4, currentCounter, false)

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )

      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer)
      const sigBytes = new Uint8Array(signature)
      const offset = sigBytes[sigBytes.length - 1] & 0xf
      const binary =
        ((sigBytes[offset] & 0x7f) << 24) |
        ((sigBytes[offset + 1] & 0xff) << 16) |
        ((sigBytes[offset + 2] & 0xff) << 8) |
        (sigBytes[offset + 3] & 0xff)

      const otp = (binary % 1000000).toString().padStart(6, '0')
      if (otp === token.trim()) return true
    }
  } catch (err) {
    console.error('Ошибка проверки 2FA:', err)
  }
  return false
}

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

function fileToAvatarDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('Файл должен быть изображением')); return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Файл слишком большой (максимум 8 МБ)')); return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Не удалось декодировать изображение'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// ── SVG ИКОНКИ ──────────────────────────────────────────────────
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IconHourglass = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
  </svg>
)
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
    avatar: u?.avatar || null,
    twoFactorSecret: u?.twoFactorSecret || null,
    twoFactorEnabled: !!u?.twoFactorEnabled,
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

  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || data.avatar)
  const [avatarError, setAvatarError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Синхронизируем аватар напрямую при изменении user
  useEffect(() => {
    if (user?.avatar !== undefined) {
      setAvatarUrl(user.avatar)
    }
  }, [user?.avatar])

  const [pendingReq, setPendingReq] = useState(() => getPendingNickRequestForUser(data.id))

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(data.twoFactorEnabled)
  const [show2FaModal, setShow2FaModal] = useState(false)
  const [tempSecret, setTempSecret] = useState('')
  const [totpInput, setTotpInput] = useState('')
  const [totpError, setTotpError] = useState('')
  const [verifying2Fa, setVerifying2Fa] = useState(false)
  const [disable2FaModal, setDisable2FaModal] = useState(false)

  const pushLog = (text) => {
    const entry = { text, at: new Date().toISOString() }
    setLogs((prev) => {
      const updated = [entry, ...prev].slice(0, 30)
      localStorage.setItem(logsKey, JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('sc_user') || 'null')
      if (!session || !session.id) return
      const users = getUsers()
      const exists = Array.isArray(users) && users.find(x => x.id === session.id || (x.login && session.login && x.login.toLowerCase() === (session.login || '').toLowerCase()))
      if (!exists) {
        const timer = window.setTimeout(() => setShowAddSharedModal(true), 0)
        return () => window.clearTimeout(timer)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const refresh = () => setPendingReq(getPendingNickRequestForUser(data.id))
    window.addEventListener('sc:nick-requests-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('sc:nick-requests-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [data.id])

  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarUploading(true)
    try {
      const dataUrl = await fileToAvatarDataUrl(file)

      // 1. Обновляем локальный стейт
      setAvatarUrl(dataUrl)

      // 2. Подготавливаем обновленный объект пользователя
      const updatedUser = { ...(user || u), avatar: dataUrl }

      // 3. Синхронизируем со сторами и сессией
      setSession(updatedUser)
      upsertUser(updatedUser)

      // 4. Опционально сохраняем на бэкенде (если API настроен)
      if (typeof updateUserOnServer === 'function') {
        try {
          await updateUserOnServer(updatedUser)
        } catch (apiErr) {
          console.warn('Сервер не сохранил аватар:', apiErr)
        }
      }

      pushLog('Обновлена аватарка профиля')

      // 5. Вызываем родительский callback для немедленного обновления у остальных компонентов (Sidebar, Topbar)
      if (onUpdate) {
        onUpdate(updatedUser)
      }
    } catch (err) {
      setAvatarError(err.message || 'Не удалось загрузить изображение')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveNick = () => {
    const trimmed = nickValue.trim()
    if (!trimmed) { setNickError('Никнейм не может быть пустым'); return }
    if (trimmed.length < 2) { setNickError('Слишком короткий никнейм'); return }
    if (trimmed === data.nickname) { setEditingNick(false); return }
    setNickSaving(true)
    setTimeout(() => {
      try {
        const req = createNickRequest({
          userId: data.id,
          login: data.login,
          currentNickname: data.nickname,
          requestedNickname: trimmed,
        })
        setPendingReq(req)
        pushLog(`Отправлена заявка на смену никнейма: «${data.nickname}» → «${trimmed}»`)
      } catch (e) { console.error(e) }
      setEditingNick(false)
      setNickSaving(false)
      setNickError('')
    }, 350)
  }

  const handleStart2FA = () => {
    const secret = generateBase32Secret()
    setTempSecret(secret)
    setTotpInput('')
    setTotpError('')
    setShow2FaModal(true)
  }

  const handleVerifyAndEnable2FA = async () => {
    if (!totpInput || totpInput.length < 6) {
      setTotpError('Введите 6-значный код')
      return
    }
    setVerifying2Fa(true)
    setTotpError('')

    try {
      // 1. Локальная проверка TOTP
      const isValid = await verifyTOTP(tempSecret, totpInput)
      if (!isValid) {
        setTotpError('Неверный код. Проверьте время на телефоне')
        setVerifying2Fa(false)
        return
      }

      // 2. Формируем объект локального состояния
      const updatedUser = { 
        ...(user || u), 
        twoFactorSecret: tempSecret, 
        twoFactorEnabled: true,
        is_totp_enabled: true 
      }

      // 3. Отправляем НА СЕРВЕР только релевантные поля для 2FA
      if (typeof updateUserOnServer === 'function') {
        await updateUserOnServer({
          id: data.id,
          twoFactorSecret: tempSecret,       // Проверь наименование в БД!
          two_factor_secret: tempSecret,      // Дублируем под snake_case для надежности
          twoFactorEnabled: true,
          is_totp_enabled: true
        })
      }

      // 4. Обновляем локальное хранилище и UI
      setSession(updatedUser)
      upsertUser(updatedUser)
      setTwoFactorEnabled(true)
      setShow2FaModal(false)
      pushLog('Включена двухфакторная аутентификация (Google Auth)')
      
      if (onUpdate) onUpdate(updatedUser)
    } catch (err) {
      console.error('Ошибка при сохранении 2FA:', err)
      setTotpError(err.message || 'Ошибка сервера (500). Проверьте бэкенд-логи на Render')
    } finally {
      setVerifying2Fa(false)
    }
  }

  const handleConfirmDisable2FA = async () => {
    try {
      const updatedUser = { 
        ...(user || u), 
        twoFactorEnabled: false,
        is_totp_enabled: false,
        twoFactorSecret: null 
      }

      // Сохраняем сброс 2FA в PostgreSQL
      if (typeof updateUserOnServer === 'function') {
        await updateUserOnServer(updatedUser)
      }

      setSession(updatedUser)
      upsertUser(updatedUser)

      setTwoFactorEnabled(false)
      setDisable2FaModal(false)
      pushLog('Отключена двухфакторная аутентификация')
      
      if (onUpdate) onUpdate(updatedUser)
    } catch (err) {
      console.error('Ошибка отключения 2FA:', err)
    }
  }

  const addSessionToShared = async () => {
    try {
      setAddingShared(true)
      const session = getSession()
      if (!session || !session.id) return
      let users = getUsers()

      const exists = users.find(x => x.id === session.id)
      if (!exists) {
        users.push({
          id: session.id,
          login: session.login || session.id,
          nickname: session.nickname || '—',
          vk: session.vk || '',
          forum: session.forum || '',
          avatar: session.avatar || null,
          password: '',
          registeredAt: session.registeredAt || new Date().toISOString(),
          roleName: session.roleName || 'Игрок',
          twoFactorEnabled: session.twoFactorEnabled || false,
          twoFactorSecret: session.twoFactorSecret || null,
        })
        saveUsers(users)
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

  const roleColor = getRoleColor(data.role)
  const otpAuthUrl = `otpauth://totp/StateCore:${encodeURIComponent(data.login)}?secret=${tempSecret}&issuer=StateCore`

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

        @keyframes prof-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes prof-spin { to{transform:rotate(360deg)} }

        .prof-panel {
          background: ${T.panel};
          border: 1px solid ${T.border};
          border-radius: 14px; padding: 28px;
          animation: prof-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .prof-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 4px; border-bottom: 1px solid ${T.borderSoft};
        }
        .prof-row:last-child { border-bottom: none; }
        .prof-label {
          font-size: 12px; color: ${T.muted}; font-weight: 600;
        }
        .prof-value { font-size: 13.5px; font-weight: 600; color: ${T.text}; }
        .prof-input-edit {
          background: rgba(255,255,255,.04); border: 1px solid ${T.accent}55;
          color: #fff; padding: 9px 12px; border-radius: 8px; font-size: 14px;
          width: 100%; outline: none; font-family: inherit; font-weight: 600;
          box-sizing: border-box;
        }
        .prof-input-edit:focus { border-color: ${T.accent}; box-shadow: 0 0 0 3px ${T.accentSoft}; }
        .prof-link {
          color: ${T.accent}; text-decoration: none; font-size: 13.5px; font-weight: 600;
        }
        .prof-link:hover { text-decoration: underline; }
        .log-scroller::-webkit-scrollbar { width: 4px; }
        .log-scroller::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .prof-btn {
          padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
          cursor: pointer; border: none; font-family: inherit; transition: opacity .15s, background .15s;
        }
        .prof-btn:disabled { opacity: .5; cursor: default; }
        .prof-btn-ghost {
          padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; border: 1px solid ${T.border}; background: rgba(255,255,255,.02); color: ${T.muted};
          font-family: inherit;
        }
        .avatar-wrap { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
        .avatar-circle {
          width: 84px; height: 84px; border-radius: 12px; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 800; color: var(--rc);
          background: linear-gradient(160deg, var(--rc-soft) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid var(--rc-border);
        }
        .avatar-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .avatar-overlay {
          position: absolute; inset: 0; border-radius: 12px;
          background: rgba(6,9,14,0.72);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity .18s; cursor: pointer; color: #fff;
        }
        .avatar-wrap:hover .avatar-overlay { opacity: 1; }
        .avatar-overlay.uploading { opacity: 1; }
        .badge-pending {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
          background: ${T.warnSoft}; color: ${T.warn}; border: 1px solid ${T.warn}40;
        }
        .role-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;
          background: var(--rc-soft); color: var(--rc); border: 1px solid var(--rc-border);
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: T.faint, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
            <span>Личный кабинет</span>
            <span style={{ opacity: .5 }}><IconChevron /></span>
            <span style={{ color: 'rgba(255,255,255,.45)' }}>Профиль</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
            Профиль
          </h1>
          <div style={{ fontSize: '13px', color: T.muted, marginTop: '4px' }}>
            Личные данные, аватар и настройки аккаунта
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div className="prof-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                className="avatar-wrap"
                style={{
                  '--rc': roleColor,
                  '--rc-soft': `${roleColor}1a`,
                  '--rc-border': `${roleColor}40`,
                }}
              >
                <div className="avatar-circle">
                  {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : data.nickname[0]?.toUpperCase()}
                </div>
                <div
                  className={`avatar-overlay${avatarUploading ? ' uploading' : ''}`}
                  onClick={avatarUploading ? undefined : handleAvatarPick}
                  title="Изменить аватар"
                >
                  {avatarUploading ? (
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'prof-spin .7s linear infinite' }} />
                  ) : (
                    <IconCamera />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>

              <div style={{ flexGrow: 1, minWidth: 0 }}>
                {editingNick ? (
                  <div style={{ maxWidth: '320px' }}>
                    <input
                      className="prof-input-edit"
                      value={nickValue}
                      onChange={e => { setNickValue(e.target.value); setNickError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveNick(); if (e.key === 'Escape') { setEditingNick(false); setNickValue(data.nickname); setNickError('') } }}
                      autoFocus
                      maxLength={24}
                    />
                    {nickError && <div style={{ color: T.danger, fontSize: '11.5px', marginTop: '6px' }}>{nickError}</div>}
                    <div style={{ fontSize: '11px', color: T.muted, marginTop: '7px', lineHeight: 1.5 }}>
                      Никнейм не изменится сразу — заявка уйдёт на рассмотрение модераторам.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="prof-btn" onClick={handleSaveNick} disabled={nickSaving} style={{ background: T.accent, color: '#0a0e16' }}>
                        {nickSaving ? 'Отправка…' : 'Отправить заявку'}
                      </button>
                      <button className="prof-btn-ghost" onClick={() => { setEditingNick(false); setNickValue(data.nickname); setNickError('') }}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>{data.nickname}</h2>
                      {!pendingReq && (
                        <button onClick={() => setEditingNick(true)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }} title="Изменить никнейм">
                          <IconEdit />
                        </button>
                      )}
                      {pendingReq && (
                        <span className="badge-pending"><IconHourglass /> На рассмотрении: «{pendingReq.requestedNickname}»</span>
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
                    </div>
                  </div>
                )}
                {avatarError && <div style={{ color: T.danger, fontSize: '11.5px', marginTop: '8px' }}>{avatarError}</div>}
              </div>
            </div>

            <div className="prof-panel">
              <div style={{ fontSize: '11px', fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Реквизиты аккаунта
              </div>
              <div className="prof-row">
                <span className="prof-label">Идентификатор (UID)</span>
                <span className="prof-value" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'monospace', color: T.accent }}>
                  {playerUid}
                  <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0, fontFamily: 'Inter' }}>
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                </span>
              </div>
              <div className="prof-row">
                <span className="prof-label">Логин авторизации</span>
                <span className="prof-value">{data.login}</span>
              </div>
              <div className="prof-row">
                <span className="prof-label">Дата регистрации</span>
                <span className="prof-value" style={{ color: 'rgba(255,255,255,.7)' }}>{fmtDate(data.registeredAt)}</span>
              </div>
              <div className="prof-row">
                <span className="prof-label">Профиль ВКонтакте</span>
                {data.vk && data.vk !== '—' ? (
                  <a href={data.vk} target="_blank" rel="noopener noreferrer" className="prof-link">{data.vk.replace('https://vk.com/', '@')}</a>
                ) : (
                  <span style={{ fontSize: '13px', color: T.faint }}>Не указан</span>
                )}
              </div>
              <div className="prof-row">
                <span className="prof-label">Аккаунт форума</span>
                {data.forum && data.forum !== '—' ? (
                  <a href={data.forum} target="_blank" rel="noopener noreferrer" className="prof-link">Перейти в профиль</a>
                ) : (
                  <span style={{ fontSize: '13px', color: T.faint }}>Не указан</span>
                )}
              </div>

              <div className="prof-row" style={{ marginTop: '8px', paddingTop: '16px', borderTop: `1px dashed ${T.border}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="prof-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: twoFactorEnabled ? T.success : T.muted }}><IconShield /></span>
                    Google Authenticator (2FA)
                  </span>
                  <span style={{ fontSize: '11px', color: T.muted }}>
                    {twoFactorEnabled ? 'Защита аккаунта активна' : 'Дополнительная защита при входе'}
                  </span>
                </div>

                <div>
                  {twoFactorEnabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: T.success, background: T.successSoft, padding: '3px 8px', borderRadius: '6px', border: `1px solid ${T.success}30` }}>
                        Подключено
                      </span>
                      <button
                        className="prof-btn-ghost"
                        onClick={() => setDisable2FaModal(true)}
                        style={{ color: T.danger, borderColor: `${T.danger}40`, padding: '5px 10px', fontSize: '11.5px' }}
                      >
                        Отключить
                      </button>
                    </div>
                  ) : (
                    <button
                      className="prof-btn"
                      onClick={handleStart2FA}
                      style={{ background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}40`, padding: '6px 12px', fontSize: '12px' }}
                    >
                      Подключить
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {pendingReq && (
              <div className="prof-panel" style={{ padding: '18px 20px', borderColor: `${T.warn}35` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: T.warn, display: 'flex' }}><IconHourglass /></span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: T.warn }}>Заявка на рассмотрении</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
                  Запрос на смену никнейма «{pendingReq.currentNickname}» → «{pendingReq.requestedNickname}» передан модераторам и ожидает решения.
                </div>
              </div>
            )}

            <div className="prof-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${T.borderSoft}`, paddingBottom: '12px' }}>
                <span style={{ color: T.muted, display: 'flex' }}><IconClock /></span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: T.muted }}>Лог сессии</span>
                {logs.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}30`, borderRadius: '6px', padding: '1px 6px', fontWeight: 700 }}>
                    {logs.length}
                  </span>
                )}
              </div>

              <div className="log-scroller" style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: T.faint, fontSize: '12px' }}>
                    Действия не зафиксированы
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ paddingBottom: '10px', borderBottom: `1px solid ${T.borderSoft}` }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)', fontWeight: 500, lineHeight: 1.4 }}>{log.text}</div>
                      <div style={{ fontSize: '10px', color: T.faint, marginTop: '2px', fontWeight: 600 }}>
                        {new Date(log.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {show2FaModal && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,11,0.82)', backdropFilter: 'blur(6px)' }} onClick={() => setShow2FaModal(false)} />
            <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '28px', width: '420px', zIndex: 1210, animation: 'prof-fade 0.25s ease-out' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.accent, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                <IconShield />
                <span>Защита аккаунта</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>Привязка Google Authenticator</div>
              <div style={{ fontSize: '12.5px', color: T.muted, marginBottom: '20px', lineHeight: 1.5 }}>
                Отсканируйте QR-код в приложении Google Authenticator на телефоне и введите сгенерированный 6-значный код.
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
                  <QRCodeSVG value={otpAuthUrl} size={160} />
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.borderSoft}`, borderRadius: '8px', padding: '10px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Ключ для ручного ввода</div>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '2px', color: T.accent, fontWeight: 700, userSelect: 'all' }}>
                  {tempSecret}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: T.text, marginBottom: '8px' }}>Проверочный код:</div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000 000"
                  value={totpInput}
                  onChange={e => { setTotpInput(e.target.value.replace(/\D/g, '')); setTotpError('') }}
                  className="prof-input-edit"
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: 800, height: '48px' }}
                  autoFocus
                />
                {totpError && <div style={{ color: T.danger, fontSize: '11.5px', marginTop: '6px', textAlign: 'center' }}>{totpError}</div>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="prof-btn-ghost"
                  onClick={() => setShow2FaModal(false)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Отмена
                </button>
                <button
                  className="prof-btn"
                  onClick={handleVerifyAndEnable2FA}
                  disabled={verifying2Fa || totpInput.length !== 6}
                  style={{ flex: 1.4, padding: '10px', background: T.accent, color: '#0a0e16' }}
                >
                  {verifying2Fa ? 'Проверка...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {disable2FaModal && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setDisable2FaModal(false)} />
            <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '24px', width: '380px', zIndex: 1210 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: T.danger, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Отключение защиты</div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px' }}>Отключить Google Authenticator?</div>
              <div style={{ fontSize: '12.5px', color: T.muted, marginBottom: '20px', lineHeight: 1.5 }}>
                Безопасность вашего аккаунта понизится. При следующем входе вход не будет требовать 6-значный код.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="prof-btn-ghost" onClick={() => setDisable2FaModal(false)} style={{ flex: 1, padding: '10px' }}>
                  Отмена
                </button>
                <button className="prof-btn" onClick={handleConfirmDisable2FA} style={{ flex: 1, padding: '10px', background: T.danger, color: '#fff' }}>
                  Да, отключить
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddSharedModal && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setShowAddSharedModal(false)} />
            <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '24px', width: '400px', zIndex: 1210 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Синхронизация</div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px' }}>Внести вас в реестр пользователей?</div>
              <div style={{ fontSize: '13px', color: T.muted, marginBottom: '20px', lineHeight: 1.5 }}>Ваш профиль будет сохранён в общей локальной таблице пользователей для быстрого доступа.</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="prof-btn" onClick={addSessionToShared} disabled={addingShared} style={{ flex: 1, padding: '10px', background: T.accent, color: '#0a0e16', fontSize: '13px' }}>
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