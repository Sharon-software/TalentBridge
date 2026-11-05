import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import type { ExternalMentorSubmissionResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { ExternalSubmissionDetailDialog } from '../components/ExternalSubmissionDetailDialog'
import { Badge, EmptyState, Skeleton } from '../components/ui'

function formatDate(value: string | null): string {
  if (!value) return 'No expiry'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function ExternalMentorDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [selectedSubmission, setSelectedSubmission] = useState<ExternalMentorSubmissionResponse | null>(null)
  const submissionsQuery = useQuery({
    queryKey: ['external-mentor-active-submissions', user?.id],
    queryFn: api.externalMentor.submissions,
    enabled: Boolean(user),
    refetchInterval: 15000,
  })
  const submissions = submissionsQuery.data ?? []
  const startChat = useMutation({
    mutationFn: (submission: ExternalMentorSubmissionResponse) => api.messages.createThread({
      submissionId: submission.submissionId,
      externalMentorId: user?.id,
    }),
    onSuccess: (thread) => navigate(`/external-mentor/messages?thread=${thread.id}`),
    onError: (error) => {
      const expired = isAxiosError(error) && error.response?.status === 403
      notify(expired ? 'This grant is no longer active. The shared assignment has been removed.' : 'The private conversation could not be opened.', 'error')
      void submissionsQuery.refetch()
    },
  })

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[#0f9d8a]">External mentor workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Shared assignments</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only submissions with an active access grant appear here.</p>
      </header>
      <div role="status" className="flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><span>Revoked or expired shares are removed from this list automatically.</span></div>

      {submissionsQuery.isPending ? <Skeleton rows={5} /> : submissionsQuery.isError ? (
        <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>Shared assignments could not be loaded.</span><button type="button" onClick={() => void submissionsQuery.refetch()} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button></section>
      ) : submissions.length ? (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {submissions.map((submission) => <li key={submission.submissionId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => setSelectedSubmission(submission)} className="min-w-0 text-left"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{submission.assignmentTitle}</span><Badge>{submission.status}</Badge>{submission.analysisStatus && <Badge>{submission.analysisStatus}</Badge>}</span><span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{submission.studentFirstName} {submission.studentLastName}</span><span className="mt-1 block text-xs text-slate-500">Submitted {formatDate(submission.submittedAt)} · Grant expires {formatDate(submission.expiresAt)} · {submission.score == null ? 'No score' : `${Math.round(submission.score)} / 100`}</span></button><div className="flex shrink-0 gap-2 self-end sm:self-auto"><button type="button" onClick={() => setSelectedSubmission(submission)} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Review</button><button type="button" disabled={startChat.isPending} onClick={() => startChat.mutate(submission)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#14213d] px-3 text-sm font-semibold text-white hover:bg-[#1b2f53] disabled:opacity-50"><MessageSquareText size={15} /> Chat</button></div></li>)}
        </ul>
      ) : (
        <EmptyState title="No active shares" description="When a coach or mentor shares a student submission with you, it will appear here until its grant expires or is revoked." />
      )}

      {selectedSubmission && <ExternalSubmissionDetailDialog submission={selectedSubmission} role="EXTERNAL_MENTOR" onClose={() => setSelectedSubmission(null)} onStartChat={() => startChat.mutate(selectedSubmission)} />}
    </div>
  )
}