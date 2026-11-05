import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AlertCircle, CalendarDays, Clock3, RefreshCw, TrendingUp } from 'lucide-react'
import { api } from '../api'
import type {
  AssignmentResponse,
  PunctualityResponse,
  SubmissionAnalysisResponse,
  SubmissionResponse,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Badge, DataTable, EmptyState, ScoreRing, Skeleton, StatCard, type DataColumn } from '../components/ui'

interface StudentDashboardData {
  today: string
  assignments: AssignmentResponse[]
  submissions: SubmissionResponse[]
  punctuality: PunctualityResponse | null
  analyses: Record<string, SubmissionAnalysisResponse>
  profileMissing: boolean
}

interface RecentSubmission {
  id: string
  title: string
  submittedAt: string
  status: SubmissionResponse['status']
  analysisStatus: SubmissionResponse['analysisStatus']
  score: number | null
}

function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

async function loadDashboard(): Promise<StudentDashboardData> {
  const today = new Date().toISOString().slice(0, 10)
  const [assignments, submissionResult, punctualityResult] = await Promise.all([
    api.assignments.list(),
    api.submissions.mine()
      .then((data) => ({ data, profileMissing: false }))
      .catch((error: unknown) => {
        if (isNotFound(error)) return { data: [], profileMissing: true }
        throw error
      }),
    api.submissions.punctuality()
      .then((data) => ({ data, profileMissing: false }))
      .catch((error: unknown) => {
        if (isNotFound(error)) return { data: null, profileMissing: true }
        throw error
      }),
  ])

  const completedSubmissions = submissionResult.data.filter((submission) => submission.analysisStatus === 'COMPLETED')
  const analysisPairs = await Promise.all(completedSubmissions.map(async (submission) => [
    submission.id,
    await api.submissions.analysis(submission.id),
  ] as const))

  return {
    assignments,
    submissions: submissionResult.data,
    punctuality: punctualityResult.data,
    analyses: Object.fromEntries(analysisPairs),
    profileMissing: submissionResult.profileMissing || punctualityResult.profileMissing,
    today,
  }
}

function average(values: Array<number | null | undefined>): number | null {
  const scored = values.filter((value): value is number => value != null)
  return scored.length ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null
}

