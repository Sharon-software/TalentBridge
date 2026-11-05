import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Download, LoaderCircle, MessageSquareText, X } from 'lucide-react'
import { api } from '../api'
import type { ExternalMentorSubmissionResponse, ExternalTutorSubmissionResponse } from '../api/types'
import { Badge } from './ui'
import { SubmissionReviewPanel } from './SubmissionReviewPanel'

export type ExternalSubmission = ExternalMentorSubmissionResponse | ExternalTutorSubmissionResponse

function formatDate(value: string | null): string {
  if (!value) return 'No date set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function ExternalSubmissionDetailDialog({
  submission,
  role,
  onClose,
  onStartChat,
}: {
  submission: ExternalSubmission
  role: 'EXTERNAL_TUTOR' | 'EXTERNAL_MENTOR'
  onClose: () => void
  onStartChat?: () => void
}) {
  const [fileError, setFileError] = useState('')
  const submissionId = 'submissionId' in submission ? submission.submissionId : submission.id
  const analysisQuery = useQuery({
    queryKey: ['external-submission-analysis', submissionId],
    queryFn: async () => {
      try {
        return await api.submissions.analysis(submissionId)
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
    refetchInterval: (query) => query.state.data?.status === 'COMPLETED' || query.state.data?.status === 'FAILED' ? false : 5000,
  })

  async function downloadFile() {
    setFileError('')
    try {
      const blob = await api.submissions.file(submissionId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = submission.filename || 'submission'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setFileError('The file is no longer available to this account.')
    }
  }

  const mentorSubmission = 'expiresAt' in submission
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="external-submission-title" className="my-2 max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-[#0f766e] dark:text-teal-300">{role === 'EXTERNAL_MENTOR' ? 'Active grant' : 'Assigned cohort'}</p><h2 id="external-submission-title" className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-white">{submission.assignmentTitle}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{submission.studentFirstName} {submission.studentLastName}</p></div>
          <button type="button" onClick={onClose} aria-label="Close submission review" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><Badge>{submission.status}</Badge>{submission.analysisStatus && <Badge>{submission.analysisStatus}</Badge>}{mentorSubmission && <span className="rounded-sm bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Grant expires {formatDate(submission.expiresAt)}</span>}<span className="text-xs text-slate-500">Submitted {formatDate(submission.submittedAt)}</span></div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void downloadFile()} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><Download size={15} /> Download submission</button>
            {onStartChat && <button type="button" onClick={onStartChat} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#14213d] px-3 text-sm font-semibold text-white hover:bg-[#1b2f53]"><MessageSquareText size={15} /> Chat with student</button>}
          </div>
          {fileError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{fileError}</p>}

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI analysis</h3>
            {analysisQuery.isPending ? <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Loading analysis…</div> : analysisQuery.isError ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">The grant may have expired or been revoked. This submission is no longer available.</p> : analysisQuery.data?.status === 'COMPLETED' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">Overall score</p><p className="text-lg font-semibold text-[#0f766e] dark:text-teal-300">{analysisQuery.data.score == null ? '—' : `${Math.round(analysisQuery.data.score)} / 100`}</p></div>
                <div className="grid gap-3 sm:grid-cols-4">{[['Quality', analysisQuery.data.quality], ['Correctness', analysisQuery.data.correctness], ['Originality', analysisQuery.data.originality], ['Communication', analysisQuery.data.communication]].map(([label, score]) => <div key={label} className="rounded-md bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{score ?? '—'}</p></div>)}</div>
                <div className="grid gap-4 md:grid-cols-3">{[
                  { title: 'Strengths', items: analysisQuery.data.strengths },
                  { title: 'Areas to improve', items: analysisQuery.data.weaknesses },
                  { title: 'Suggestions', items: analysisQuery.data.suggestions },
                ].map(({ title, items }) => <div key={title}><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</h4>{items?.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No details provided.</p>}</div>)}</div>
              </div>
            ) : analysisQuery.data?.status === 'FAILED' ? <p className="text-sm text-rose-700 dark:text-rose-300">{analysisQuery.data.errorMessage || 'Analysis failed.'}</p> : <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Analysis is processing; this panel checks again automatically.</p>}
          </section>

          <SubmissionReviewPanel submissionId={submissionId} kind={role === 'EXTERNAL_TUTOR' ? 'feedback' : 'review'} />
        </div>
      </section>
    </div>
  )
}