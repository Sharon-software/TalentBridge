import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Activity, BookOpenCheck, GraduationCap, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { api } from '../api'
import type { AdminCreateUserRequest, AdminPlatformStats, AdminUserResponse, CohortRequest, CohortResponse, UserRole } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { EmptyState, Skeleton, StatCard } from '../components/ui'

const roleChoices: UserRole[] = ['STUDENT', 'COACH', 'MENTOR', 'EXTERNAL_TUTOR', 'EXTERNAL_MENTOR', 'RECRUITER', 'ADMIN', 'EMPLOYER']

const roleLabels: Record<UserRole, string> = {
  STUDENT: 'Student',
  COACH: 'Coach',
  MENTOR: 'Mentor',
  EXTERNAL_TUTOR: 'External Tutor',
  EXTERNAL_MENTOR: 'External Mentor',
  RECRUITER: 'Recruiter',
  ADMIN: 'Administrator',
  EMPLOYER: 'Employer',
}

export function AdminDashboardPage({ section = 'dashboard' }: { section?: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [cohortEditor, setCohortEditor] = useState<CohortResponse | 'new' | null>(null)
  const activeSection = section === 'cohorts' ? 'cohorts' : section === 'settings' ? 'settings' : 'users'

  const statsQuery = useQuery({ queryKey: ['admin-platform-stats'], queryFn: api.admin.stats })
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.users, enabled: activeSection === 'users' || activeSection === 'cohorts' })
  const cohortsQuery = useQuery({ queryKey: ['admin-cohorts'], queryFn: api.admin.cohorts, enabled: activeSection === 'cohorts' })

  const createUser = useMutation({
    mutationFn: (request: AdminCreateUserRequest) => api.admin.createUser(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
      setCreateUserOpen(false)
      notify('User created.', 'success')
    },
    onError: (error) => notify(isAxiosError(error) && error.response?.status === 409 ? 'That email is already registered.' : 'The user could not be created.', 'error'),
  })

  const assignRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => api.admin.assignRole(userId, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
      notify('User role updated.', 'success')
    },
    onError: () => notify('The role could not be updated.', 'error'),
  })

  const pageTitle = activeSection === 'cohorts' ? 'Cohorts' : activeSection === 'settings' ? 'Platform overview' : 'Users'

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-[#0f9d8a]">Administrator workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage access, learning cohorts, and platform activity.</p></div>{activeSection === 'users' && <button type="button" onClick={() => setCreateUserOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878]"><Plus size={16} /> Create user</button>}{activeSection === 'cohorts' && <button type="button" onClick={() => setCohortEditor('new')} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878]"><Plus size={16} /> Create cohort</button>}</header>

      {statsQuery.isPending ? <Skeleton rows={2} /> : statsQuery.isError ? <ErrorNotice message="Platform statistics could not be loaded." onRetry={() => void statsQuery.refetch()} /> : <PlatformOverview stats={statsQuery.data} />}

      {activeSection === 'users' && <UserManagement users={usersQuery.data ?? []} loading={usersQuery.isPending} error={usersQuery.isError} onRetry={() => void usersQuery.refetch()} currentUserId={user?.id} savingUserId={assignRole.variables?.userId ?? null} onRoleChange={(userId, role) => assignRole.mutate({ userId, role })} />}
      {activeSection === 'cohorts' && <CohortManagement cohorts={cohortsQuery.data ?? []} users={usersQuery.data ?? []} usersLoading={usersQuery.isPending} loading={cohortsQuery.isPending} error={cohortsQuery.isError} onRetry={() => void cohortsQuery.refetch()} onEdit={(cohort) => setCohortEditor(cohort)} />}
      {activeSection === 'settings' && <SettingsSummary stats={statsQuery.data} />}

      {createUserOpen && <CreateUserDialog onClose={() => setCreateUserOpen(false)} onCreate={(request) => createUser.mutate(request)} saving={createUser.isPending} />}
      {cohortEditor && <CohortEditor key={cohortEditor === 'new' ? 'new' : cohortEditor.id} cohort={cohortEditor === 'new' ? null : cohortEditor} onClose={() => setCohortEditor(null)} />}
    </div>
  )
}

function PlatformOverview({ stats }: { stats: AdminPlatformStats }) {
  const roleTotal = stats.students + stats.coaches + stats.mentors + stats.recruiters + stats.externalTutors + stats.externalMentors + stats.admins + stats.employers
  return (
    <section aria-label="Platform statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Users" value={stats.totalUsers} note={`${roleTotal} assigned platform roles`} icon={<Users size={18} />} />
      <StatCard label="Cohorts" value={stats.cohorts} note="Learning groups" icon={<GraduationCap size={18} />} />
      <StatCard label="Assignments" value={stats.assignments} note={`${stats.submissions} submissions`} icon={<BookOpenCheck size={18} />} />
      <StatCard label="Completed analyses" value={stats.completedAnalyses} note="AI scorecards ready" icon={<Activity size={18} />} />
    </section>
  )
}

