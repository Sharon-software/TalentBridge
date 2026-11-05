import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Bookmark, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react'
import { api } from '../api'
import type { CreateHireRequest, HireRequestResponse, HireRequestStatus, StudentDetail, StudentSummary, TalentSearchParams } from '../api/types'
import { useToast } from '../components/Toast'
import { Badge, EmptyState, Skeleton, StatCard } from '../components/ui'

const shortlistStorageKey = 'talentbridge.recruiter.shortlist'
const pageSize = 12

interface AppliedFilters {
  qualifications: string[]
  minYearsExperience: string
  skill: string
  search: string
}

const emptyFilters = (): AppliedFilters => ({ qualifications: [], minYearsExperience: '', skill: '', search: '' })

interface HireRequestWithStudent extends HireRequestResponse {
  student: StudentDetail | null
}

function readShortlist(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(shortlistStorageKey) ?? '[]') as unknown
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function yearsLabel(years: number): string {
  return `${years} ${years === 1 ? 'year' : 'years'} experience`
}

export function RecruiterDashboardPage({ section = 'talent' }: { section?: 'talent' | 'shortlist' | 'hire-requests' | 'hired' }) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [shortlistIds, setShortlistIds] = useState<string[]>(readShortlist)
  const [filters, setFilters] = useState<AppliedFilters>(emptyFilters)
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(emptyFilters)
  const [page, setPage] = useState(0)
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null)

  useEffect(() => {
    localStorage.setItem(shortlistStorageKey, JSON.stringify(shortlistIds))
  }, [shortlistIds])

  const qualificationQuery = useQuery({
    queryKey: ['recruiter-talent-filters'],
    queryFn: api.talent.filters,
  })

  const searchParams: TalentSearchParams = {
    qualifications: filters.qualifications.length ? filters.qualifications : undefined,
    minYearsExperience: filters.minYearsExperience === '' ? undefined : Number(filters.minYearsExperience),
    skill: filters.skill.trim() || undefined,
    search: filters.search.trim() || undefined,
    page,
    size: pageSize,
  }
  const boardQuery = useQuery({
    queryKey: ['recruiter-talent-board', searchParams],
    queryFn: () => api.talent.search(searchParams),
    enabled: section === 'talent',
    placeholderData: (previous) => previous,
  })
  const shortlistQuery = useQuery({
    queryKey: ['recruiter-shortlist', shortlistIds],
    queryFn: async () => {
      const entries = await Promise.all(shortlistIds.map(async (studentProfileId) => {
        try {
          return await api.talent.detail(studentProfileId)
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 404) return null
          throw error
        }
      }))
      return entries.filter((entry): entry is StudentDetail => entry !== null)
    },
    enabled: section === 'shortlist' && shortlistIds.length > 0,
  })
  const hireRequestsQuery = useQuery({
    queryKey: ['recruiter-hire-requests'],
    queryFn: async (): Promise<HireRequestWithStudent[]> => {
      const requests = await api.hireRequests.list()
      return Promise.all(requests.map(async (request) => {
        try {
          return { ...request, student: await api.talent.detail(request.studentProfileId) }
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 404) return { ...request, student: null }
          throw error
        }
      }))
    },
    enabled: section === 'hire-requests' || section === 'hired',
  })
  const updateHireStatus = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: HireRequestStatus }) => api.hireRequests.updateStatus(requestId, status),
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ['recruiter-hire-requests'] })
      notify(request.status === 'ACCEPTED' ? 'Candidate marked as hired.' : request.status === 'DECLINED' ? 'Hire request declined.' : 'Candidate moved back to hire requests.', 'success')
    },
    onError: () => notify('The hire request status could not be updated.', 'error'),
  })

  function toggleShortlist(studentProfileId: string) {
    const isSaved = shortlistIds.includes(studentProfileId)
    setShortlistIds((current) => isSaved
      ? current.filter((id) => id !== studentProfileId)
      : [...current, studentProfileId])
    notify(isSaved ? 'Removed from shortlist.' : 'Added to shortlist.', 'success')
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ ...draftFilters })
    setPage(0)
  }

  function clearFilters() {
    const cleared = emptyFilters()
    setDraftFilters(cleared)
    setFilters(cleared)
    setPage(0)
  }

  if (section === 'shortlist') {
    return (
      <ShortlistPage
        loading={shortlistIds.length > 0 && shortlistQuery.isPending}
        error={shortlistQuery.isError}
        students={shortlistQuery.data ?? []}
        hasSavedIds={shortlistIds.length > 0}
        onRetry={() => void shortlistQuery.refetch()}
        onRemove={toggleShortlist}
        onSelect={setSelectedStudent}
      >
        {selectedStudent && <RecruiterStudentDetailDialog key={selectedStudent.studentProfileId} student={selectedStudent} shortlisted={shortlistIds.includes(selectedStudent.studentProfileId)} onToggleShortlist={() => toggleShortlist(selectedStudent.studentProfileId)} onClose={() => setSelectedStudent(null)} />}
      </ShortlistPage>
    )
  }

  if (section === 'hire-requests' || section === 'hired') {
    const requests = (hireRequestsQuery.data ?? []).filter((request) => section === 'hired' ? request.status === 'ACCEPTED' : request.status !== 'ACCEPTED')
    return (
      <HireRequestsPage
        section={section}
        requests={requests}
        loading={hireRequestsQuery.isPending}
        error={hireRequestsQuery.isError}
        onRetry={() => void hireRequestsQuery.refetch()}
        onStatusChange={(requestId, status) => updateHireStatus.mutate({ requestId, status })}
        onViewStudent={(student) => setSelectedStudent(student)}
      >
        {selectedStudent && <RecruiterStudentDetailDialog key={selectedStudent.studentProfileId} student={selectedStudent} shortlisted={shortlistIds.includes(selectedStudent.studentProfileId)} onToggleShortlist={() => toggleShortlist(selectedStudent.studentProfileId)} onClose={() => setSelectedStudent(null)} />}
      </HireRequestsPage>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading shortlistCount={shortlistIds.length} section="talent" />
      <form onSubmit={applyFilters} className="grid gap-4 border-y border-slate-200 py-4 dark:border-slate-800 lg:grid-cols-[minmax(13rem,1.4fr)_minmax(12rem,1fr)_10rem_minmax(10rem,1fr)_auto] lg:items-end">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Search<input type="search" value={draftFilters.search} onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })} placeholder="Name or email" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">ICT qualifications<select multiple size={3} value={draftFilters.qualifications} onChange={(event) => setDraftFilters({ ...draftFilters, qualifications: Array.from(event.currentTarget.selectedOptions, (option) => option.value) })} className="mt-1.5 h-[5.75rem] w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white">{qualificationQuery.data?.ictQualifications.map((qualification) => <option key={qualification} value={qualification}>{qualification}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Min. experience<select value={draftFilters.minYearsExperience} onChange={(event) => setDraftFilters({ ...draftFilters, minYearsExperience: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">Any</option><option value="1">1+ years</option><option value="2">2+ years</option><option value="3">3+ years</option><option value="5">5+ years</option><option value="8">8+ years</option></select></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Skill<input value={draftFilters.skill} onChange={(event) => setDraftFilters({ ...draftFilters, skill: event.target.value })} placeholder="e.g. Java" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
        <div className="flex gap-2"><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0f9d8a] px-4 text-sm font-semibold text-white hover:bg-[#0b8878]"><Search size={15} /> Apply</button><button type="button" onClick={clearFilters} title="Clear filters" aria-label="Clear filters" className="grid size-10 place-items-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X size={16} /></button></div>
      </form>

      {qualificationQuery.isError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">Qualification options could not be loaded.</p>}
      {boardQuery.isPending ? <Skeleton rows={5} /> : boardQuery.isError ? (
        <ErrorNotice message="Talent could not be loaded." onRetry={() => void boardQuery.refetch()} />
      ) : boardQuery.data?.content.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-400">{boardQuery.data.totalElements} eligible students · ranked by overall score</p><span className="text-xs text-slate-500">Page {boardQuery.data.number + 1} of {Math.max(boardQuery.data.totalPages, 1)}</span></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {boardQuery.data.content.map((student, index) => <TalentCard key={student.studentProfileId} student={student} rank={page * pageSize + index + 1} shortlisted={shortlistIds.includes(student.studentProfileId)} onSelect={() => setSelectedStudent(student)} onToggleShortlist={() => toggleShortlist(student.studentProfileId)} />)}
          </div>
          <Pagination page={boardQuery.data.number} totalPages={boardQuery.data.totalPages} onChange={setPage} />
        </>
      ) : (
        <EmptyState title="No eligible matches" description="Try removing a filter. Only students who have been enrolled for at least six months appear on this board." />
      )}

      {selectedStudent && <RecruiterStudentDetailDialog key={selectedStudent.studentProfileId} student={selectedStudent} shortlisted={shortlistIds.includes(selectedStudent.studentProfileId)} onToggleShortlist={() => toggleShortlist(selectedStudent.studentProfileId)} onClose={() => setSelectedStudent(null)} />}
    </div>
  )
}

