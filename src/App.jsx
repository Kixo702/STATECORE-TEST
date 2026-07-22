import { StrictMode, useState, useEffect, useCallback, useRef } from 'react'
import { ensureUserStoreSeeded, getSession, setSession, clearSession, upsertUser, getUsers } from './lib/userStore'
import { syncLocalUsers, getUser } from './lib/api'

import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Organizations from './components/Organizations'
import Blacklist from './components/Blacklist'
import ChsGos from './components/ChsGos'
import Logs from './components/Logs'
import LeaderActivity from './components/LeaderActivity'
import LeaderAnalytics from './components/LeaderAnalytics'
import Inactive from './components/Inactive'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MobileHeader from './components/MobileHeader'
import Profile from './components/Profile'
import Users from './components/Users'
import FAQ from './components/faq'
import KnowledgeBase from './components/KnowledgeBase'
import InterviewGenerator from './components/InterviewGenerator'
import EventPlanner from './components/EventPlanner'
import CadreAudit from './components/CadreAudit'
import Maintenance from './components/Maintenance'

const MAINTENANCE_MODE = false
const MAINTENANCE_MESSAGE = null
const MAINTENANCE_ETA = null

const PAGE_TITLES = {
  dashboard: 'Мониторинг системы',
  organizations: 'Организации',
  blacklist: 'Запреты',
  chsgos: 'ЧС гос',
  logs: 'Логи',
  activity: 'Активность лидеров',
  leaderAnalytics: 'Аналитика и рейтинг лидеров',
  inactive: 'Неактивы',
  eventPlanner: 'Планировщик РП',
  users: 'Пользователи',
  cadreAudit: 'Кадровый аудит',
  profile: 'Профиль',
  faq: 'FAQ и помощь',
  knowledge: 'База знаний',
  interview: 'Генератор собеседований',
}

function resolvePageFromPath(pathname) {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    let cleanPath = pathname

    if (searchParams.has('p')) {
      cleanPath = '/' + searchParams.get('p')
    }

    const clean = cleanPath.replace(/\/+$/, '')
    const base = '/STATECORE-TEST'
    const suffix = clean.startsWith(base) ? clean.slice(base.length) : clean
    const parts = suffix.replace(/^\//, '').split('/').filter(Boolean)
    
    const page = parts[0] || 'dashboard'
    const pageNumber = parts.length > 1 ? Number(parts[1]) : 1

    return {
      page: page in PAGE_TITLES ? page : 'dashboard',
      pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    }
  } catch {
    return { page: 'dashboard', pageNumber: 1 }
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
  const [view, setView] = useState('app')
  const [activePage, setActivePage] = useState(initialRoute.page)
  const [pageNumber, setPageNumber] = useState(initialRoute.pageNumber)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Используем Ref для актуального состояния пользователя внутри таймаутов/интервалов без ререндеров
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    ensureUserStoreSeeded()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      syncLocalUsers(getUsers(), getSession()).catch(() => {})
    } catch {}
  }, [hydrated])

  // ===== БЕЗОПАСНАЯ СИНХРОНИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ =====
  const refreshUserData = useCallback(async () => {
    const currentUser = userRef.current
    if (!currentUser?.id) return

    try {
      const serverUser = await getUser(currentUser.id)
      if (!serverUser) return

      const isChanged =
        serverUser.role !== currentUser.role ||
        serverUser.roleName !== currentUser.roleName ||
        serverUser.isBanned !== currentUser.isBanned ||
        serverUser.warnings !== currentUser.warnings

      if (isChanged) {
        const updatedUser = { ...currentUser, ...serverUser }
        setUser(updatedUser)
        setSession(updatedUser)
        upsertUser(updatedUser)
      }
    } catch (err) {
      console.warn('Ошибка синхронизации с бэкендом:', err)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    refreshUserData()

    const interval = setInterval(refreshUserData, 5000)
    const handleFocus = () => refreshUserData()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [user?.id, refreshUserData])

  // ===== ИНИЦИАЛИЗАЦИЯ И ВОССТАНОВЛЕНИЕ СЕССИИ =====
  useEffect(() => {
    try {
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
        if (saved && saved.id) {
          setUser(saved)
          upsertUser(saved)
        }
      }
    } catch (err) {
      console.error('Ошибка гидратации сессии:', err)
    } finally {
      setHydrated(true)
    }
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
    if (!user || view !== 'app') return
    setPath(activePage, pageNumber)
  }, [activePage, pageNumber, user, view])

  const handleLogout = () => {
    clearSession()
    localStorage.removeItem('statecore_token')
    setUser(null)
    setView('app')
  }

  const handleSetActivePage = (page) => {
    setActivePage(page)
    setPageNumber(1)
  }

  if (!hydrated) return null

  if (MAINTENANCE_MODE) {
    return <Maintenance message={MAINTENANCE_MESSAGE} eta={MAINTENANCE_ETA} />
  }

  if (!user) {
    return (
      <Landing
        onLogin={(nextUser) => {
          setUser(nextUser)
          setSession(nextUser)
          setView('app')
          setPath('dashboard', 1, 'replace')
        }}
        currentUser={null}
        onLogout={null}
      />
    )
  }

  if (view === 'landing') {
    return (
      <Landing
        onLogin={(nextUser) => {
          setUser(nextUser)
          setSession(nextUser)
          setView('app')
        }}
        currentUser={user}
        onLogout={handleLogout}
        onOpenApp={() => setView('app')}
      />
    )
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
        onGoHome={() => setView('landing')}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="hidden md:block">
          <Topbar
            activePage={activePage}
            setActivePage={handleSetActivePage}
            user={user}
          />
        </div>

        <div className="max-w-9xl w-full mx-auto px-0">
          <MobileHeader
            onMenu={() => setMobileOpen((v) => !v)}
            title={PAGE_TITLES[activePage] || 'Мониторинг системы'}
            user={user}
            setActivePage={handleSetActivePage}
          />

          {activePage === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
          {activePage === 'organizations' && <Organizations user={user} />}
          {activePage === 'blacklist' && <Blacklist pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'chsgos' && <ChsGos user={user} pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'logs' && <Logs pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {activePage === 'activity' && <LeaderActivity user={user} />}
          {activePage === 'leaderAnalytics' && <LeaderAnalytics />}
          {activePage === 'inactive' && <Inactive user={user} />}
          {activePage === 'eventPlanner' && <EventPlanner user={user} />}
          {activePage === 'interview' && <InterviewGenerator />}
          {activePage === 'users' && <Users currentUser={user} />}
          {activePage === 'profile' && <Profile user={user} onUpdate={setUser} />}
          {activePage === 'knowledge' && <KnowledgeBase />}
          {activePage === 'cadreAudit' && <CadreAudit user={user} />}
          {activePage === 'faq' && <FAQ user={user} />}
        </div>
      </main>
    </div>
  )
}