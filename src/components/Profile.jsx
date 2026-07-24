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

// ── SVG ИКОНКИ (в стиле IC из Dashboard.jsx) ────────────────────
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
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

// Роль → акцентный цвет (rgb-триплет — как `rgb(${accent})` / `rgba(${accent},.12)` в Dashboard.jsx)
function getRoleAccent(roleName = '') {
  if (roleName === 'Главный Разработчик') return '226,99,95'       // danger
  if (roleName === 'Ютубер') return '226,99,95'
  if (roleName.startsWith('ГС') || roleName.startsWith('Главный Следящий')) return '251,146,60' // orange
  if (roleName.startsWith('ЗГС') || roleName.startsWith('Заместитель Главного Следящего')) return '251,146,60'
  if (roleName.startsWith('Следящий')) return '139,147,240'        // indigo
  if (roleName.startsWith('Лидер')) return '63,183,135'            // success
  return '91,141,239'                                               // default blue
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
          two_factor_secret: tempSecret,
          is_totp_enabled: true,
          twoFactorSecret: tempSecret,
          twoFactorEnabled: true
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
      // 1. Поля только для сервера (Patch)
      const patch2FA = {
        id: data.id,
        two_factor_secret: null,
        is_totp_enabled: false,
        twoFactorSecret: null,
        twoFactorEnabled: false
      }

      // 2. Отправляем на бэкенд
      if (typeof updateUserOnServer === 'function') {
        await updateUserOnServer(patch2FA)
      }

      // 3. Полный объект для обновления локального состояния и UI
      const updatedUser = { 
        ...(user || u), 
        ...patch2FA 
      }

      // 4. Синхронизируем локальный стор и контекст
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

  const accent = getRoleAccent(data.role)
  const otpAuthUrl = `otpauth://totp/StateCore:${encodeURIComponent(data.login)}?secret=${tempSecret}&issuer=StateCore`

  return (
    <div className="text-white min-h-screen" style={{ background: 'radial-gradient(circle at 12% 0%, #1a2440 0%, #0a0e18 50%)' }}>
      <style>{`
        @keyframes db-fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes db-spin    { to{transform:rotate(360deg)} }
        .log-scroller::-webkit-scrollbar { width: 4px; }
        .log-scroller::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">

        {/* ── BREADCRUMB / HEADER ───────────────────────────── */}
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[1.5px] uppercase text-white/35 mb-5">
          <span>Личный кабинет</span>
          <span className="opacity-50"><IconChevron /></span>
          <span className="text-white/60">Профиль</span>
        </div>

        <div className="mb-8">
          <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase text-orange-300/80 mb-2">Личный кабинет</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 leading-tight">Профиль</h1>
          <p className="text-slate-400 max-w-lg">Личные данные, аватар и настройки аккаунта</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

          <div className="flex flex-col gap-5">

            {/* ── АВАТАР / НИКНЕЙМ / РОЛЬ ─────────────────── */}
            <div
              className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]"
              style={{ animation: 'db-fadeUp .35s ease both' }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `rgb(${accent})` }} />
              <div className="flex items-center gap-5 pl-6 pr-6 py-6 flex-wrap">

                <div className="group/avatar relative w-20 h-20 shrink-0">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden font-black text-2xl"
                    style={{ background: `rgba(${accent},.12)`, color: `rgb(${accent})`, border: `1px solid rgba(${accent},.35)` }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      data.nickname[0]?.toUpperCase()
                    )}
                  </div>
                  <div
                    className={`absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer text-white transition-opacity duration-150 ${avatarUploading ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'}`}
                    style={{ background: 'rgba(6,9,14,0.72)' }}
                    onClick={avatarUploading ? undefined : handleAvatarPick}
                    title="Изменить аватар"
                  >
                    {avatarUploading ? (
                      <div className="w-4.5 h-4.5" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'db-spin .7s linear infinite' }} />
                    ) : (
                      <IconCamera />
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                <div className="flex-1 min-w-0">
                  {editingNick ? (
                    <div className="max-w-[320px]">
                      <input
                        value={nickValue}
                        onChange={e => { setNickValue(e.target.value); setNickError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveNick(); if (e.key === 'Escape') { setEditingNick(false); setNickValue(data.nickname); setNickError('') } }}
                        autoFocus
                        maxLength={24}
                        className="w-full bg-white/5 text-white border border-orange-500/40 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition-all"
                      />
                      {nickError && <div className="text-red-400 text-[11.5px] mt-1.5">{nickError}</div>}
                      <div className="text-[11px] text-white/40 mt-1.5 leading-relaxed">
                        Никнейм не изменится сразу — заявка уйдёт на рассмотрение модераторам.
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={handleSaveNick}
                          disabled={nickSaving}
                          className="px-4 py-2 rounded-lg text-[12.5px] font-bold bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-default transition-all duration-150"
                        >
                          {nickSaving ? 'Отправка…' : 'Отправить заявку'}
                        </button>
                        <button
                          onClick={() => { setEditingNick(false); setNickValue(data.nickname); setNickError('') }}
                          className="px-4 py-2 rounded-lg text-[12.5px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-150"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-black tracking-tight">{data.nickname}</h2>
                        {!pendingReq && (
                          <button
                            onClick={() => setEditingNick(true)}
                            className="text-white/30 hover:text-white p-1 rounded-md flex transition-colors"
                            title="Изменить никнейм"
                          >
                            <IconEdit />
                          </button>
                        )}
                        {pendingReq && (
                          <StatusPill accent="251,146,60">
                            <IconHourglass /> На рассмотрении: «{pendingReq.requestedNickname}»
                          </StatusPill>
                        )}
                      </div>

                      <div className="mt-2.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-bold"
                          style={{ background: `rgba(${accent},.1)`, color: `rgb(${accent})`, border: `1px solid rgba(${accent},.3)` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${accent})` }} />
                          {data.role}
                        </span>
                      </div>
                    </div>
                  )}
                  {avatarError && <div className="text-red-400 text-[11.5px] mt-2">{avatarError}</div>}
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
                <span className="inline-flex items-center gap-2.5 font-mono" style={{ color: `rgb(${accent})` }}>
                  {playerUid}
                  <button onClick={handleCopy} className="text-white/30 hover:text-white/60 text-[11px] font-bold transition-colors">
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                </span>
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
                    className="text-orange-300/90 hover:text-orange-300 underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    {data.vk.replace('https://vk.com/', '@')}
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
                    className="text-orange-300/90 hover:text-orange-300 underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    Перейти в профиль
                  </a>
                ) : (
                  <span className="text-white/30 font-medium">Не указан</span>
                )}
              </InfoRow>

              <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-dashed border-white/[0.08]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-white/45 inline-flex items-center gap-1.5">
                    <span style={{ color: twoFactorEnabled ? 'rgb(63,183,135)' : 'rgba(255,255,255,.35)' }}><IconShield /></span>
                    Google Authenticator (2FA)
                  </span>
                  <span className="text-[11px] text-white/35">
                    {twoFactorEnabled ? 'Защита аккаунта активна' : 'Дополнительная защита при входе'}
                  </span>
                </div>

                <div>
                  {twoFactorEnabled ? (
                    <div className="flex items-center gap-2.5">
                      <StatusPill accent="63,183,135">Подключено</StatusPill>
                      <button
                        onClick={() => setDisable2FaModal(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-150"
                      >
                        Отключить
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleStart2FA}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500/12 text-orange-300 border border-orange-500/30 hover:bg-orange-500/20 transition-all duration-150"
                    >
                      Подключить
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col gap-5">

            {pendingReq && (
              <div
                className="rounded-xl border px-5 py-4.5 py-4"
                style={{ background: 'rgba(255,255,255,.015)', borderColor: 'rgba(251,146,60,.3)' }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgb(251,146,60)' }}>
                  <IconHourglass />
                  <span className="text-[12.5px] font-bold">Заявка на рассмотрении</span>
                </div>
                <div className="text-[12.5px] text-white/60 leading-relaxed">
                  Запрос на смену никнейма «{pendingReq.currentNickname}» → «{pendingReq.requestedNickname}» передан модераторам и ожидает решения.
                </div>
              </div>
            )}

            <div
              className="rounded-xl border border-white/[0.08] bg-white/[0.015] px-6 py-5 flex flex-col gap-3.5"
              style={{ animation: 'db-fadeUp .35s ease .1s both' }}
            >
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                <span className="text-white/40"><IconClock /></span>
                <span className="text-[12px] font-bold text-white/50">Лог сессии</span>
                {logs.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold rounded-md px-1.5 py-0.5 bg-orange-500/12 text-orange-300 border border-orange-500/30">
                    {logs.length}
                  </span>
                )}
              </div>

              <div className="log-scroller flex flex-col gap-2.5" style={{ maxHeight: 340, overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div className="py-8 text-center text-white/25 text-xs">
                    Действия не зафиксированы
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="pb-2.5 border-b border-white/[0.045] last:border-0">
                      <div className="text-xs text-white/70 font-medium leading-relaxed">{log.text}</div>
                      <div className="text-[10px] text-white/30 mt-0.5 font-semibold">
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
          <div className="fixed inset-0 flex items-center justify-center z-[1200]">
            <div className="absolute inset-0" style={{ background: 'rgba(4,6,11,0.82)', backdropFilter: 'blur(6px)' }} onClick={() => setShow2FaModal(false)} />
            <div
              className="relative z-[1210] w-[420px] max-w-[90vw] rounded-2xl border border-white/10 p-7"
              style={{ background: '#0d1120', animation: 'db-fadeUp .25s ease-out' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-orange-400 text-[11px] font-bold uppercase tracking-[1px] mb-1.5">
                <IconShield />
                <span>Защита аккаунта</span>
              </div>
              <div className="text-lg font-black mb-1.5">Привязка Google Authenticator</div>
              <div className="text-[12.5px] text-slate-400 mb-5 leading-relaxed">
                Отсканируйте QR-код в приложении Google Authenticator на телефоне и введите сгенерированный 6-значный код.
              </div>

              <div className="flex justify-center mb-5">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QRCodeSVG value={otpAuthUrl} size={160} />
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.045] px-2.5 py-2.5 mb-5 text-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <div className="text-[10.5px] text-white/30 uppercase mb-1 font-semibold">Ключ для ручного ввода</div>
                <div className="font-mono text-sm tracking-[2px] font-bold text-orange-300 select-all">
                  {tempSecret}
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-semibold text-slate-200 mb-2">Проверочный код:</div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000 000"
                  value={totpInput}
                  onChange={e => { setTotpInput(e.target.value.replace(/\D/g, '')); setTotpError('') }}
                  className="w-full h-12 text-center bg-white/5 text-white border border-orange-500/40 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg outline-none transition-all"
                  style={{ letterSpacing: '6px', fontSize: 20, fontWeight: 800 }}
                  autoFocus
                />
                {totpError && <div className="text-red-400 text-[11.5px] mt-1.5 text-center">{totpError}</div>}
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShow2FaModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-150"
                >
                  Отмена
                </button>
                <button
                  onClick={handleVerifyAndEnable2FA}
                  disabled={verifying2Fa || totpInput.length !== 6}
                  className="flex-[1.4] py-2.5 rounded-lg text-[12.5px] font-bold bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-default transition-all duration-150"
                >
                  {verifying2Fa ? 'Проверка...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {disable2FaModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[1200]">
            <div className="absolute inset-0" style={{ background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setDisable2FaModal(false)} />
            <div
              className="relative z-[1210] w-[380px] max-w-[90vw] rounded-2xl border border-white/10 p-6"
              style={{ background: '#0d1120' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-[11px] font-bold text-red-400 uppercase tracking-[1px] mb-1.5">Отключение защиты</div>
              <div className="text-base font-black mb-2.5">Отключить Google Authenticator?</div>
              <div className="text-[12.5px] text-slate-400 mb-5 leading-relaxed">
                Безопасность вашего аккаунта понизится. При следующем входе вход не будет требовать 6-значный код.
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setDisable2FaModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-150"
                >
                  Отмена
                </button>
                <button
                  onClick={handleConfirmDisable2FA}
                  className="flex-1 py-2.5 rounded-lg text-[12.5px] font-bold bg-red-500 text-white hover:bg-red-400 transition-all duration-150"
                >
                  Да, отключить
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddSharedModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[1200]">
            <div className="absolute inset-0" style={{ background: 'rgba(4,6,11,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setShowAddSharedModal(false)} />
            <div
              className="relative z-[1210] w-[400px] max-w-[90vw] rounded-2xl border border-white/10 p-6"
              style={{ background: '#0d1120' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-[11px] font-bold text-orange-400 uppercase tracking-[1px] mb-1.5">Синхронизация</div>
              <div className="text-base font-black mb-2.5">Внести вас в реестр пользователей?</div>
              <div className="text-[13px] text-slate-400 mb-5 leading-relaxed">Ваш профиль будет сохранён в общей локальной таблице пользователей для быстрого доступа.</div>
              <div className="flex gap-2.5">
                <button
                  onClick={addSessionToShared}
                  disabled={addingShared}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-bold bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-default transition-all duration-150"
                >
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