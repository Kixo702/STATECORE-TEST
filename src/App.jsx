import { useState } from 'react'

import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Organizations from './components/Organizations'
import Blacklist from './components/Blacklist'
import Logs from './components/Logs'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'

export default function App() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Не авторизован — показываем лендинг
  if (!user) {
    return <Landing onLogin={setUser} />
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
      />

      <main className="flex-1 overflow-y-auto md:ml-72">

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
          <Dashboard />
        )}

        {activePage === 'organizations' && (
          <Organizations />
        )}

        {activePage === 'blacklist' && (
          <Blacklist />
        )}

        {activePage === 'logs' && (
          <Logs />
        )}

      </main>

    </div>
  )
}