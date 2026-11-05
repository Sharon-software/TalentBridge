import { useEffect, useState, type ReactNode } from 'react'
import {
  BriefcaseBusiness,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isAppRole, roleLabels, roleNavigation, roleSlugs } from '../auth/roles'

type ColorMode = 'light' | 'dark'

function readColorMode(): ColorMode {
  return localStorage.getItem('talentbridge.colorMode') === 'dark' ? 'dark' : 'light'
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [colorMode, setColorMode] = useState<ColorMode>(readColorMode)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark')
  }, [colorMode])

  if (!user || !isAppRole(user.role)) return <Navigate to="/login" replace />

  function toggleColorMode() {
    const nextMode = colorMode === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', nextMode === 'dark')
    localStorage.setItem('talentbridge.colorMode', nextMode)
    setColorMode(nextMode)
  }

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const navigation = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="grid size-9 place-items-center rounded-lg bg-[#0f9d8a] text-white">
          <BriefcaseBusiness size={19} aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight text-white">TalentBridge</span>
      </div>
      <div className="px-4 pb-2 pt-6">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Workspace</p>
        <nav aria-label="Main navigation" className="mt-3 space-y-1">
          {roleNavigation[user.role].map((item) => {
            const Icon = item.icon
            const destination = `/${roleSlugs[user.role]}/${item.section}`
            return (
              <NavLink
                key={item.section}
                to={destination}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 font-medium text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs text-slate-400">Signed in as</p>
        <p className="mt-1 truncate text-sm font-medium text-white">{roleLabels[user.role]}</p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#14213d] lg:flex">
        {navigation}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-[#14213d] shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
            {navigation}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu size={19} />
            </button>
            <span className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
              {roleLabels[user.role]} workspace
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              onClick={toggleColorMode}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {colorMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
                className="flex max-w-56 items-center gap-2 rounded-md p-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#14213d] text-xs font-semibold text-white">
                  {initials(user.firstName, user.lastName)}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                </span>
                <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
              </button>
              {profileOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800 sm:hidden">
                    <p className="truncate text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <MenuAction icon={<LogOut size={16} />} onClick={signOut}>Sign out</MenuAction>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MenuAction({ children, icon, onClick }: { children: ReactNode; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {icon}
      {children}
    </button>
  )
}