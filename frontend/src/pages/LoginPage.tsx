import { useState, type FormEvent } from 'react'
import { ArrowRight, BriefcaseBusiness, LockKeyhole, Mail } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { roleSlugs } from '../auth/roles'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) {
    return <Navigate to={`/${roleSlugs[user.role]}/dashboard`} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const currentUser = await login({ email: email.trim(), password })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from || `/${roleSlugs[currentUser.role]}/dashboard`, { replace: true })
    } catch (requestError) {
      const responseMessage = isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : undefined
      setError(responseMessage || 'We could not sign you in. Check your credentials and try again.')
    } finally {
      setSubmitting(false)
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
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Sign in to continue to your student, mentor, coach, or recruiting workspace.</p>
          </div>
          <p className="relative text-xs text-slate-400">Secure access to your TalentBridge account</p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#14213d] text-white"><BriefcaseBusiness size={20} /></span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">TalentBridge</span>
            </div>
            <p className="text-sm font-semibold text-[#0f9d8a]">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use your TalentBridge account credentials.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
                  <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Enter your password" />
                </span>
              </label>

              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">{error}</p>}

              <button type="submit" disabled={submitting || loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0f9d8a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0b8878] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Signing in…' : 'Sign in'}
                {!submitting && <ArrowRight size={17} />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}