function UserManagement({
  users,
  loading,
  error,
  onRetry,
  currentUserId,
  savingUserId,
  onRoleChange,
}: {
  users: AdminUserResponse[]
  loading: boolean
  error: boolean
  onRetry: () => void
  currentUserId?: string
  savingUserId: string | null
  onRoleChange: (userId: string, role: UserRole) => void
}) {
  if (loading) return <Skeleton rows={5} />
  if (error) return <ErrorNotice message="Users could not be loaded." onRetry={onRetry} />
  if (!users.length) return <EmptyState title="No users found" description="Create the first platform account." />

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900 dark:text-white">User directory</h2><span className="text-xs tabular-nums text-slate-500">{users.length} accounts</span></div>
      <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-800"><table className="w-full min-w-[46rem] border-collapse text-left text-sm"><thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Account ID</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{users.map((account) => <tr key={account.id} className="text-slate-700 dark:text-slate-200"><td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{account.firstName} {account.lastName}{account.id === currentUserId && <span className="ml-2 text-xs font-normal text-slate-500">You</span>}</td><td className="px-3 py-3">{account.email}</td><td className="px-3 py-3"><label className="sr-only" htmlFor={`role-${account.id}`}>Role for {account.firstName} {account.lastName}</label><select id={`role-${account.id}`} value={account.role} disabled={account.id === currentUserId || savingUserId === account.id} onChange={(event) => onRoleChange(account.id, event.target.value as UserRole)} className="h-9 min-w-40 rounded-md border border-slate-300 bg-white px-2.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950">{roleChoices.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>{savingUserId === account.id && <span className="ml-2 text-xs text-slate-500">Saving…</span>}</td><td className="px-3 py-3 font-mono text-xs text-slate-500">{account.id.slice(0, 8)}</td></tr>)}</tbody></table></div>
    </section>
  )
}

function CreateUserDialog({ onClose, onCreate, saving }: { onClose: () => void; onCreate: (request: AdminCreateUserRequest) => void; saving: boolean }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('STUDENT')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCreate({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, role })
  }
  return (
    <Modal title="Create user" onClose={onClose}><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">First name<input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last name<input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email<input required type="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Temporary password<input required type="password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{roleChoices.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></label>
      <ModalActions onClose={onClose} saving={saving} submitLabel="Create user" />
    </form></Modal>
  )
}

