import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownToLine, FileText, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react'
import { api } from '../api'
import type { AssignmentResponse, SubmissionAnalysisResponse } from '../api/types'
import { Badge, EmptyState, Skeleton, StatCard } from '../components/ui'
import { useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthContext'

const allowedExtensions = ['pdf', 'docx', 'txt']
const maxFileSize = 10 * 1024 * 1024

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function deadlineText(dueAt: string | null, now: number): string {
  if (!dueAt) return 'No deadline set'
  const remaining = Date.parse(dueAt) - now
  if (remaining <= 0) return 'Deadline passed'
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  if (days === 0) return `Due in ${hours}h`
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

function isAllowedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return Boolean(extension && allowedExtensions.includes(extension))
}

export function StudentAssignmentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const assignmentsQuery = useQuery({
    queryKey: ['student-assignments'],
    queryFn: api.assignments.list,
  })
  const submissionsQuery = useQuery({
    queryKey: ['student-submissions', user?.id],
    queryFn: api.submissions.mine,
    enabled: Boolean(user),
  })
  const assignments = assignmentsQuery.data ?? []
  const requestedAssignmentId = searchParams.get('assignmentId')
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId)
    ?? assignments.find((assignment) => assignment.id === requestedAssignmentId)
    ?? assignments[0]
    ?? null
  const submissions = submissionsQuery.data ?? []
  const submission = selectedAssignment
    ? submissions.find((item) => item.assignmentId === selectedAssignment.id) ?? null
    : null

  const analysisQuery = useQuery({
    queryKey: ['submission-analysis', submission?.id],
    queryFn: async (): Promise<SubmissionAnalysisResponse | null> => {
      try {
        return await api.submissions.analysis(submission!.id)
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
    enabled: Boolean(submission),
    refetchInterval: (query) => {
      const report = query.state.data
      return report?.status === 'COMPLETED' || report?.status === 'FAILED' ? false : 3000
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.submissions.upload(selectedAssignment!.id, file),
    onSuccess: async (result) => {
      setSelectedFile(null)
      setFileError('')
      if (fileInput.current) fileInput.current.value = ''
      notify('Submission uploaded. Analysis will begin shortly.', 'success')
      await queryClient.invalidateQueries({ queryKey: ['student-submissions', user?.id] })
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard', user?.id] })
      await queryClient.invalidateQueries({ queryKey: ['submission-analysis', result.id] })
    },
    onError: () => notify('The upload failed. Check the file and try again.', 'error'),
  })

  const upcomingAssignments = assignments
    .filter((assignment) => assignment.dueAt && Date.parse(assignment.dueAt) >= now)
    .sort((left, right) => (left.dueAt ?? '').localeCompare(right.dueAt ?? ''))

  function chooseFile(file: File | undefined) {
    if (!file) return
    setFileError('')
    if (!isAllowedFile(file)) {
      setSelectedFile(null)
      setFileError('Choose a PDF, DOCX, or TXT file.')
      return
    }
    if (file.size > maxFileSize) {
      setSelectedFile(null)
      setFileError('Files must be 10 MB or smaller.')
      return
    }
    setSelectedFile(file)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files[0])
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedFile) uploadMutation.mutate(selectedFile)
  }

  if (assignmentsQuery.isPending || submissionsQuery.isPending) {
    return <div className="space-y-5"><Skeleton rows={2} /><Skeleton rows={5} /></div>
  }

  if (assignmentsQuery.isError || submissionsQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeading />
        <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span>Assignments could not be loaded. Please try again.</span>
          <button type="button" onClick={() => { void assignmentsQuery.refetch(); void submissionsQuery.refetch() }} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading />
      {upcomingAssignments.length > 0 && (
        <section aria-label="Upcoming deadlines" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingAssignments.slice(0, 3).map((assignment) => (
            <StatCard key={assignment.id} label={assignment.title} value={deadlineText(assignment.dueAt, now)} note={assignment.dueAt ? formatDate(assignment.dueAt) : undefined} icon={<FileText size={18} />} />
          ))}
        </section>
      )}

      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet" description="Your coach's assignments will appear here." />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)]">
          <section aria-label="Assignment list" className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {assignments.map((assignment) => {
              const submitted = submissions.find((item) => item.assignmentId === assignment.id)
              const isSelected = assignment.id === selectedAssignment?.id
              return (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => { setSelectedAssignmentId(assignment.id); setSearchParams({ assignmentId: assignment.id }, { replace: true }); setSelectedFile(null); setFileError('') }}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`block w-full px-3 py-4 text-left transition-colors ${isSelected ? 'bg-teal-50/80 dark:bg-teal-950/30' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{assignment.title}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : 'No deadline'}</span>
                    </span>
                    {submitted && <Badge>{submitted.status}</Badge>}
                  </span>
                </button>
              )
            })}
          </section>

          {selectedAssignment && (
            <AssignmentDetail
              assignment={selectedAssignment}
              now={now}
              submission={submission}
              report={analysisQuery.data ?? null}
              analysisLoading={analysisQuery.isFetching && !analysisQuery.data}
              analysisError={analysisQuery.isError}
              file={selectedFile}
              fileError={fileError}
              dragging={dragging}
              inputRef={fileInput}
              uploading={uploadMutation.isPending}
              onChooseFile={chooseFile}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onSubmit={handleSubmit}
              onRemoveFile={() => { setSelectedFile(null); setFileError(''); if (fileInput.current) fileInput.current.value = '' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function PageHeading() {
  return (
    <div>
      <p className="text-sm font-medium text-[#0f9d8a]">Student workspace</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Assignments</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review your work, submit files, and track feedback.</p>
    </div>
  )
}

function AssignmentDetail({
  assignment,
  now,
  submission,
  report,
  analysisLoading,
  analysisError,
  file,
  fileError,
  dragging,
  inputRef,
  uploading,
  onChooseFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onSubmit,
  onRemoveFile,
}: {
  assignment: AssignmentResponse
  now: number
  submission: { id: string; filename: string | null; submittedAt: string; status: string } | null
  report: SubmissionAnalysisResponse | null
  analysisLoading: boolean
  analysisError: boolean
  file: File | null
  fileError: string
  dragging: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  onChooseFile: (file: File | undefined) => void
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRemoveFile: () => void
}) {
  return (
    <article className="min-w-0 space-y-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <header className="border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-[#0f766e] dark:text-teal-300">Assignment</p><h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{assignment.title}</h2></div>
          {submission && <Badge>{submission.status}</Badge>}
        </div>
        {assignment.dueAt && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Due {formatDate(assignment.dueAt)} <span className="font-medium text-[#0f766e] dark:text-teal-300">· {deadlineText(assignment.dueAt, now)}</span></p>}
        {assignment.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{assignment.description}</p>}
      </header>

      {submission ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your submission</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{submission.filename ?? 'Uploaded file'} · Submitted {formatDate(submission.submittedAt)}</p></div>
            {report && <Badge>{report.status}</Badge>}
          </div>
          {analysisLoading && <div role="status" className="flex items-center gap-3 rounded-md bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><LoaderCircle size={17} className="animate-spin text-[#0f9d8a]" /> AI analysis is processing. This view will update automatically.</div>}
          {analysisError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">Analysis status is temporarily unavailable. It will keep checking.</p>}
          {report?.status === 'FAILED' && <p role="alert" className="rounded-md bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{report.errorMessage || 'Analysis could not be completed.'}</p>}
          {report?.status === 'COMPLETED' && <AnalysisReport report={report} />}
          {!report && !analysisLoading && !analysisError && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Waiting for analysis to start…</p>}
        </section>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Submit your work</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF, DOCX, or TXT · Up to 10 MB</p>
          </div>
          <label
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-5 py-7 text-center transition-colors ${dragging ? 'border-[#0f9d8a] bg-teal-50 dark:bg-teal-950/30' : 'border-slate-300 hover:border-teal-600 dark:border-slate-700'}`}
          >
            <Upload size={23} className="text-[#0f9d8a]" />
            <span className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">Drop a file here or browse</span>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, TXT</span>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" className="sr-only" onChange={(event) => onChooseFile(event.currentTarget.files?.[0])} />
          </label>
          {fileError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{fileError}</p>}
          {file && <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5 dark:bg-slate-800"><FileText size={17} className="shrink-0 text-[#0f9d8a]" /><span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{file.name}</span><button type="button" onClick={onRemoveFile} aria-label="Remove selected file" className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><X size={15} /></button></div>}
          <button type="submit" disabled={!file || uploading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f9d8a] px-4 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:cursor-not-allowed disabled:opacity-50">
            {uploading ? <><LoaderCircle size={16} className="animate-spin" /> Uploading</> : <><ArrowDownToLine size={16} /> Submit assignment</>}
          </button>
        </form>
      )}
    </article>
  )
}

function AnalysisReport({ report }: { report: SubmissionAnalysisResponse }) {
  const dimensions = [
    ['Quality', report.quality],
    ['Correctness', report.correctness],
    ['Originality', report.originality],
    ['Communication', report.communication],
  ] as const

  return (
    <section aria-label="AI analysis report" className="space-y-5 border-t border-slate-100 pt-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI analysis report</h3><span className="text-lg font-semibold text-[#0f766e] dark:text-teal-300">{report.score == null ? '—' : `${Math.round(report.score)} / 100`}</span></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {dimensions.map(([label, value]) => <StatCard key={label} label={label} value={value == null ? '—' : `${value} / 100`} />)}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <ReportList title="Strengths" items={report.strengths} />
        <ReportList title="Areas to improve" items={report.weaknesses} />
        <ReportList title="Suggestions" items={report.suggestions} />
      </div>
    </section>
  )
}

function ReportList({ title, items }: { title: string; items: string[] | null }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
      {items?.length ? <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No details provided.</p>}
    </div>
  )
}