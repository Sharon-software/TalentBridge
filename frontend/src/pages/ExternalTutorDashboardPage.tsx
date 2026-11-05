import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { api } from '../api'
import type { ExternalTutorSubmissionResponse } from '../api/types'
import { ExternalSubmissionDetailDialog } from '../components/ExternalSubmissionDetailDialog'
import { Badge, EmptyState, Skeleton } from '../components/ui'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function ExternalTutorDashboardPage() {
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<ExternalTutorSubmissionResponse | null>(null)
  const cohortsQuery = useQuery({ queryKey: ['external-tutor-cohorts'], queryFn: api.externalTutor.cohorts })
  const cohorts = cohortsQuery.data ?? []
  const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId) ?? cohorts[0] ?? null
  const submissionsQuery = useQuery({
    queryKey: ['external-tutor-submissions', selectedCohort?.id],
    queryFn: () => api.externalTutor.submissions(selectedCohort!.id),
    enabled: Boolean(selectedCohort),
  })

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[#0f9d8a]">External tutor workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Assigned cohorts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review submissions and leave private feedback for students.</p>
      </header>

      {cohortsQuery.isPending ? <Skeleton rows={5} /> : cohortsQuery.isError ? (
        <ErrorNotice message="Assigned cohorts could not be loaded." onRetry={() => void cohortsQuery.refetch()} />
      ) : cohorts.length === 0 ? (
        <EmptyState title="No cohorts assigned" description="Ask an administrator to assign your account to a cohort." />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside aria-label="Assigned cohorts" className="border-y border-slate-200 dark:border-slate-800">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Cohorts</h2><span className="text-xs tabular-nums text-slate-500">{cohorts.length}</span></div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{cohorts.map((cohort) => <li key={cohort.id}><button type="button" aria-current={cohort.id === selectedCohort?.id ? 'true' : undefined} onClick={() => { setSelectedCohortId(cohort.id); setSelectedSubmission(null) }} className={`w-full px-3 py-3 text-left ${cohort.id === selectedCohort?.id ? 'bg-teal-50/80 dark:bg-teal-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}><span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{cohort.name}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{cohort.studentCount} students · {cohort.assignmentCount} assignments</span></button></li>)}</ul>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedCohort?.name}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submitted student work</p></div><span className="text-xs text-slate-500">Assigned {selectedCohort?.assignedAt ? formatDate(selectedCohort.assignedAt) : ''}</span></div>
            {submissionsQuery.isPending ? <Skeleton rows={5} /> : submissionsQuery.isError ? <ErrorNotice message="Submissions could not be loaded for this cohort." onRetry={() => void submissionsQuery.refetch()} /> : submissionsQuery.data?.length ? (
              <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-800"><table className="w-full min-w-[42rem] border-collapse text-left text-sm"><thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">Assignment</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Score</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{submissionsQuery.data.map((submission) => <tr key={submission.id} className="text-slate-700 dark:text-slate-200"><td className="px-3 py-3"><button type="button" onClick={() => setSelectedSubmission(submission)} className="font-medium text-slate-900 hover:text-[#0f766e] dark:text-slate-100 dark:hover:text-teal-300">{submission.studentFirstName} {submission.studentLastName}</button></td><td className="px-3 py-3">{submission.assignmentTitle}</td><td className="px-3 py-3">{formatDate(submission.submittedAt)}</td><td className="px-3 py-3"><Badge>{submission.analysisStatus ?? submission.status}</Badge></td><td className="px-3 py-3 tabular-nums">{submission.score == null ? '—' : `${Math.round(submission.score)} / 100`}</td></tr>)}</tbody></table></div>
            ) : <EmptyState title="No submissions yet" description="Submissions from students in this cohort will appear here." />}
          </section>
        </div>
      )}

      {selectedSubmission && <ExternalSubmissionDetailDialog submission={selectedSubmission} role="EXTERNAL_TUTOR" onClose={() => setSelectedSubmission(null)} />}
    </div>
  )
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{message}</span><button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button></section>
}