import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Award, BriefcaseBusiness, Check, Clock3, FileText, Plus, RefreshCw, Share2, X } from 'lucide-react'
import { api } from '../api'
import type {
  AssignmentResponse,
  GrantResponse,
  HireRequestResponse,
  RecommendationLetterResponse,
  WorkspaceCohortResponse,
  WorkspaceScoreCardDetail,
  WorkspaceStudentDetail,
  WorkspaceStudentSummary,
  WorkspaceSubmissionDetail,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Badge, DataTable, EmptyState, ScoreRing, Skeleton, StatCard, type DataColumn } from '../components/ui'
import { useToast } from '../components/Toast'

type SortDirection = 'asc' | 'desc'

function formatDate(value: string | null): string {
  if (!value) return 'No date set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export function CoachMentorWorkspacePage({ section = 'dashboard' }: { section?: string }) {
  const { user } = useAuth()
  const isCoach = user?.role === 'COACH'
  const isMentor = user?.role === 'MENTOR'
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<WorkspaceStudentSummary | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const cohortsQuery = useQuery({ queryKey: ['workspace-cohorts'], queryFn: api.workspace.cohorts })
  const cohorts = cohortsQuery.data ?? []
  const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId) ?? cohorts[0] ?? null
  const rosterQuery = useQuery({
    queryKey: ['workspace-students', selectedCohort?.id],
    queryFn: () => api.workspace.students(selectedCohort!.id),
    enabled: Boolean(selectedCohort),
  })
  const authoredQuery = useQuery({
    queryKey: ['authored-recommendation-letters', user?.id],
    queryFn: api.recommendationLetters.authored,
    enabled: Boolean(user && (isCoach || isMentor)),
  })
  const hireRequestsQuery = useQuery({
    queryKey: ['mentor-hire-requests', user?.id],
    queryFn: api.hireRequests.list,
    enabled: Boolean(user && isMentor && section === 'hire-requests'),
  })

  const sortedStudents = [...(rosterQuery.data ?? [])].sort((left, right) => {
    if (left.overallScore == null && right.overallScore == null) return left.lastName.localeCompare(right.lastName)
    if (left.overallScore == null) return 1
    if (right.overallScore == null) return -1
    return sortDirection === 'desc'
      ? right.overallScore - left.overallScore
      : left.overallScore - right.overallScore
  })

  const assignmentQuery = useQuery({
    queryKey: ['coach-assignments'],
    queryFn: api.assignments.list,
    enabled: Boolean(isCoach && section === 'assignments'),
  })

  function changeCohort(cohortId: string) {
    setSelectedCohortId(cohortId)
    setSelectedStudent(null)
  }

  return (
    <div className="space-y-6">
      <PageHeading role={isCoach ? 'COACH' : 'MENTOR'} section={section} />

      {section === 'assignments' && isCoach && (
        <AssignmentManager cohorts={cohorts} assignments={assignmentQuery.data ?? []} loading={assignmentQuery.isPending} error={assignmentQuery.isError} />
      )}

      {section === 'recommendations' && (
        <AuthoredLetterList letters={authoredQuery.data ?? []} loading={authoredQuery.isPending} error={authoredQuery.isError} onRetry={() => void authoredQuery.refetch()} />
      )}

      {section === 'hire-requests' && isMentor && (
        <HireRequestList requests={hireRequestsQuery.data ?? []} loading={hireRequestsQuery.isPending} error={hireRequestsQuery.isError} onRetry={() => void hireRequestsQuery.refetch()} />
      )}

      {cohortsQuery.isPending ? <Skeleton rows={5} /> : cohortsQuery.isError ? (
        <ErrorNotice message="Cohorts could not be loaded." onRetry={() => void cohortsQuery.refetch()} />
      ) : cohorts.length === 0 ? (
        <EmptyState title="No cohorts available" description="Cohorts will appear here once they have been set up by an administrator." />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside aria-label="Cohorts" className="border-y border-slate-200 dark:border-slate-800">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Cohorts</h2><span className="text-xs tabular-nums text-slate-500">{cohorts.length}</span></div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {cohorts.map((cohort) => <CohortButton key={cohort.id} cohort={cohort} selected={cohort.id === selectedCohort?.id} onClick={() => changeCohort(cohort.id)} />)}
            </ul>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedCohort?.name}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Students ranked by overall score</p></div>
              <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{selectedCohort?.studentCount ?? 0} students</span><span aria-hidden="true">·</span><span>{selectedCohort?.assignmentCount ?? 0} assignments</span></div>
            </div>
            {rosterQuery.isPending ? <Skeleton rows={5} /> : rosterQuery.isError ? (
              <ErrorNotice message="The student roster could not be loaded." onRetry={() => void rosterQuery.refetch()} />
            ) : sortedStudents.length === 0 ? (
              <EmptyState title="No students in this cohort" description="Student profiles assigned to this cohort will appear here." />
            ) : (
              <StudentTable students={sortedStudents} sortDirection={sortDirection} onSort={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')} onSelect={setSelectedStudent} />
            )}
          </section>
        </div>
      )}

      {selectedStudent && (
        <StudentDetailDialog
          key={selectedStudent.studentProfileId}
          student={selectedStudent}
          isCoach={Boolean(isCoach)}
          isMentor={Boolean(isMentor)}
          authoredLetters={authoredQuery.data ?? []}
          authoredLoading={authoredQuery.isPending}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}

function PageHeading({ role, section }: { role: 'COACH' | 'MENTOR'; section: string }) {
  const title = section === 'assignments'
    ? 'Assignments'
    : section === 'recommendations'
      ? 'Recommendations'
      : section === 'external-access'
        ? 'External access'
        : section === 'talent'
          ? 'Your cohort'
      : section === 'hire-requests'
        ? 'Hire requests'
        : role === 'COACH' ? 'Coach workspace' : 'Mentor workspace'
  const description = section === 'external-access'
    ? 'Select a student to manage access to their shared submissions.'
    : 'Cohort progress, student outcomes, and follow-up actions.'
  return (
    <div>
      <p className="text-sm font-medium text-[#0f9d8a]">{role === 'COACH' ? 'Coach' : 'Mentor'} workspace</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  )
}

function CohortButton({ cohort, selected, onClick }: { cohort: WorkspaceCohortResponse; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined} className={`w-full px-3 py-3 text-left transition-colors ${selected ? 'bg-teal-50/80 dark:bg-teal-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{cohort.name}</span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{cohort.studentCount} students · {cohort.assignmentCount} assignments</span>
      </button>
    </li>
  )
}

function StudentTable({
  students,
  sortDirection,
  onSort,
  onSelect,
}: {
  students: WorkspaceStudentSummary[]
  sortDirection: SortDirection
  onSort: () => void
  onSelect: (student: WorkspaceStudentSummary) => void
}) {
  const SortIcon = sortDirection === 'desc' ? ArrowDown : ArrowUp
  return (
    <div className="overflow-x-auto border-y border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
        <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-3 py-3">Student</th>
            <th className="px-3 py-3"><button type="button" onClick={onSort} className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white">Overall score <SortIcon size={14} /></button></th>
            <th className="px-3 py-3">Submissions</th>
            <th className="px-3 py-3">On-time</th>
            <th className="px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {students.map((student) => (
            <tr key={student.studentProfileId} className="text-slate-700 dark:text-slate-200">
              <td className="px-3 py-3"><button type="button" onClick={() => onSelect(student)} className="text-left font-medium text-slate-900 hover:text-[#0f766e] dark:text-slate-100 dark:hover:text-teal-300">{student.firstName} {student.lastName}</button><span className="mt-0.5 block text-xs text-slate-500">Started {formatDate(student.startDate)}</span></td>
              <td className="px-3 py-3 tabular-nums">{student.overallScore == null ? '—' : `${Math.round(student.overallScore)} / 100`}</td>
              <td className="px-3 py-3 tabular-nums">{student.totalSubmissions}</td>
              <td className="px-3 py-3 tabular-nums">{Math.round(student.onTimePercentage)}%</td>
              <td className="px-3 py-3">{student.fallingBehind ? <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"><Clock3 size={13} /> Falling behind</span> : <span className="text-xs text-slate-500 dark:text-slate-400">On track</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssignmentManager({ cohorts, assignments, loading, error }: { cohorts: WorkspaceCohortResponse[]; assignments: AssignmentResponse[]; loading: boolean; error: boolean }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [cohortId, setCohortId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [formError, setFormError] = useState('')
  const selectedCohortId = cohortId || cohorts[0]?.id || ''
  const filteredAssignments = assignments.filter((assignment) => assignment.cohortId === selectedCohortId)

  const createMutation = useMutation({
    mutationFn: () => api.assignments.create({ cohortId: selectedCohortId, title: title.trim(), description: description.trim() || null, dueAt: new Date(dueAt).toISOString() }),
    onSuccess: async () => {
      setTitle('')
      setDescription('')
      setDueAt('')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['coach-assignments'] })
      await queryClient.invalidateQueries({ queryKey: ['workspace-cohorts'] })
      notify('Assignment created.', 'success')
    },
    onError: () => setFormError('The assignment could not be created. Check the required fields and try again.'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCohortId || !title.trim() || !dueAt) {
      setFormError('Choose a cohort, enter a title, and set a due date.')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2"><Plus size={17} className="text-[#0f9d8a]" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Create assignment</h2></div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cohort<select required value={selectedCohortId} onChange={(event) => setCohortId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date and time<input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>
        {formError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{formError}</p>}
        <button type="submit" disabled={createMutation.isPending || cohorts.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0f9d8a] px-4 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50">{createMutation.isPending ? 'Creating…' : 'Create assignment'}</button>
      </form>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900 dark:text-white">Assignments</h2><span className="text-xs text-slate-500">{selectedCohortId ? cohorts.find((cohort) => cohort.id === selectedCohortId)?.name : 'Select a cohort'}</span></div>
        {loading ? <Skeleton rows={4} /> : error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">Assignments could not be loaded.</p> : filteredAssignments.length ? (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {filteredAssignments.map((assignment) => <li key={assignment.id} className="flex items-start justify-between gap-4 py-4"><div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{assignment.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{assignment.description || 'No description'}</p></div><span className="shrink-0 text-xs text-slate-500">{formatDate(assignment.dueAt)}</span></li>)}
          </ul>
        ) : <EmptyState title="No assignments in this cohort" description="Create the first assignment using the form." />}
      </section>
    </div>
  )
}

function StudentDetailDialog({
  student,
  isCoach,
  isMentor,
  authoredLetters,
  authoredLoading,
  onClose,
}: {
  student: WorkspaceStudentSummary
  isCoach: boolean
  isMentor: boolean
  authoredLetters: RecommendationLetterResponse[]
  authoredLoading: boolean
  onClose: () => void
}) {
  const [grantSubmission, setGrantSubmission] = useState<WorkspaceSubmissionDetail | null>(null)
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const [hireOpen, setHireOpen] = useState(false)
  const detailQuery = useQuery({
    queryKey: ['workspace-student-detail', student.studentProfileId],
    queryFn: () => api.workspace.student(student.studentProfileId),
  })
  const existingDraft = authoredLetters.find((letter) => letter.studentProfileId === student.studentProfileId && letter.status === 'DRAFT') ?? null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="student-detail-title" className="mx-auto my-2 max-h-[calc(100vh-1rem)] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div><p className="text-xs font-medium uppercase tracking-wide text-[#0f766e] dark:text-teal-300">Student detail</p><h2 id="student-detail-title" className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close student detail" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {detailQuery.isPending ? <Skeleton rows={5} /> : detailQuery.isError || !detailQuery.data ? <ErrorNotice message="Student detail could not be loaded." onRetry={() => void detailQuery.refetch()} /> : (
            <>
              <StudentDetailContent detail={detailQuery.data} />
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" disabled={authoredLoading} onClick={() => setRecommendationOpen((open) => !open)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><Award size={16} /> Recommend</button>
                {isMentor && <button type="button" onClick={() => setHireOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878]"><BriefcaseBusiness size={16} /> Hire</button>}
              </div>

              {recommendationOpen && <RecommendationEditor key={`${student.studentProfileId}-${existingDraft?.id ?? 'new'}`} studentProfileId={student.studentProfileId} draft={existingDraft} onClose={() => setRecommendationOpen(false)} />}
              {(isCoach || isMentor) && <div className="space-y-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">External mentor access</h3>{detailQuery.data.submissions.length ? detailQuery.data.submissions.map((submission) => <button key={submission.id} type="button" onClick={() => setGrantSubmission(submission)} className="flex w-full items-center justify-between gap-3 border-y border-slate-200 py-3 text-left text-sm hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900"><span className="truncate font-medium text-slate-800 dark:text-slate-100">{submission.assignmentTitle}</span><span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#0f766e] dark:text-teal-300"><Share2 size={14} /> Share with external mentor</span></button>) : <EmptyState title="No submissions to share" description="Grant access after the student submits an assignment." />}</div>}
            </>
          )}
        </div>
      </section>

      {grantSubmission && <GrantManager submission={grantSubmission} onClose={() => setGrantSubmission(null)} />}
      {hireOpen && <HireRequestDialog student={student} onClose={() => setHireOpen(false)} />}
    </div>
  )
}

function StudentDetailContent({ detail }: { detail: WorkspaceStudentDetail }) {
  const scoreColumns: DataColumn<WorkspaceScoreCardDetail>[] = [
    { key: 'assignment', header: 'Scorecard', render: (row) => row.score == null ? '—' : `${Math.round(row.score)} / 100` },
    { key: 'quality', header: 'Quality', render: (row) => row.quality ?? '—' },
    { key: 'correctness', header: 'Correctness', render: (row) => row.correctness ?? '—' },
    { key: 'originality', header: 'Originality', render: (row) => row.originality ?? '—' },
    { key: 'communication', header: 'Communication', render: (row) => row.communication ?? '—' },
  ]
  const submissionColumns: DataColumn<WorkspaceSubmissionDetail>[] = [
    { key: 'assignment', header: 'Assignment', render: (row) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.assignmentTitle}</span> },
    { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
    { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
    { key: 'analysis', header: 'Analysis', render: (row) => <Badge>{row.analysisStatus ?? 'PENDING'}</Badge> },
    { key: 'score', header: 'Score', render: (row) => row.score == null ? '—' : Math.round(row.score) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <section className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><ScoreRing score={detail.student.overallScore} /><div><p className="text-xs text-slate-500">Overall score</p><p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{detail.student.overallScore == null ? '—' : `${Math.round(detail.student.overallScore)} / 100`}</p></div></section>
        <StatCard label="Punctuality" value={`${Math.round(detail.punctuality.percentage)}%`} note={`${detail.punctuality.onTimeSubmissions} of ${detail.punctuality.totalSubmissions} on time`} icon={<Clock3 size={17} />} />
        <StatCard label="Submissions" value={detail.punctuality.totalSubmissions} note={detail.student.fallingBehind ? 'Overdue work not submitted' : 'No overdue work'} icon={<FileText size={17} />} />
      </div>
      {detail.student.fallingBehind && <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">This student has at least one overdue cohort assignment without a submission.</p>}
      <section><h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Scorecard breakdown</h3><DataTable columns={scoreColumns} rows={detail.scoreCards} getRowKey={(row) => row.submissionId} empty={<EmptyState title="No scorecards yet" description="Completed analysis results will appear here." />} /></section>
      <section><h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Submissions</h3><DataTable columns={submissionColumns} rows={detail.submissions} getRowKey={(row) => row.id} empty={<EmptyState title="No submissions yet" description="Student submissions will appear here." />} /></section>
    </div>
  )
}

function GrantManager({ submission, onClose }: { submission: WorkspaceSubmissionDetail; onClose: () => void }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [mentorId, setMentorId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const mentorsQuery = useQuery({ queryKey: ['external-mentors'], queryFn: api.workspace.externalMentors })
  const grantsQuery = useQuery({ queryKey: ['active-grants', submission.id], queryFn: () => api.externalAccess.active(submission.id) })
  const createGrant = useMutation({
    mutationFn: () => api.externalAccess.grant(submission.id, { externalMentorId: mentorId || mentorsQuery.data?.[0]?.id || '', expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['active-grants', submission.id] })
      setMentorId('')
      setExpiresAt('')
      notify('External mentor access granted.', 'success')
    },
    onError: () => notify('Access could not be granted. Check the mentor and expiry date.', 'error'),
  })
  const revokeGrant = useMutation({
    mutationFn: (grantId: string) => api.externalAccess.revoke(submission.id, grantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['active-grants', submission.id] })
      notify('External mentor access revoked.', 'success')
    },
    onError: () => notify('The access grant could not be revoked.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="grant-dialog-title" className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4"><div><h2 id="grant-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">Share with external mentor</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{submission.assignmentTitle}</p></div><button type="button" onClick={onClose} aria-label="Close grant dialog" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button></header>
        <form onSubmit={(event) => { event.preventDefault(); if (mentorId || mentorsQuery.data?.length) createGrant.mutate() }} className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">External mentor<select required value={mentorId || mentorsQuery.data?.[0]?.id || ''} onChange={(event) => setMentorId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">{mentorsQuery.isPending ? 'Loading mentors…' : 'Select mentor'}</option>{mentorsQuery.data?.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.firstName} {mentor.lastName}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expires (optional)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
          <button type="submit" disabled={createGrant.isPending || mentorsQuery.isPending || !mentorsQuery.data?.length} className="h-10 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50">{createGrant.isPending ? 'Sharing…' : 'Share'}</button>
        </form>
        {mentorsQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">External mentors could not be loaded.</p>}
        <section className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active grants</h3>
          {grantsQuery.isPending ? <div className="mt-3"><Skeleton rows={2} /></div> : grantsQuery.isError ? <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">Grant list could not be loaded.</p> : grantsQuery.data?.length ? (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{grantsQuery.data.map((grant) => <ActiveGrantRow key={grant.id} grant={grant} revoking={revokeGrant.isPending} onRevoke={() => revokeGrant.mutate(grant.id)} />)}</ul>
          ) : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No active access grants.</p>}
        </section>
      </section>
    </div>
  )
}

function ActiveGrantRow({ grant, revoking, onRevoke }: { grant: GrantResponse; revoking: boolean; onRevoke: () => void }) {
  return <li className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{grant.externalMentorName}</p><p className="mt-0.5 text-xs text-slate-500">Expires {formatDate(grant.expiresAt)}</p></div><button type="button" disabled={revoking} onClick={onRevoke} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Revoke</button></li>
}

function RecommendationEditor({ studentProfileId, draft, onClose }: { studentProfileId: string; draft: RecommendationLetterResponse | null; onClose: () => void }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [content, setContent] = useState(draft?.content ?? '')
  const [savedDraft, setSavedDraft] = useState(draft)
  const save = useMutation({
    mutationFn: () => savedDraft
      ? api.recommendationLetters.updateDraft(savedDraft.id, { content })
      : api.recommendationLetters.createDraft({ studentProfileId, content }),
    onSuccess: async (letter) => {
      setSavedDraft(letter)
      await queryClient.invalidateQueries({ queryKey: ['authored-recommendation-letters', user?.id] })
      notify('Recommendation draft saved.', 'success')
    },
    onError: () => notify('Draft could not be saved.', 'error'),
  })
  const publish = useMutation({
    mutationFn: () => api.recommendationLetters.publish(savedDraft!.id),
    onSuccess: async (letter) => {
      setSavedDraft(letter)
      await queryClient.invalidateQueries({ queryKey: ['authored-recommendation-letters', user?.id] })
      notify('Recommendation published.', 'success')
    },
    onError: () => notify('Recommendation could not be published.', 'error'),
  })

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recommendation letter {savedDraft?.status === 'PUBLISHED' ? '· Published' : '· Draft'}</h3><button type="button" onClick={onClose} aria-label="Close recommendation editor" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15} /></button></div>
      <textarea aria-label="Recommendation letter" maxLength={20000} rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your recommendation…" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" />
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{content.length}/20000</span><div className="flex gap-2"><button type="button" onClick={() => save.mutate()} disabled={!content.trim() || save.isPending || savedDraft?.status === 'PUBLISHED'} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{save.isPending ? 'Saving…' : 'Save draft'}</button>{savedDraft?.status !== 'PUBLISHED' && <button type="button" onClick={() => publish.mutate()} disabled={!savedDraft || publish.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50"><Check size={15} /> Publish</button>}</div></div>
    </section>
  )
}

function HireRequestDialog({ student, onClose }: { student: WorkspaceStudentSummary; onClose: () => void }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [message, setMessage] = useState('')
  const create = useMutation({
    mutationFn: () => api.hireRequests.create({ studentProfileId: student.studentProfileId, companyName: companyName.trim(), contactEmail: contactEmail.trim() || null, message: message.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mentor-hire-requests', user?.id] })
      notify('Hire request sent.', 'success')
      onClose()
    },
    onError: () => notify('Hire request could not be sent. This student may not yet be eligible.', 'error'),
  })
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={(event) => { event.preventDefault(); create.mutate() }} className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Hire {student.firstName} {student.lastName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a private hire request for this student.</p></div><button type="button" onClick={onClose} aria-label="Close hire request" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button></header>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company<input required maxLength={200} value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact email<input type="email" maxLength={320} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message<textarea rows={3} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50">{create.isPending ? 'Sending…' : 'Send hire request'}</button></div>
    </form></div>
  )
}

function AuthoredLetterList({ letters, loading, error, onRetry }: { letters: RecommendationLetterResponse[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (loading) return <Skeleton rows={4} />
  if (error) return <ErrorNotice message="Authored letters could not be loaded." onRetry={onRetry} />
  if (!letters.length) return <EmptyState title="No recommendation letters yet" description="Open a student detail to draft and publish a recommendation." />
  return <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{letters.map((letter) => <article key={letter.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Award size={16} className="text-[#0f9d8a]" /><span className="text-sm font-medium text-slate-900 dark:text-slate-100">Student {letter.studentProfileId.slice(0, 8)}</span></div><Badge>{letter.status}</Badge></div><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{letter.content}</p><p className="mt-2 text-xs text-slate-500">Updated {formatDate(letter.publishedAt ?? letter.createdAt)}</p></article>)}</div>
}

function HireRequestList({ requests, loading, error, onRetry }: { requests: HireRequestResponse[]; loading: boolean; error: boolean; onRetry: () => void }) {
  const columns: DataColumn<HireRequestResponse>[] = [
    { key: 'company', header: 'Company', render: (request) => <span className="font-medium text-slate-900 dark:text-slate-100">{request.companyName}</span> },
    { key: 'requested', header: 'Requested', render: (request) => formatDate(request.requestedAt) },
    { key: 'status', header: 'Status', render: (request) => <Badge>{request.status}</Badge> },
    { key: 'contact', header: 'Contact', render: (request) => request.contactEmail ?? '—' },
  ]
  if (loading) return <Skeleton rows={4} />
  if (error) return <ErrorNotice message="Hire requests could not be loaded." onRetry={onRetry} />
  return <DataTable columns={columns} rows={requests} getRowKey={(request) => request.id} empty={<EmptyState title="No hire requests" description="Hire requests you create will appear here." />} />
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{message}</span><button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button></section>
}