function CohortManagement({ cohorts, users, usersLoading, loading, error, onRetry, onEdit }: { cohorts: CohortResponse[]; users: AdminUserResponse[]; usersLoading: boolean; loading: boolean; error: boolean; onRetry: () => void; onEdit: (cohort: CohortResponse) => void }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [manageTutorCohort, setManageTutorCohort] = useState<CohortResponse | null>(null)
  const deleteCohort = useMutation({
    mutationFn: api.admin.deleteCohort,
    onSuccess: async () => {
      setDeleteId(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
      notify('Cohort deleted.', 'success')
    },
    onError: () => notify('This cohort could not be deleted while it is in use.', 'error'),
  })
  if (loading) return <Skeleton rows={4} />
  if (error) return <ErrorNotice message="Cohorts could not be loaded." onRetry={onRetry} />
  return (
    <>
      {cohorts.length ? <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{cohorts.map((cohort) => <article key={cohort.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">{cohort.name}</h2><p className="mt-1 text-xs text-slate-500">{cohort.startDate || 'No start date'} – {cohort.endDate || 'No end date'}</p></div><div className="flex flex-wrap gap-2 self-end sm:self-auto">{deleteId === cohort.id ? <><span className="self-center text-xs text-slate-500">Delete cohort?</span><button type="button" onClick={() => deleteCohort.mutate(cohort.id)} disabled={deleteCohort.isPending} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Confirm</button><button type="button" onClick={() => setDeleteId(null)} className="rounded-md px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button></> : <><button type="button" onClick={() => setManageTutorCohort(cohort)} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">External tutors</button><button type="button" onClick={() => onEdit(cohort)} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Edit</button><button type="button" onClick={() => setDeleteId(cohort.id)} aria-label={`Delete ${cohort.name}`} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button></>}</div></article>)}</div> : <EmptyState title="No cohorts yet" description="Create a cohort to organize student assignments." />}
      {manageTutorCohort && <TutorAssignmentDialog cohort={manageTutorCohort} tutors={users.filter((account) => account.role === 'EXTERNAL_TUTOR')} tutorsLoading={usersLoading} onClose={() => setManageTutorCohort(null)} />}
    </>
  )
}

function TutorAssignmentDialog({ cohort, tutors, tutorsLoading, onClose }: { cohort: CohortResponse; tutors: AdminUserResponse[]; tutorsLoading: boolean; onClose: () => void }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [tutorId, setTutorId] = useState('')
  const assignmentsQuery = useQuery({ queryKey: ['admin-cohort-tutors', cohort.id], queryFn: () => api.admin.externalTutors(cohort.id) })
  const assign = useMutation({
    mutationFn: (selectedTutorId: string) => api.admin.assignExternalTutor(cohort.id, selectedTutorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-cohort-tutors', cohort.id] })
      setTutorId('')
      notify('Tutor assigned to cohort.', 'success')
    },
    onError: () => notify('The tutor could not be assigned.', 'error'),
  })
  const remove = useMutation({
    mutationFn: (selectedTutorId: string) => api.admin.removeExternalTutor(cohort.id, selectedTutorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-cohort-tutors', cohort.id] })
      notify('Tutor removed from cohort.', 'success')
    },
    onError: () => notify('Tutor assignment could not be removed.', 'error'),
  })
  return (
    <Modal title={`External tutors · ${cohort.name}`} onClose={onClose}>
      <div className="space-y-5"><form onSubmit={(event) => { event.preventDefault(); if (tutorId) assign.mutate(tutorId) }} className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">Tutor<select required value={tutorId} onChange={(event) => setTutorId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">{tutorsLoading ? 'Loading users…' : tutors.length ? 'Select tutor' : 'No tutor accounts'}</option>{tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.firstName} {tutor.lastName} · {tutor.email}</option>)}</select></label><button type="submit" disabled={!tutorId || assign.isPending} className="h-10 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white disabled:opacity-50">{assign.isPending ? 'Assigning…' : 'Assign tutor'}</button></form>
        <section><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned tutors</h3>{assignmentsQuery.isPending ? <div className="mt-3"><Skeleton rows={2} /></div> : assignmentsQuery.isError ? <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">Tutor assignments could not be loaded.</p> : assignmentsQuery.data?.length ? <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{assignmentsQuery.data.map((assignment) => <li key={assignment.externalTutorId} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{assignment.firstName} {assignment.lastName}</p><p className="text-xs text-slate-500">{assignment.email}</p></div><button type="button" onClick={() => remove.mutate(assignment.externalTutorId)} disabled={remove.isPending} className="text-xs font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300">Remove</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No tutors assigned to this cohort.</p>}</section>
      </div>
    </Modal>
  )
}

function CohortEditor({ cohort, onClose }: { cohort: CohortResponse | null; onClose: () => void }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState(cohort?.name ?? '')
  const [startDate, setStartDate] = useState(cohort?.startDate ?? '')
  const [endDate, setEndDate] = useState(cohort?.endDate ?? '')
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => {
      const request: CohortRequest = { name: name.trim(), startDate: startDate || null, endDate: endDate || null }
      return cohort ? api.admin.updateCohort(cohort.id, request) : api.admin.createCohort(request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] })
      notify(cohort ? 'Cohort updated.' : 'Cohort created.', 'success')
      onClose()
    },
    onError: (reason) => setError(isAxiosError(reason) && reason.response?.status === 409 ? 'A cohort with this name already exists or is currently in use.' : 'The cohort could not be saved.'),
  })
  return <Modal title={cohort ? 'Edit cohort' : 'Create cohort'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (startDate && endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return }; save.mutate() }} className="space-y-4"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name<input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div>{error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}<ModalActions onClose={onClose} saving={save.isPending} submitLabel={cohort ? 'Save changes' : 'Create cohort'} /></form></Modal>
}

function SettingsSummary({ stats }: { stats?: AdminPlatformStats }) {
  const values = stats ? [['Students', stats.students], ['Coaches', stats.coaches], ['Mentors', stats.mentors], ['Recruiters', stats.recruiters], ['External tutors', stats.externalTutors], ['External mentors', stats.externalMentors], ['Administrators', stats.admins], ['Employers', stats.employers]] as const : []
  return <section className="max-w-3xl"><h2 className="text-base font-semibold text-slate-900 dark:text-white">Role distribution</h2><ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{values.map(([label, count]) => <li key={label} className="flex justify-between gap-4 py-3 text-sm"><span className="text-slate-600 dark:text-slate-300">{label}</span><span className="font-medium tabular-nums text-slate-900 dark:text-white">{count}</span></li>)}</ul></section>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><header className="mb-5 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button></header>{children}</section></div>
}

function ModalActions({ onClose, saving, submitLabel }: { onClose: () => void; saving: boolean; submitLabel: string }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={saving} className="h-9 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50">{saving ? 'Saving…' : submitLabel}</button></div>
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{message}</span><button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button></section>
}