function completedMonths(startDate: string, today: string): number {
  const [year, month, day] = startDate.split('-').map(Number)
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number)
  let months = (currentYear - year) * 12 + currentMonth - month
  if (currentDay < day) months -= 1
  return Math.max(0, months)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function dueLabel(value: string, today: string): string {
  const days = Math.ceil((Date.parse(value) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  if (days <= 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

export function StudentDashboardPage() {
  const { user } = useAuth()
  const dashboard = useQuery({
    queryKey: ['student-dashboard', user?.id],
    queryFn: loadDashboard,
    enabled: Boolean(user),
  })

  if (dashboard.isPending) {
    return <div className="space-y-5"><Skeleton rows={2} /><Skeleton rows={5} /></div>
  }

  if (dashboard.isError && !dashboard.data) {
    return (
      <div className="space-y-6">
        <PageHeading firstName={user?.firstName ?? ''} />
        <section role="alert" className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-rose-700 dark:text-rose-300" />
            <div>
              <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">Dashboard data could not be loaded</h2>
              <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">Check your connection and try again.</p>
            </div>
          </div>
          <button type="button" onClick={() => void dashboard.refetch()} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-rose-300 px-3 text-sm font-medium text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/40">
            <RefreshCw size={15} /> Retry
          </button>
        </section>
      </div>
    )
  }

  const data = dashboard.data
  const analyses = Object.values(data.analyses)
  const scoreBreakdown = [
    { label: 'Quality', value: average(analyses.map((analysis) => analysis.quality)) },
    { label: 'Correctness', value: average(analyses.map((analysis) => analysis.correctness)) },
    { label: 'Originality', value: average(analyses.map((analysis) => analysis.originality)) },
    { label: 'Communication', value: average(analyses.map((analysis) => analysis.communication)) },
    { label: 'Punctuality', value: data.punctuality?.percentage ?? null },
  ]
  const submittedAssignmentIds = new Set(data.submissions.map((submission) => submission.assignmentId))
  const upcoming = data.assignments
    .filter((assignment) => assignment.dueAt && assignment.dueAt.slice(0, 10) >= data.today && !submittedAssignmentIds.has(assignment.id))
    .sort((left, right) => left.dueAt!.localeCompare(right.dueAt!))
    .slice(0, 4)
  const assignmentById = new Map(data.assignments.map((assignment) => [assignment.id, assignment]))
  const recentRows: RecentSubmission[] = [...data.submissions]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 6)
    .map((submission) => ({
      id: submission.id,
      title: assignmentById.get(submission.assignmentId)?.title ?? 'Assignment',
      submittedAt: submission.submittedAt,
      status: submission.status,
      analysisStatus: submission.analysisStatus,
      score: data.analyses[submission.id]?.score ?? null,
    }))
  const onTimeCount = data.submissions.filter((submission) => submission.status === 'ON_TIME').length
  const lateCount = data.submissions.filter((submission) => submission.status === 'LATE').length
  const totalSubmissions = onTimeCount + lateCount
  const onTimeWidth = totalSubmissions ? (onTimeCount / totalSubmissions) * 100 : 0
  const startDate = user?.startDate ?? null
  const months = startDate ? completedMonths(startDate, data.today) : 0
  const monthProgress = startDate ? (Math.min(months, 6) / 6) * 100 : 0

  const recentColumns: DataColumn<RecentSubmission>[] = [
    { key: 'assignment', header: 'Assignment', render: (row) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.title}</span> },
    { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
    { key: 'status', header: 'Status', render: (row) => <div className="flex flex-wrap gap-1.5"><Badge>{row.status}</Badge><Badge>{row.analysisStatus ?? 'PENDING'}</Badge></div> },
    { key: 'score', header: 'Score', render: (row) => row.score == null ? '—' : `${Math.round(row.score)} / 100` },
  ]

  return (
    <div className="space-y-8">
      <PageHeading firstName={user?.firstName ?? ''} />

      {dashboard.isError && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Some dashboard data could not be refreshed.</span>
          <button type="button" onClick={() => void dashboard.refetch()} className="inline-flex shrink-0 items-center gap-1.5 font-medium underline underline-offset-2"><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      {data.profileMissing && (
        <div role="status" className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          Your student profile is not set up yet. Assignment information is shown where available.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <ScoreRing score={data.punctuality?.overallScore ?? null} size={80} />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall score</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{data.punctuality?.overallScore == null ? '—' : `${Math.round(data.punctuality.overallScore)} / 100`}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Across analyzed submissions</p>
          </div>
        </section>
        <StatCard label="Submissions" value={data.punctuality?.totalSubmissions ?? data.submissions.length} note="Assignments turned in" icon={<CalendarDays size={18} />} />
        <StatCard label="On-time rate" value={data.punctuality ? `${Math.round(data.punctuality.percentage)}%` : '—'} note={`${onTimeCount} on time · ${lateCount} late`} icon={<Clock3 size={18} />} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <SectionHeading title="Scorecard breakdown" description="Average scores from completed submission analyses" />
          {analyses.length ? (
            <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {scoreBreakdown.map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="meter" aria-label={`${label} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? 0}>
                    <div className="h-full rounded-full bg-[#0f9d8a]" style={{ width: `${value ?? 0}%` }} />
                  </div>
                  <span className="text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{value == null ? '—' : Math.round(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4"><EmptyState title="No scorecards yet" description="Your score breakdown will appear after a submission has been analyzed." /></div>
          )}
        </div>

        <div>
          <SectionHeading title="Submission timing" description="On-time compared with late submissions" />
          {totalSubmissions ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div role="img" aria-label={`${onTimeCount} on-time and ${lateCount} late submissions`} className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="bg-[#0f9d8a] transition-[width]" style={{ width: `${onTimeWidth}%` }} />
                <div className="bg-amber-500 transition-[width]" style={{ width: `${100 - onTimeWidth}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500 dark:text-slate-400">On time</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{onTimeCount}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Late</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{lateCount}</p></div>
              </div>
            </div>
          ) : (
            <div className="mt-4"><EmptyState title="No submissions yet" description="Timing data will appear once you submit an assignment." /></div>
          )}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <SectionHeading title="Recent assignments" description="Your latest submissions and results" />
          <div className="mt-4">
            <DataTable columns={recentColumns} rows={recentRows} getRowKey={(row) => row.id} empty={<EmptyState title="No submissions yet" description="Submitted assignments will appear here." />} />
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeading title="Upcoming deadlines" description="Assignments due soon" />
            <div className="mt-4">
              {upcoming.length ? (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {upcoming.map((assignment) => (
                    <li key={assignment.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{assignment.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(assignment.dueAt!)}</p></div>
                      <span className="shrink-0 text-xs font-medium text-[#0f766e] dark:text-teal-300">{dueLabel(assignment.dueAt!, data.today)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No upcoming deadlines" description="New assignments with due dates will show here." />
              )}
            </div>
          </section>

          <section>
            <SectionHeading title="Program progress" description="Six-month learning journey" />
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {startDate == null ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Your program start date has not been set yet.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium text-slate-800 dark:text-slate-100">{Math.min(months, 6)} of 6 months</span><TrendingUp size={17} className="text-[#0f9d8a]" /></div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Six-month program progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={Math.min(months, 6)}>
                    <div className="h-full rounded-full bg-[#0f9d8a] transition-[width]" style={{ width: `${monthProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Started {formatDate(startDate)}</p>
                </>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function PageHeading({ firstName }: { firstName: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#0f9d8a]">Student workspace</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Your learning progress</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back{firstName ? `, ${firstName}` : ''}. Here is your latest activity.</p>
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}