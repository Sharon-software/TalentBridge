import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { LoaderCircle, MessageSquareText, RefreshCw, Send } from 'lucide-react'
import { api } from '../api'
import type { MessageThreadSummary, MessageView, ThreadMessages } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, Skeleton } from '../components/ui'

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed'

function websocketUrl(): string {
  const url = new URL(import.meta.env.VITE_API_URL || window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.search = ''
  return url.toString()
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function threadKey(userId: string | undefined) {
  return ['student-message-threads', userId] as const
}

function messagesKey(threadId: string | undefined) {
  return ['student-thread-messages', threadId] as const
}

export function StudentMessagesPage() {
  const { user, token } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [sendError, setSendError] = useState('')
  const clientRef = useRef<Client | null>(null)

  const threadsQuery = useQuery({
    queryKey: threadKey(user?.id),
    queryFn: api.messages.threads,
    enabled: Boolean(user),
  })
  const threads = threadsQuery.data ?? []
  const requestedThreadId = searchParams.get('thread')
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId)
    ?? threads.find((thread) => thread.id === requestedThreadId)
    ?? threads[0]
    ?? null
  const isExternalMentor = user?.role === 'EXTERNAL_MENTOR'
  const activeThreadId = selectedThread?.id
  const userId = user?.id
  const visibleConnectionState: ConnectionState = token ? connectionState : 'failed'

  const messagesQuery = useQuery({
    queryKey: messagesKey(selectedThread?.id),
    queryFn: async () => {
      const threadData = await api.messages.readThread(selectedThread!.id)
      void queryClient.invalidateQueries({ queryKey: threadKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['student-message-unread', user?.id] })
      return threadData
    },
    enabled: Boolean(selectedThread),
  })

  const unreadQuery = useQuery({
    queryKey: ['student-message-unread', user?.id],
    queryFn: api.messages.unreadCount,
    enabled: Boolean(user),
  })

  useEffect(() => {
    if (!activeThreadId || !userId) {
      clientRef.current = null
      return
    }

    if (!token) {
      return
    }

    const threadId = activeThreadId
    const client = new Client({
      brokerURL: websocketUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnectionState('connected')
        client.subscribe(`/user/queue/threads/${threadId}`, (message: IMessage) => {
          try {
            const incoming = JSON.parse(message.body) as MessageView
            queryClient.setQueryData<ThreadMessages>(messagesKey(threadId), (current) => {
              if (!current || current.messages.some((item) => item.id === incoming.id)) return current
              return { ...current, messages: [...current.messages, incoming] }
            })
            void queryClient.invalidateQueries({ queryKey: ['student-message-unread', userId] })
          } catch {
            setSendError('A live message could not be read. Refresh the conversation to sync it.')
          }
        })
      },
      onWebSocketClose: () => setConnectionState('reconnecting'),
      onWebSocketError: () => setConnectionState('reconnecting'),
      onStompError: () => setConnectionState('failed'),
    })

    clientRef.current = client
    client.activate()
    return () => {
      if (clientRef.current === client) clientRef.current = null
      void client.deactivate()
    }
  }, [activeThreadId, userId, token, queryClient])

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = messageText.trim()
    const client = clientRef.current
    if (!selectedThread || !body) return
    if (!client?.connected) {
      setSendError('The secure connection is not ready yet.')
      return
    }
    try {
      client.publish({
        destination: `/app/threads/${selectedThread.id}/messages`,
        body: JSON.stringify({ body }),
      })
      setMessageText('')
      setSendError('')
    } catch {
      setSendError('Your message could not be sent. Please try again.')
    }
  }

  if (threadsQuery.isPending) return <Skeleton rows={5} />

  if (threadsQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeading unreadCount={unreadQuery.data?.unreadCount ?? 0} isExternalMentor={isExternalMentor} />
        <section role="alert" className="flex items-center justify-between gap-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span>Conversations could not be loaded.</span>
          <button type="button" onClick={() => void threadsQuery.refetch()} className="inline-flex shrink-0 items-center gap-2 font-medium"><RefreshCw size={15} /> Retry</button>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading unreadCount={unreadQuery.data?.unreadCount ?? 0} isExternalMentor={isExternalMentor} />
      {threads.length === 0 ? (
        <EmptyState title="No active conversations" description={isExternalMentor ? 'Private conversations appear when a student messages you about an active grant.' : 'Conversations appear here when an external mentor has an active access grant for one of your submissions.'} />
      ) : (
        <section className="grid min-h-[32rem] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside aria-label="Conversations" className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">{isExternalMentor ? 'Students' : 'Mentors'}</h2><ConnectionBadge state={visibleConnectionState} /></div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800 lg:max-h-[calc(32rem-3rem)]">
              {threads.map((thread) => <ThreadButton key={thread.id} thread={thread} selected={thread.id === selectedThread?.id} onClick={() => { setSelectedThreadId(thread.id); setConnectionState('connecting'); setSendError('') }} />)}
            </ul>
          </aside>

          <div className="flex min-h-[28rem] min-w-0 flex-col">
            {selectedThread ? (
              <>
                <header className="flex h-12 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
                  <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{selectedThread.participantName}</h2><p className="truncate text-xs text-slate-500 dark:text-slate-400">Submission {selectedThread.submissionId.slice(0, 8)}</p></div>
                  <ConnectionBadge state={visibleConnectionState} />
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                  {messagesQuery.isPending ? <Skeleton rows={3} /> : messagesQuery.isError ? (
                    <section role="alert" className="flex items-center justify-between gap-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"><span>Messages could not be loaded.</span><button type="button" onClick={() => void messagesQuery.refetch()} className="font-medium underline underline-offset-2">Retry</button></section>
                  ) : messagesQuery.data?.messages.length ? (
                    messagesQuery.data.messages.map((message) => <MessageBubble key={message.id} message={message} isOwn={message.senderId === user?.id} />)
                  ) : (
                    <div className="grid h-full min-h-48 place-items-center"><EmptyState title="Start the conversation" description="Messages in this conversation are private to you and your external mentor." /></div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="border-t border-slate-200 p-3 dark:border-slate-800">
                  {sendError && <p role="alert" className="mb-2 text-xs text-rose-700 dark:text-rose-300">{sendError}</p>}
                  {visibleConnectionState === 'reconnecting' && <p role="status" className="mb-2 text-xs text-amber-700 dark:text-amber-300">Reconnecting to the secure chat…</p>}
                  <div className="flex items-end gap-2">
                    <label className="sr-only" htmlFor="message-composer">Message</label>
                    <textarea id="message-composer" rows={2} maxLength={4000} value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a private message…" className="min-h-11 min-w-0 flex-1 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0f9d8a] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                    <button type="submit" disabled={!messageText.trim() || visibleConnectionState !== 'connected'} aria-label="Send message" title="Send message" className="grid size-10 shrink-0 place-items-center rounded-md bg-[#0f9d8a] text-white hover:bg-[#0b8878] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /></button>
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-400">{messageText.length}/4000</p>
                </form>
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}

function PageHeading({ unreadCount, isExternalMentor }: { unreadCount: number; isExternalMentor: boolean }) {
  const title = isExternalMentor ? 'Private student messages' : 'Messages'
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-medium text-[#0f9d8a]">{isExternalMentor ? 'External mentor workspace' : 'Student workspace'}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isExternalMentor ? 'Private conversations with students who shared work with you.' : 'Private conversations with your external mentors.'}</p></div>
      {unreadCount > 0 && <span className="rounded-sm bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">{unreadCount} unread</span>}
    </div>
  )
}

function ThreadButton({ thread, selected, onClick }: { thread: MessageThreadSummary; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined} className={`w-full px-4 py-3 text-left transition-colors ${selected ? 'bg-teal-50/80 dark:bg-teal-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
        <span className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{thread.participantName}</span><span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">Submission {thread.submissionId.slice(0, 8)}</span></span>{thread.unreadCount > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#0f9d8a] text-[10px] font-semibold text-white">{thread.unreadCount}</span>}</span>
      </button>
    </li>
  )
}

function MessageBubble({ message, isOwn }: { message: MessageView; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <article className={`max-w-[min(34rem,88%)] rounded-lg px-3.5 py-2.5 ${isOwn ? 'bg-[#14213d] text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p>
        <p className={`mt-1 text-right text-[10px] ${isOwn ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{formatTime(message.sentAt)}</p>
      </article>
    </div>
  )
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const isConnected = state === 'connected'
  const label = isConnected ? 'Live' : state === 'failed' ? 'Unavailable' : state === 'reconnecting' ? 'Reconnecting' : 'Connecting'
  return (
    <span role="status" className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${isConnected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}>
      {isConnected ? <span className="size-1.5 rounded-full bg-teal-500" /> : state === 'failed' ? <MessageSquareText size={13} /> : <LoaderCircle size={13} className="animate-spin" />}
      {label}
    </span>
  )
}