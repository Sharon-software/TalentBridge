import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { api } from '../api'
import type { CvEntryCategory, CvEntryRequest, CvEntryResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Badge, EmptyState, Skeleton } from '../components/ui'
import { useToast } from '../components/Toast'

const categories: Array<{ value: CvEntryCategory; label: string }> = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'SKILLS', label: 'Skills' },
  { value: 'CERTIFICATION', label: 'Certifications' },
  { value: 'PROJECT', label: 'Projects' },
]

interface CvFormState {
  title: string
  organization: string
  description: string
  startDate: string
  endDate: string
  skills: string
}

const emptyForm = (): CvFormState => ({ title: '', organization: '', description: '', startDate: '', endDate: '', skills: '' })

function makeRequest(form: CvFormState, category: CvEntryCategory): CvEntryRequest {
  return {
    title: category === 'SKILLS' ? (form.title.trim() || 'Skills') : form.title.trim(),
    category,
    organization: form.organization.trim() || null,
    description: form.description.trim() || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    skills: form.skills.split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean),
  }
}

function pdfDate(value: string | null): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  return `${month}/${year}`
}

export function StudentCvPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<CvEntryCategory>('EDUCATION')
  const [editing, setEditing] = useState<CvEntryResponse | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<CvFormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const cvQuery = useQuery({
    queryKey: ['student-cv', user?.id],
    queryFn: api.cv.list,
    enabled: Boolean(user),
  })

  const saveMutation = useMutation({
    mutationFn: ({ entryId, request }: { entryId: string | null; request: CvEntryRequest }) =>
      entryId ? api.cv.update(entryId, request) : api.cv.create(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-cv', user?.id] })
      setEditing(null)
      setFormOpen(false)
      setForm(emptyForm())
      setFormError('')
      notify('CV entry saved.', 'success')
    },
    onError: () => setFormError('The entry could not be saved. Check the dates and try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: api.cv.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-cv', user?.id] })
      setConfirmDelete(null)
      notify('CV entry deleted.', 'success')
    },
    onError: () => notify('The CV entry could not be deleted.', 'error'),
  })

  function beginCreate() {
    setEditing(null)
    setFormOpen(true)
    setForm(emptyForm())
    setFormError('')
  }

  function beginEdit(entry: CvEntryResponse) {
    setCategory(entry.category)
    setEditing(entry)
    setFormOpen(true)
    setForm({
      title: entry.title,
      organization: entry.organization ?? '',
      description: entry.description ?? '',
      startDate: entry.startDate ?? '',
      endDate: entry.endDate ?? '',
      skills: entry.skills.join(', '),
    })
    setFormError('')
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setFormError('End date must be on or after the start date.')
      return
    }
    saveMutation.mutate({ entryId: editing?.id ?? null, request: makeRequest(form, category) })
  }

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const entries = cvQuery.data ?? []
    const document = new jsPDF()
    const margin = 18
    const pageWidth = document.internal.pageSize.getWidth()
    const pageHeight = document.internal.pageSize.getHeight()
    let cursor = 20

    const write = (value: string, size: number, bold = false, gap = 5) => {
      document.setFont('helvetica', bold ? 'bold' : 'normal')
      document.setFontSize(size)
      const lines = document.splitTextToSize(value, pageWidth - margin * 2) as string[]
      const lineHeight = size * 0.48
      for (const line of lines) {
        if (cursor + lineHeight > pageHeight - margin) {
          document.addPage()
          cursor = 20
        }
        document.text(line, margin, cursor)
        cursor += lineHeight
      }
      cursor += gap
    }

    write(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Curriculum Vitae', 20, true, 3)
    if (user?.email) write(user.email, 10, false, 9)
    for (const section of categories) {
      const sectionEntries = entries.filter((entry) => entry.category === section.value)
      if (!sectionEntries.length) continue
      write(section.label.toUpperCase(), 12, true, 4)
      for (const entry of sectionEntries) {
        write(entry.title, 11, true, 2)
        const organization = [entry.organization, [pdfDate(entry.startDate), pdfDate(entry.endDate)].filter(Boolean).join(' - ')].filter(Boolean).join('  ·  ')
        if (organization) write(organization, 9, false, 3)
        if (entry.description) write(entry.description, 9, false, 3)
        if (entry.skills.length) write(`Skills: ${entry.skills.join(', ')}`, 9, false, 6)
      }
    }
    document.save(`${user?.firstName ?? 'student'}-${user?.lastName ?? 'cv'}-cv.pdf`)
  }

  if (cvQuery.isPending) return <Skeleton rows={5} />

  if (cvQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeading onDownload={downloadPdf} canDownload={false} />
        <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span>Your CV could not be loaded.</span>
          <button type="button" onClick={() => void cvQuery.refetch()} className="font-medium underline underline-offset-2">Retry</button>
        </section>
      </div>
    )
  }

  const entries = cvQuery.data ?? []
  const filteredEntries = entries.filter((entry) => entry.category === category)

  return (
    <div className="space-y-6">
      <PageHeading onDownload={downloadPdf} canDownload={entries.length > 0} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div role="tablist" aria-label="CV sections" className="flex max-w-full gap-1 overflow-x-auto">
          {categories.map((item) => {
            const count = entries.filter((entry) => entry.category === item.value).length
            return (
              <button key={item.value} type="button" role="tab" aria-selected={category === item.value} onClick={() => { setCategory(item.value); setEditing(null); setFormOpen(false); setForm(emptyForm()) }} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm ${category === item.value ? 'border-[#0f9d8a] font-semibold text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {item.label}<span className="text-xs tabular-nums text-slate-400">{count}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={beginCreate} className="mb-2 inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-medium text-white hover:bg-[#0b8878]"><Plus size={16} /> Add entry</button>
      </div>

      {formOpen ? (
        <CvEntryForm
          category={category}
          form={form}
          error={formError}
          saving={saveMutation.isPending}
          isEditing={Boolean(editing)}
          onChange={setForm}
          onSubmit={submitForm}
          onCancel={() => { setEditing(null); setFormOpen(false); setForm(emptyForm()); setFormError('') }}
        />
      ) : null}

      {filteredEntries.length ? (
        <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-slate-900 dark:text-white">{entry.title}</h2><Badge>{category}</Badge></div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{[entry.organization, [entry.startDate, entry.endDate].filter(Boolean).join(' - ')].filter(Boolean).join(' · ') || 'No organization or dates added'}</p>
                {entry.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{entry.description}</p>}
                {entry.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{entry.skills.map((skill) => <span key={skill} className="rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{skill}</span>)}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                {confirmDelete === entry.id ? (
                  <><span className="mr-2 text-xs text-slate-500">Delete?</span><button type="button" onClick={() => deleteMutation.mutate(entry.id)} disabled={deleteMutation.isPending} className="rounded px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Confirm</button><button type="button" onClick={() => setConfirmDelete(null)} aria-label="Cancel delete" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15} /></button></>
                ) : (
                  <><button type="button" onClick={() => beginEdit(entry)} aria-label={`Edit ${entry.title}`} title="Edit entry" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0f766e] dark:hover:bg-slate-800"><Pencil size={16} /></button><button type="button" onClick={() => setConfirmDelete(entry.id)} aria-label={`Delete ${entry.title}`} title="Delete entry" className="rounded p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"><Trash2 size={16} /></button></>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : !formOpen ? (
        <EmptyState title={`No ${categories.find((item) => item.value === category)?.label.toLowerCase()} entries`} description="Add an entry to build out your CV." />
      ) : null}
    </div>
  )
}

function PageHeading({ onDownload, canDownload }: { onDownload: () => void; canDownload: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-medium text-[#0f9d8a]">Student workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">My CV</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep your education, experience, skills, and certifications current.</p></div>
      <button type="button" onClick={onDownload} disabled={!canDownload} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download size={16} /> Download PDF</button>
    </div>
  )
}

function CvEntryForm({
  category,
  form,
  error,
  saving,
  isEditing,
  onChange,
  onSubmit,
  onCancel,
}: {
  category: CvEntryCategory
  form: CvFormState
  error: string
  saving: boolean
  isEditing: boolean
  onChange: (value: CvFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  const update = (field: keyof CvFormState, value: string) => onChange({ ...form, [field]: value })
  const skillsOnly = category === 'SKILLS'
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{isEditing ? 'Edit entry' : `Add ${categories.find((item) => item.value === category)?.label.toLowerCase()} entry`}</h2>
      {!skillsOnly && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title<input required maxLength={200} value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>}
      <div className="grid gap-4 sm:grid-cols-2">
        {!skillsOnly && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Institution or organization<input maxLength={200} value={form.organization} onChange={(event) => update('organization', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>}
        {!skillsOnly && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start date<input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>}
        {!skillsOnly && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End date<input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>}
      </div>
      {!skillsOnly && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description<textarea rows={3} maxLength={10000} value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{skillsOnly ? 'Skills' : 'Skills (optional)'}<textarea rows={2} maxLength={2000} value={form.skills} onChange={(event) => update('skills', event.target.value)} placeholder="Separate skills with commas" className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950" /></label>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-medium text-white hover:bg-[#0b8878] disabled:opacity-50"><Save size={15} />{saving ? 'Saving' : 'Save entry'}</button><button type="button" onClick={onCancel} className="h-9 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button></div>
    </form>
  )
}