function HireRequestsPage({
  section,
  requests,
  loading,
  error,
  onRetry,
  onStatusChange,
  onViewStudent,
  children,
}: {
  section: 'hire-requests' | 'hired'
  requests: HireRequestWithStudent[]
  loading: boolean
  error: boolean
  onRetry: () => void
  onStatusChange: (requestId: string, status: HireRequestStatus) => void
  onViewStudent: (student: StudentSummary) => void
  children: React.ReactNode
}) {
  const isHiredList = section === 'hired'
  return (
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-[#0f9d8a]">Recruiter workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{isHiredList ? 'Hired' : 'Hire requests'}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isHiredList ? 'Candidates with an accepted hire request.' : 'Review pending and declined candidates.'}</p></header>
      {loading ? <Skeleton rows={4} /> : error ? <ErrorNotice message="Hire requests could not be loaded." onRetry={onRetry} /> : requests.length ? (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{request.student ? `${request.student.student.firstName} ${request.student.student.lastName}` : 'Candidate profile unavailable'}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{request.companyName}{request.contactEmail ? ` · ${request.contactEmail}` : ''}</p>
                {request.message && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{request.message}</p>}
                <p className="mt-1 text-xs text-slate-500">Requested {formatDate(request.requestedAt)} · {request.status}</p>
              </div>
              <div className="flex flex-wrap gap-2 self-end sm:self-auto">
                {request.student && <button type="button" onClick={() => onViewStudent(request.student!.student)} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">View profile</button>}
                {!isHiredList && request.status === 'PENDING' && <button type="button" onClick={() => onStatusChange(request.id, 'DECLINED')} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Decline</button>}
                {request.status !== 'ACCEPTED' ? <button type="button" onClick={() => onStatusChange(request.id, 'ACCEPTED')} className="h-9 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878]">Mark hired</button> : <button type="button" onClick={() => onStatusChange(request.id, 'PENDING')} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Move to requests</button>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title={isHiredList ? 'No hired candidates' : 'No hire requests'} description={isHiredList ? 'Accepted candidates will appear here.' : 'Hire requests from your talent workflow will appear here.'} />}
      {children}
    </div>
  )
}

function PageHeading({ shortlistCount, section }: { shortlistCount: number; section: 'talent' | 'shortlist' | 'hire-requests' | 'hired' }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-[#0f9d8a]">Recruiter workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{section === 'shortlist' ? 'Shortlist' : 'Talent board'}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Students become eligible after six months in the program.</p></div><a href="/recruiter/shortlist" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><Bookmark size={15} /> Shortlist <span className="tabular-nums text-slate-500">{shortlistCount}</span></a></header>
  )
}

function TalentCard({ student, rank, shortlisted, onSelect, onToggleShortlist }: { student: StudentSummary; rank: number; shortlisted: boolean; onSelect: () => void; onToggleShortlist: () => void }) {
  return (
    <article className="flex min-h-44 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">Rank #{rank}</p><button type="button" onClick={onSelect} className="mt-1 block max-w-full truncate text-left text-base font-semibold text-slate-900 hover:text-[#0f766e] dark:text-slate-100 dark:hover:text-teal-300">{student.firstName} {student.lastName}</button><p className="mt-1 text-xs text-slate-500">{yearsLabel(student.yearsExperience)} · Joined {formatDate(student.startDate)}</p></div><ScoreRing score={student.overallScore} /></div>
      <div className="mt-4 flex min-h-10 flex-wrap gap-1.5">{student.qualifications.slice(0, 2).map((qualification) => <Badge key={qualification}>{qualification}</Badge>)}{student.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{skill}</span>)}</div>
      <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={onSelect} className="text-sm font-medium text-[#0f766e] hover:underline dark:text-teal-300">View profile</button><button type="button" onClick={onToggleShortlist} aria-label={shortlisted ? `Remove ${student.firstName} from shortlist` : `Add ${student.firstName} to shortlist`} title={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} className={`grid size-9 place-items-center rounded-md ${shortlisted ? 'bg-teal-50 text-[#0f766e] dark:bg-teal-950/40 dark:text-teal-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Bookmark size={17} fill={shortlisted ? 'currentColor' : 'none'} /></button></div>
    </article>
  )
}

function ScoreRing({ score }: { score: number | null }) {
  return <div className="grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-[#0f9d8a] text-xs font-semibold tabular-nums text-slate-900 dark:text-white" aria-label={score == null ? 'No score' : `Score ${Math.round(score)}`}>{score == null ? '—' : Math.round(score)}</div>
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <nav aria-label="Talent pages" className="flex items-center justify-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"><button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page" className="grid size-9 place-items-center rounded-md border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"><ChevronLeft size={17} /></button><span className="text-sm tabular-nums text-slate-500">{page + 1} / {Math.max(totalPages, 1)}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page" className="grid size-9 place-items-center rounded-md border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"><ChevronRight size={17} /></button></nav>
  )
}

function RecruiterStudentDetailDialog({ student, shortlisted, onToggleShortlist, onClose }: { student: StudentSummary; shortlisted: boolean; onToggleShortlist: () => void; onClose: () => void }) {
  const [hireOpen, setHireOpen] = useState(false)
  const detailQuery = useQuery({ queryKey: ['recruiter-student-detail', student.studentProfileId], queryFn: () => api.talent.detail(student.studentProfileId) })
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="recruiter-student-title" className="mx-auto my-2 max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:my-6 sm:max-h-[calc(100vh-3rem)]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"><div><p className="text-xs font-medium uppercase tracking-wide text-[#0f766e] dark:text-teal-300">Eligible candidate</p><h2 id="recruiter-student-title" className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</h2></div><button type="button" onClick={onClose} aria-label="Close student detail" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></header>
        <div className="space-y-6 p-4 sm:p-6">
          {detailQuery.isPending ? <Skeleton rows={5} /> : detailQuery.isError || !detailQuery.data ? <ErrorNotice message="Student detail could not be loaded." onRetry={() => void detailQuery.refetch()} /> : <>
            <section className="grid gap-3 sm:grid-cols-3"><StatCard label="Overall score" value={student.overallScore == null ? '—' : `${Math.round(student.overallScore)} / 100`} note="Ranked across completed analyses" /><StatCard label="Experience" value={yearsLabel(student.yearsExperience)} note={`Program start ${formatDate(student.startDate)}`} /><StatCard label="Skills" value={detailQuery.data.cv.flatMap((entry) => entry.skills).length} note="Skills listed on CV" /></section>
            <section><h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">CV</h3>{detailQuery.data.cv.length ? <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{detailQuery.data.cv.map((entry) => <li key={entry.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.title}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{entry.organization || 'Organization not listed'} · {[entry.startDate, entry.endDate].filter(Boolean).join(' – ') || 'Dates not listed'}</p></div></div>{entry.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{entry.description}</p>}{entry.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{entry.skills.map((skill) => <span key={skill} className="rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{skill}</span>)}</div>}</li>)}</ul> : <EmptyState title="No CV entries" description="This student's CV has no entries yet." />}</section>
            <section><h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Scorecards</h3>{detailQuery.data.scoreCards.length ? <div className="grid gap-3 sm:grid-cols-2">{detailQuery.data.scoreCards.map((card) => <article key={card.submissionId} className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-800 dark:text-slate-100">Scorecard</span><Badge>{card.status}</Badge></div><p className="mt-2 text-lg font-semibold text-[#0f766e] dark:text-teal-300">{card.score == null ? '—' : `${Math.round(card.score)} / 100`}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">{[['Quality', card.quality], ['Correctness', card.correctness], ['Originality', card.originality], ['Communication', card.communication]].map(([label, value]) => <span key={label}>{label}: {value ?? '—'}</span>)}</div></article>)}</div> : <EmptyState title="No scorecards yet" description="Analysis scorecards will appear here when available." />}</section>
            <section><h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Published recommendations</h3>{detailQuery.data.recommendationLetters.length ? <div className="space-y-3">{detailQuery.data.recommendationLetters.map((letter) => <article key={letter.id} className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">{letter.authorName} · Published {letter.publishedAt ? formatDate(letter.publishedAt) : 'date unavailable'}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{letter.content}</p></article>)}</div> : <EmptyState title="No published letters" description="Published recommendation letters will appear here." />}</section>
          </>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800"><button type="button" onClick={onToggleShortlist} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><Bookmark size={15} fill={shortlisted ? 'currentColor' : 'none'} />{shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}</button><button type="button" onClick={() => setHireOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878]"><BriefcaseBusiness size={15} /> Hire</button></div>
        </div>
      </section>
      {hireOpen && <HireConfirmationDialog student={student} onClose={() => setHireOpen(false)} />}
    </div>
  )
}

function HireConfirmationDialog({ student, onClose }: { student: StudentSummary; onClose: () => void }) {
  const { notify } = useToast()
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const createRequest = useMutation({
    mutationFn: (request: CreateHireRequest) => api.hireRequests.create(request),
    onSuccess: () => {
      notify('Hire request sent.', 'success')
      onClose()
    },
    onError: () => notify('The hire request could not be sent. This student may no longer be eligible.', 'error'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirming) {
      setConfirming(true)
      return
    }
    createRequest.mutate({ studentProfileId: student.studentProfileId, companyName: companyName.trim(), contactEmail: contactEmail.trim() || null, message: message.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 p-4"><form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-[#0f766e] dark:text-teal-300">{confirming ? 'Confirm hire request' : 'New hire request'}</p><h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</h2></div><button type="button" onClick={onClose} aria-label="Close hire request" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button></header>
      {confirming ? <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><p>Send this hire request for <strong>{companyName}</strong>?</p><p className="mt-2">{contactEmail || 'No contact email'} · {message || 'No message added'}</p></div> : <>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company<input required maxLength={200} value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact email<input type="email" maxLength={320} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message<textarea rows={3} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      </>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => confirming ? setConfirming(false) : onClose()} className="h-9 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{confirming ? 'Back' : 'Cancel'}</button><button type="submit" disabled={createRequest.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:opacity-50">{confirming ? <><Check size={15} /> Confirm hire request</> : 'Continue'}</button></div>
    </form></div>
  )
}

function ShortlistPage({
  loading,
  error,
  students,
  hasSavedIds,
  onRetry,
  onRemove,
  onSelect,
  children,
}: {
  loading: boolean
  error: boolean
  students: StudentDetail[]
  hasSavedIds: boolean
  onRetry: () => void
  onRemove: (studentProfileId: string) => void
  onSelect: (student: StudentSummary) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6"><PageHeading shortlistCount={students.length} section="shortlist" />
      {loading ? <Skeleton rows={5} /> : error ? <ErrorNotice message="Shortlist details could not be loaded." onRetry={onRetry} /> : students.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{students.map(({ student }, index) => <TalentCard key={student.studentProfileId} student={student} rank={index + 1} shortlisted onSelect={() => onSelect(student)} onToggleShortlist={() => onRemove(student.studentProfileId)} />)}</div> : <EmptyState title={hasSavedIds ? 'No eligible shortlist entries' : 'Your shortlist is empty'} description={hasSavedIds ? 'Some candidates may no longer meet the six-month eligibility requirement.' : 'Save candidates from the talent board to compare them here.'} />}
      {children}
    </div>
  )
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{message}</span><button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button></section>
}
