import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '../api'
import type { SubmissionReviewResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Skeleton } from './ui'

interface ReviewDraft {
  rating: number
  comments: string
}

export function SubmissionReviewPanel({ submissionId, kind }: { submissionId: string; kind: 'feedback' | 'review' }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ReviewDraft | null>(null)
  const reviewKey = ['submission-review', submissionId, user?.id] as const
  const reviewQuery = useQuery({
    queryKey: reviewKey,
    queryFn: () => api.submissions.review(submissionId),
  })
  const currentReview = reviewQuery.data ?? null
  const values = draft ?? { rating: currentReview?.rating ?? 0, comments: currentReview?.comments ?? '' }
  const saveReview = useMutation({
    mutationFn: () => api.submissions.updateReview(submissionId, { rating: values.rating, comments: values.comments.trim() }),
    onSuccess: async (review) => {
      setDraft(null)
      queryClient.setQueryData<SubmissionReviewResponse>(reviewKey, review)
      await queryClient.invalidateQueries({ queryKey: reviewKey })
    },
  })
  const title = kind === 'feedback' ? 'Feedback for student' : 'Review for student'

  if (reviewQuery.isPending) return <Skeleton rows={3} />

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Rate the submission and leave private written feedback.</p></div>
        {currentReview && <span className="text-xs text-slate-500">Updated {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(currentReview.updatedAt))}</span>}
      </header>
      {reviewQuery.isError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">Review could not be loaded. You can still submit feedback.</p>}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Rating</p>
        <div role="group" aria-label="Rating out of 5" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button key={rating} type="button" aria-label={`Rate ${rating} out of 5`} aria-pressed={values.rating === rating} onClick={() => setDraft({ ...values, rating })} className="rounded p-1 text-amber-500 hover:bg-amber-50 aria-pressed:text-amber-600 dark:hover:bg-amber-950/30">
              <Star size={21} fill={values.rating >= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
          {values.rating > 0 && <span className="ml-2 text-sm tabular-nums text-slate-600 dark:text-slate-300">{values.rating}/5</span>}
        </div>
      </div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Comments<textarea required maxLength={10000} rows={4} value={values.comments} onChange={(event) => setDraft({ ...values, comments: event.target.value })} placeholder="Share strengths, next steps, or specific feedback…" className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      {saveReview.isError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">Feedback could not be saved. Check that you still have access to this submission.</p>}
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Saved to this submission and visible to you.</span><button type="button" onClick={() => saveReview.mutate()} disabled={saveReview.isPending || values.rating < 1 || !values.comments.trim()} className="h-9 rounded-md bg-[#0f9d8a] px-3 text-sm font-semibold text-white hover:bg-[#0b8878] disabled:cursor-not-allowed disabled:opacity-50">{saveReview.isPending ? 'Saving…' : currentReview ? 'Update feedback' : 'Save feedback'}</button></div>
    </section>
  )
}
