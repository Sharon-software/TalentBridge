import { Navigate, useParams } from 'react-router-dom'
import { isAppRole, roleForSlug, roleLabels, roleNavigation, roleSlugs } from '../auth/roles'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, StatCard } from '../components/ui'
import { ArrowUpRight, CircleCheck, Clock3, Layers3 } from 'lucide-react'
import { StudentAssignmentsPage } from './StudentAssignmentsPage'
import { StudentCvPage } from './StudentCvPage'
import { StudentDashboardPage } from './StudentDashboardPage'
import { StudentMessagesPage } from './StudentMessagesPage'
import { StudentRecommendationsPage } from './StudentRecommendationsPage'

export function RoleDashboardPage() {
  const { user } = useAuth()
  const { role: roleSlug, section = 'dashboard' } = useParams()

  if (!user || !roleSlug) return <Navigate to="/" replace />
  const routeRole = roleForSlug(roleSlug)
  if (!routeRole || !isAppRole(user.role) || routeRole !== user.role) {
    return <Navigate to={`/${roleSlugs[user.role]}/dashboard`} replace />
  }

  const item = roleNavigation[routeRole].find((entry) => entry.section === section)
  if (!item) return <Navigate to={`/${roleSlugs[user.role]}/dashboard`} replace />
  if (routeRole === 'STUDENT') {
    if (section === 'dashboard') return <StudentDashboardPage />
    if (section === 'assignments' || section === 'submissions') return <StudentAssignmentsPage />
    if (section === 'cv') return <StudentCvPage />
    if (section === 'recommendations') return <StudentRecommendationsPage />
    if (section === 'messages') return <StudentMessagesPage />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#0f9d8a]">{roleLabels[routeRole]} workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{item.label}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome, {user.firstName}. Your workspace is ready.</p>
        </div>
        <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
          {roleLabels[routeRole]}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Workspace" value="Ready" note="Your role-specific space is active" icon={<Layers3 size={18} />} />
        <StatCard label="Account" value="Verified" note={user.email} icon={<CircleCheck size={18} />} />
        <StatCard label="Next step" value="Coming soon" note="Role tools will appear here" icon={<Clock3 size={18} />} />
      </div>

      <EmptyState
        title={`${item.label} workspace`}
        description="This is a placeholder dashboard. Feature pages have not been added yet."
        action={<span className="inline-flex items-center gap-1 text-sm font-medium text-[#0f9d8a]">TalentBridge <ArrowUpRight size={15} /></span>}
      />
    </div>
  )
}