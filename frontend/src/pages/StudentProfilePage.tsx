import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, UserRound, X } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ScoreRing, Skeleton, StatCard } from '../components/ui'
import { useToast } from '../components/Toast'

export function StudentProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const profileQuery = useQuery({ queryKey: ['student-profile', user?.id], queryFn: api.studentProfile.get, enabled: Boolean(user) })
  const cvQuery = useQuery({ queryKey: ['student-cv', user?.id], queryFn: api.cv.list, enabled: Boolean(user) })
  const punctualityQuery = useQuery({ queryKey: ['student-punctuality', user?.id], queryFn: api.submissions.punctuality, enabled: Boolean(user) })
  const save = useMutation({
    mutationFn: () => api.studentProfile.update({ bio: bio.trim() || null, photoUrl: photoUrl.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-profile', user?.id] })
      notify('Profile saved.', 'success')
      setEditing(false)
    },
    onError: () => notify('Profile could not be saved. Check the photo URL and try again.', 'error'),
  })

  if (profileQuery.isPending || cvQuery.isPending || punctualityQuery.isPending) {
    return <div className="space-y-5"><Skeleton rows={2} /><Skeleton rows={4} /></div>
  }
  if (profileQuery.isError || cvQuery.isError || punctualityQuery.isError || !profileQuery.data || !punctualityQuery.data) {
    return <section role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Profile data could not be loaded. Try again from the dashboard.</section>
  }

  const profile = profileQuery.data
  const entries = cvQuery.data ?? []
  const qualifications = entries.filter((entry) => entry.category === 'EDUCATION' || entry.category === 'CERTIFICATION')
  const skills = [...new Set(entries.flatMap((entry) => [...entry.skills, ...(entry.category === 'SKILLS' ? [entry.title] : [])]))]
  const projects = entries.filter((entry) => entry.category === 'PROJECT')

  function beginEdit() {
    setBio(profile.bio ?? '')
    setPhotoUrl(profile.photoUrl ?? '')
    setEditing(true)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-[#0f9d8a]">Student workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">My profile</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your background, skills, projects, and progress.</p></div>
        {!editing ? <button type="button" onClick={beginEdit} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><Pencil size={15} /> Edit profile</button> : <div className="flex gap-2"><button type="button" onClick={() => setEditing(false)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700"><X size={15} /> Cancel</button><button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} /> {save.isPending ? 'Saving…' : 'Save profile'}</button></div>}
      </header>

      <section className="grid gap-5 border-y border-slate-200 py-5 dark:border-slate-800 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="flex min-w-0 items-start gap-4">
          {profile.photoUrl ? <img src={profile.photoUrl} alt={`${profile.firstName} ${profile.lastName}`} className="size-20 shrink-0 rounded-full object-cover" /> : <div className="grid size-20 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"><UserRound size={32} /></div>}
          <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold text-slate-900 dark:text-white">{profile.firstName} {profile.lastName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}{profile.cohortName ? ` · ${profile.cohortName}` : ''}</p>
            {editing ? <div className="mt-4 space-y-3"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Photo URL<input type="url" maxLength={1000} value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://example.com/photo.jpg" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bio<textarea maxLength={2000} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio || 'Add a short bio to introduce yourself.'}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 lg:justify-end"><ScoreRing score={profile.overallScore} size={72} /><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall score</p><p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{profile.overallScore == null ? '—' : `${Math.round(profile.overallScore)} / 100`}</p><p className="mt-1 text-xs text-slate-500">From analyzed assignments</p></div></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2"><StatCard label="Punctuality" value={`${Math.round(punctualityQuery.data.percentage)}%`} note={`${punctualityQuery.data.onTimeSubmissions} of ${punctualityQuery.data.totalSubmissions} on time`} /><StatCard label="Program started" value={new Date(profile.startDate).toLocaleDateString()} note={profile.cohortName ?? 'Not assigned to a cohort'} /></section>
      <section className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="text-base font-semibold text-slate-900 dark:text-white">ICT qualifications</h2>{qualifications.length ? <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{qualifications.map((entry) => <li key={entry.id} className="py-3"><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{entry.title}</p><p className="mt-1 text-xs text-slate-500">{entry.organization}</p></li>)}</ul> : <div className="mt-3"><EmptyState title="No qualifications yet" description="Add education or certifications in My CV." /></div>}</section>
        <section><h2 className="text-base font-semibold text-slate-900 dark:text-white">Skills</h2>{skills.length ? <div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-sm bg-slate-100 px-2.5 py-1.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{skill}</span>)}</div> : <div className="mt-3"><EmptyState title="No skills yet" description="Add skills in My CV." /></div>}</section>
        <section className="lg:col-span-2"><h2 className="text-base font-semibold text-slate-900 dark:text-white">Projects</h2>{projects.length ? <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">{projects.map((entry) => <li key={entry.id} className="py-3"><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{entry.title}</p>{entry.description && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{entry.description}</p>}{entry.skills.length > 0 && <p className="mt-1 text-xs text-slate-500">{entry.skills.join(' · ')}</p>}</li>)}</ul> : <div className="mt-3"><EmptyState title="No projects yet" description="Add projects in My CV to show what you have built." /></div>}</section>
      </section>
    </div>
  )
}
