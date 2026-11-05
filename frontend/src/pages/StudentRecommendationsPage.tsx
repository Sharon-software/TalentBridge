import { useQuery } from '@tanstack/react-query'
import { Award, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { EmptyState, Skeleton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

function formatDate(value: string | null): string {
  if (!value) return 'Publication date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(value))
}

export function StudentRecommendationsPage() {
  const { user } = useAuth()
  const lettersQuery = useQuery({
    queryKey: ['student-recommendation-letters', user?.id],
    queryFn: api.recommendationLetters.mine,
    enabled: Boolean(user),
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#0f9d8a]">Student workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Recommendations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Published letters from your mentors and coaches.</p>
      </div>

      {lettersQuery.isPending ? <Skeleton rows={4} /> : lettersQuery.isError ? (
        <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span>Recommendation letters could not be loaded.</span>
          <button type="button" onClick={() => void lettersQuery.refetch()} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button>
        </section>
      ) : lettersQuery.data?.length ? (
        <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {lettersQuery.data.map((letter) => (
            <article key={letter.id} className="py-6 first:pt-0 last:pb-0">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-50 text-[#0f766e] dark:bg-teal-950/50 dark:text-teal-300"><Award size={18} /></span>
                  <div><h2 className="text-base font-semibold text-slate-900 dark:text-white">{letter.authorName}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Published {formatDate(letter.publishedAt)}</p></div>
                </div>
                <span className="rounded-sm bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">Published</span>
              </header>
              <div className="mt-4 whitespace-pre-wrap border-l-2 border-teal-200 pl-4 text-sm leading-7 text-slate-700 dark:border-teal-800 dark:text-slate-300">{letter.content}</div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No published recommendations" description="Published letters from your mentors and coaches will appear here." />
      )}
    </div>
  )
}