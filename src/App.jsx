import { useState, useEffect } from 'react'
import seedUsers from './data/sc_users.json'

import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Organizations from './components/Organizations'
import Blacklist from './components/Blacklist'
import Logs from './components/Logs'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import Profile from './components/Profile'
import Users from './components/Users'

// Добавляет/обновляет пользователя в общей таблице sc_users (источник для Users.jsx, Profile.jsx и т.д.)
function upsertIntoUsersTable(u) {
  if (!u?.id) return
  try {
    const raw = localStorage.getItem('sc_users')
    let users = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : []
    if (!Array.isArray(users)) users = []

    const idx = users.findIndex(x => x.id === u.id)
    if (idx !== -1) {
      // Обновляем существующую запись, не затирая роль и другие поля, изменённые отдельно (Profile/Users)
      users[idx] = { ...users[idx], ...u, roleName: users[idx].roleName || u.roleName }
    } else {
      users.push({
        id: u.id,
        login: u.login || u.name || u.id,
        nickname: u.nickname || u.name || u.login || u.id,
        vk: u.vk || '',
        forum: u.forum || '',
        registeredAt: u.registeredAt || new Date().toISOString(),
        roleName: u.roleName || 'Игрок',
      })
    }
    localStorage.setItem('sc_users', JSON.stringify(users))
  } catch (e) {
    console.error('upsertIntoUsersTable failed', e)
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Сеем таблицу пользователей демо-данными, если она ещё пустая
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sc_users')
      const existing = (raw && raw !== 'undefined' && raw !== 'null') ? JSON.parse(raw) : []
      if (!Array.isArray(existing) || existing.length === 0) {
        localStorage.setItem('sc_users', JSON.stringify(seedUsers))
      }
    } catch (e) {
      localStorage.setItem('sc_users', JSON.stringify(seedUsers))
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const code = params.get('code')

    if (code) {
      const genUid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2,8))
      const user = {
        id: genUid(),
        name: 'VK User',
        vkCode: code,
        registeredAt: new Date().toISOString(),
      }

      try { localStorage.setItem('sc_user', JSON.stringify(user)) } catch(e) { console.error('set sc_user failed', e) }
      upsertIntoUsersTable(user)
      setUser(user)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // При старте — восстанавливаем сессию из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_user')
      if (saved) {
        const parsed = JSON.parse(saved)
        setUser(parsed)
        upsertIntoUsersTable(parsed) // подстраховка: чтобы старые сессии тоже попали в общий список
      }
    } catch {
      localStorage.removeItem('sc_user')
    }
    setHydrated(true)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sc_user')
    setUser(null)
  }

  // Пока не прочитали localStorage — ничего не рендерим (нет мигания лендинга)
  if (!hydrated) return null

  // Не авторизован — показываем лендинг
  if (!user) {
    return <Landing onLogin={setUser} currentUser={null} onLogout={null} />
  }

  // Авторизован — обычный лейаут
  return (
    <div className="bg-[#090D16] text-white min-h-screen flex">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        setUser={setUser}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto">

        <div className="max-w-9xl w-full mx-auto px-0">

          <MobileHeader
            onMenu={() => setMobileOpen((v) => !v)}
            title={
              activePage === 'dashboard'
                ? 'Мониторинг системы'
                : activePage === 'organizations'
                ? 'Организации'
                : activePage === 'blacklist'
                ? 'Запреты'
                : 'Логи'
            }
            user={user}
          />

          {activePage === 'dashboard' && (
            <Dashboard user={user} onLogout={handleLogout} />
          )}

          {activePage === 'organizations' && (
            <Organizations user={user} />
          )}

          {activePage === 'blacklist' && (
            <Blacklist />
          )}

          {activePage === 'logs' && (
            <Logs />
          )}

          {activePage === 'users' && (
            <Users currentUser={user} />
          )}

          {activePage === 'profile' && (
            <Profile user={user} />
          )}

        </div>

      </main>

    </div>
  )
}