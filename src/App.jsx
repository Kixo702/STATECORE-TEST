import { useState, useEffect } from 'react'
import { ensureUserStoreSeeded, getSession, setSession, clearSession, upsertUser, getUsers } from './lib/userStore'
import { syncLocalUsers } from './lib/api'

import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Organizations from './components/Organizations'
import Blacklist from './components/Blacklist'
import ChsGos from './components/ChsGos'
import Logs from './components/Logs'
import LeaderActivity from './components/LeaderActivity'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import Profile from './components/Profile'
import Users from './components/Users'
import FAQ from './components/faq'

const PAGE_TITLES = {
  dashboard: 'Мониторинг системы',
  organizations: 'Организации',
  blacklist: 'Запреты',
  chsgos: 'ЧС гос',
  logs: 'Логи',
  activity: 'Активность лидеров',
  users: 'Пользователи',
  profile: 'Профиль',
  faq: 'FAQ и помощь',
}

function resolvePageFromPath(pathname) {
  const clean = pathname.replace(/\/+$/, '')
  const base = '/STATECORE-TEST'
  const suffix = clean.startsWith(base) ? clean.slice(base.length) : clean
  const parts = suffix.replace(/^\//, '').split('/').filter(Boolean)
  const page = parts[0] || 'dashboard'
  const pageNumber = parts.length > 1 ? Number(parts[1]) : 1
  return {
    page: page in PAGE_TITLES ? page : 'dashboard',
    pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
  }
}

function setPath(page, pageNumber = 1, mode = 'push') {
  let nextPath = '/STATECORE-TEST'

  if (page !== 'dashboard') {
    nextPath += `/${page}/${pageNumber}`
  }

  if (mode === 'replace') {
    window.history.replaceState({}, document.title, nextPath)
  } else {
    window.history.pushState({}, document.title, nextPath)
  }
}

export default function App() {
  const initialRoute = resolvePageFromPath(window.location.pathname)
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState(initialRoute.page)
  const [pageNumber, setPageNumber] = useState(initialRoute.pageNumber)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    ensureUserStoreSeeded()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      syncLocalUsers(getUsers(), getSession()).catch(() => {})
    } catch {}
  }, [hydrated])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      const genUid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2,8))
      const nextUser = {
        id: genUid(),
        name: 'VK User',
        login: 'vkuser',
        nickname: 'VK User',
        vk: code,
        registeredAt: new Date().toISOString(),
      }

      upsertUser(nextUser)
      setSession(nextUser)
      setUser(nextUser)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      const saved = getSession()
      if (saved) {
        setUser(saved)
        upsertUser(saved)
      }
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    const syncRoute = () => {
      const route = resolvePageFromPath(window.location.pathname)
      setActivePage(route.page)
      setPageNumber(route.pageNumber)
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    if (!user) return
    setPath(activePage, pageNumber)
  }, [activePage, pageNumber, user])

  const handleLogout = () => {
    clearSession()
    setUser(null)
  }

  const handleSetActivePage = (page) => {
    setActivePage(page)
    setPageNumber(1)
  }

  if (!hydrated) return null

  if (!user) {
    return <Landing onLogin={(nextUser) => { setUser(nextUser); setSession(nextUser); setPath('dashboard', 1, 'replace') }} currentUser={null} onLogout={null} />
  }

  return (
    <div className="bg-[#090D16] text-white min-h-screen flex">
      <Sidebar
        activePage={activePage}
        setActivePage={handleSetActivePage}
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
            title={PAGE_TITLES[activePage] || 'Мониторинг системы'}
            user={user}
          />

          {activePage === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
          {activePage === 'organizations' && <Organizations user={user} />}
          {activePage === 'blacklist' && <Blacklist pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'chsgos' && <ChsGos pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'logs' && <Logs pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'activity' && <LeaderActivity user={user} />}
          {activePage === 'users' && <Users currentUser={user} />}
          {activePage === 'profile' && <Profile user={user} />}
          {activePage === 'faq' && <FAQ user={user} />}
        </div>
      </main>
    </div>
  )
}