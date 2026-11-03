import { Check, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

export function ScoreRing({ score, size = 72 }: { score: number | null; size?: number }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score))
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-label={score == null ? 'No score' : `Score ${value}`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-slate-700" />
        {score != null && <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-teal-600 dark:text-teal-400" />}
      </svg>
      <span className="absolute text-sm font-semibold text-slate-800 dark:text-slate-100">{score == null ? '—' : Math.round(score)}</span>
    </div>
  )
}

export function StatCard({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
          {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
        </div>
        {icon && <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">{icon}</div>}
      </div>
    </section>
  )
}

export interface DataColumn<Row> {
  key: string
  header: string
  render: (row: Row) => ReactNode
  className?: string
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  empty,
}: {
  columns: DataColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  empty?: ReactNode
}) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="No records" description="There is nothing to show here yet." />}</>
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
          <tr>{columns.map((column) => <th key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>{column.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => <tr key={getRowKey(row)} className="text-slate-700 dark:text-slate-200">{columns.map((column) => <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

const badgeStyles: Record<string, string> = {
  ON_TIME: 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300',
  COMPLETED: 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300',
  PUBLISHED: 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300',
  LATE: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300',
  PENDING: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300',
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
  FAILED: 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300',
}

export function Badge({ children }: { children: string }) {
  const style = badgeStyles[children] ?? 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>{children.replaceAll('_', ' ')}</span>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div>
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Minus size={18} /></div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading" className="animate-pulse space-y-3">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="h-12 rounded-lg bg-slate-200 dark:bg-slate-800" />)}
    </div>
  )
}

export function CheckMark() {
  return <Check size={16} aria-hidden="true" />
}