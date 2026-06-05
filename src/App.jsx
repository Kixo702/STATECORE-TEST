import { useState, useEffect } from 'react'

import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Organizations from './components/Organizations'
import Blacklist from './components/Blacklist'
import Logs from './components/Logs'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import Profile from './components/Profile'

export default function App() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)


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

      localStorage.setItem('sc_user', JSON.stringify(user))
      setUser(user)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // При старте — восстанавливаем сессию из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_user')
      if (saved) {
        setUser(JSON.parse(saved))
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

          {activePage === 'profile' && (
            <Profile user={user} />
          )}

        </div>

      </main>

    </div>
  )
}