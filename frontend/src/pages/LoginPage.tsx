import { useState, type FormEvent } from 'react'
import { ArrowRight, BriefcaseBusiness, LockKeyhole, Mail } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { roleHomePath, roleLabels, type AppRole } from '../auth/roles'

type LoginRole = Extract<AppRole, 'COACH' | 'MENTOR' | 'STUDENT' | 'EXTERNAL_TUTOR' | 'EXTERNAL_MENTOR' | 'RECRUITER' | 'EMPLOYER' | 'ADMIN'>

const loginRoles: LoginRole[] = ['STUDENT', 'COACH', 'MENTOR', 'EXTERNAL_TUTOR', 'EXTERNAL_MENTOR', 'RECRUITER', 'EMPLOYER', 'ADMIN']
const demoPassword = 'TalentBridgeDemo!2026'
const demoEmails: Record<LoginRole, string> = {
  COACH: 'coach@talentbridge.example',
  MENTOR: 'mentor@talentbridge.example',
  STUDENT: 'student@talentbridge.example',
  EXTERNAL_TUTOR: 'external-tutor@talentbridge.example',
  EXTERNAL_MENTOR: 'external-mentor@talentbridge.example',
  RECRUITER: 'recruiter@talentbridge.example',
  EMPLOYER: 'company@talentbridge.example',
  ADMIN: 'admin@talentbridge.example',
}
const roleDescriptions: Record<LoginRole, string> = {
  COACH: 'Manage cohorts and assignments, and support student progress.',
  MENTOR: 'Review student progress, write recommendations, and manage hire requests.',
  STUDENT: 'Complete assignments, submit work, and manage your CV and recommendations.',
  EXTERNAL_TUTOR: 'Review assigned cohort submissions and leave feedback.',
  EXTERNAL_MENTOR: 'Review work shared with you and communicate with students.',
  RECRUITER: 'Search student talent, manage shortlists, and handle hire requests.',
  EMPLOYER: 'Explore eligible talent, manage shortlists, and track hire requests.',
  ADMIN: 'Manage users, cohorts, and platform activity.',
}

export function LoginPage() {
  const { user, loading, login, register, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isRegistering, setIsRegistering] = useState(false)
  const [role, setRole] = useState<LoginRole>('STUDENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(import.meta.env.DEV ? demoEmails.STUDENT : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? demoPassword : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const currentUser = isRegistering
        ? await register({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() })
        : await login({ email: email.trim(), password })
      if (!isRegistering && currentUser.role !== role) {
        logout()
        setError(`This account is registered as ${roleLabels[currentUser.role]}. Choose that account type and sign in again.`)
        return
      }
      const from = (location.state as { from?: string } | null)?.from
      navigate(from || roleHomePath(currentUser.role), { replace: true })
    } catch (requestError) {
      const responseMessage = isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : undefined
      const connectionMessage = isAxiosError(requestError) && !requestError.response
        ? 'The TalentBridge server is unavailable. Start the backend with the demo profile, then try again.'
        : undefined
      setError(responseMessage || connectionMessage || 'We could not sign you in. Check your credentials and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function selectRole(nextRole: LoginRole) {
    setRole(nextRole)
    if (import.meta.env.DEV) {
      setEmail(demoEmails[nextRole])
      setPassword(demoPassword)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
      <div className="mx-auto grid min-h-[min(48rem,calc(100vh-4rem))] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#14213d] p-10 text-white lg:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-teal-300/20" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f9d8a] text-white"><BriefcaseBusiness size={20} /></span>
            <span className="text-lg font-semibold">TalentBridge</span>
          </div>
          <div className="relative max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">TalentBridge workspace</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">A clearer path from learning to opportunity.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Sign in to continue to your coach, student, external mentor, or recruiter workspace.</p>
          </div>
          <p className="relative text-xs text-slate-400">Secure access to your TalentBridge account</p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#14213d] text-white"><BriefcaseBusiness size={20} /></span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">TalentBridge</span>
            </div>
            <p className="text-sm font-semibold text-[#0f9d8a]">{isRegistering ? 'Join TalentBridge' : 'Welcome back'}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{isRegistering ? 'Create your account' : 'Sign in'}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isRegistering ? 'Create a student account to get started.' : 'Use your TalentBridge account credentials.'}</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {!isRegistering && (
                <div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Sign in as</span>
                      <select value={role} onChange={(event) => selectRole(event.target.value as LoginRole)} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] focus:ring-2 focus:ring-[#0f9d8a]/15 dark:border-slate-700 dark:bg-slate-950">
                        <option value="STUDENT">{roleLabels.STUDENT}</option>
                        <optgroup label="Coach / Mentor">
                          {loginRoles.filter((value) => value === 'COACH' || value === 'MENTOR').map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
                        </optgroup>
                        {loginRoles.filter((value) => value !== 'STUDENT' && value !== 'COACH' && value !== 'MENTOR').map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
                    </select>
                  </label>
                  <p aria-live="polite" className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{roleDescriptions[role]}</p>
                  {import.meta.env.DEV && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Demo login: {demoEmails[role]} / {demoPassword}</p>}
                </div>
              )}
              {isRegistering && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">First name</span>
                    <input autoComplete="given-name" type="text" required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] focus:ring-2 focus:ring-[#0f9d8a]/15 dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Last name</span>
                    <input autoComplete="family-name" type="text" required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] focus:ring-2 focus:ring-[#0f9d8a]/15 dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                </div>
              )}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</span>
                <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#0f9d8a] focus-within:ring-2 focus-within:ring-[#0f9d8a]/15 dark:border-slate-700 dark:bg-slate-950">
                  <Mail size={17} className="text-slate-400" />
                  <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="you@example.com" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
                <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#0f9d8a] focus-within:ring-2 focus-within:ring-[#0f9d8a]/15 dark:border-slate-700 dark:bg-slate-950">
                  <LockKeyhole size={17} className="text-slate-400" />
                  <input autoComplete={isRegistering ? 'new-password' : 'current-password'} type="password" required minLength={isRegistering ? 8 : undefined} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'} />
                </span>
              </label>

              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">{error}</p>}

              <button type="submit" disabled={submitting || loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0f9d8a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0b8878] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? (isRegistering ? 'Creating account…' : 'Signing in…') : (isRegistering ? 'Create account' : 'Sign in')}
                {!submitting && <ArrowRight size={17} />}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {isRegistering ? 'Already have an account?' : 'New to TalentBridge?'}{' '}
              <button type="button" onClick={() => { setIsRegistering((current) => !current); setError(''); if (!isRegistering) { setEmail(''); setPassword('') } else if (import.meta.env.DEV) { setEmail(demoEmails[role]); setPassword(demoPassword) } }} className="font-semibold text-[#0f9d8a] hover:text-[#0b8878]">
                {isRegistering ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}