import { Calendar, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AppMessages } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import {
  groupNotificationsByDay,
  notificationDayBucket,
  type NotificationDayBucket,
} from '../../lib/notificationDateBuckets'
import { notificationDisplay } from '../../services/notificationApi'
import { notificationIconVisual } from '../../lib/notificationVisuals'
import type { AppNotification } from '../../types/notifications'

const BUCKET_ORDER: NotificationDayBucket[] = ['today', 'yesterday', 'thisWeek', 'older']

function bucketLabel(bucket: NotificationDayBucket, t: AppMessages): string {
  switch (bucket) {
    case 'today':
      return t.notifications.sectionToday
    case 'yesterday':
      return t.notifications.sectionYesterday
    case 'thisWeek':
      return t.notifications.sectionThisWeek
    default:
      return t.notifications.sectionOlder
  }
}

function formatListTime(iso: string): string {
  const b = notificationDayBucket(iso)
  if (b === 'today') {
    return new Date(iso).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })
  }
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMinutes < 60) return `prije ${diffMinutes} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `prije ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  return `prije ${diffDays} d`
}

function SwipeDeleteRow({
  onDelete,
  children,
}: {
  onDelete: () => void
  children: (bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
    style: React.CSSProperties
  }) => React.ReactNode
}) {
  const [dx, setDx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const active = useRef(false)
  const dxRef = useRef(0)

  function endDrag() {
    if (!active.current) return
    active.current = false
    setIsDragging(false)
    if (dxRef.current < -56) {
      onDelete()
    }
    dxRef.current = 0
    setDx(0)
  }

  return (
    <div className="relative overflow-hidden border-b border-slate-200/80 last:border-b-0">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-red-600"
        aria-hidden
      >
        <Trash2 className="h-5 w-5 text-white" />
      </div>
      {children({
        style: {
          transform: `translateX(${dx}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        },
        onPointerDown: (e: React.PointerEvent) => {
          active.current = true
          setIsDragging(true)
          startX.current = e.clientX
        },
        onPointerMove: (e: React.PointerEvent) => {
          if (!active.current) return
          const next = Math.min(0, e.clientX - startX.current)
          dxRef.current = next
          setDx(next)
        },
        onPointerUp: () => endDrag(),
        onPointerCancel: () => endDrag(),
      })}
    </div>
  )
}

export function NotificationDropdownList({
  notifications,
  t,
  maxItems = 500,
  onItemActivate,
  onItemDelete,
}: {
  notifications: AppNotification[]
  t: AppMessages
  maxItems?: number
  onItemActivate: (n: AppNotification) => void | Promise<void>
  onItemDelete?: (n: AppNotification) => void | Promise<void>
}) {
  if (notifications.length === 0) {
    return (
      <li className="list-none px-4 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Calendar className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold text-brand-navy">{t.notifications.emptyTitle}</p>
          <p className="max-w-xs text-[13px] leading-snug text-[#6B7280]">{t.notifications.emptyBody}</p>
        </div>
      </li>
    )
  }

  const slice = notifications.slice(0, maxItems)
  const grouped = groupNotificationsByDay(slice)
  const sections = BUCKET_ORDER.map((bucket) => ({ bucket, items: grouped[bucket] })).filter(
    (s) => s.items.length > 0
  )

  return (
    <>
      {sections.map(({ bucket, items }) => (
        <li key={bucket} className="list-none">
          <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {bucketLabel(bucket, t)}
          </div>
          <ul className="list-none">
            {items.map((n) => {
              const { title: nTitle, body: nBody } = notificationDisplay(n, t)
              const titleText = (nTitle || nBody).trim()
              const bodyText = nBody.trim()
              const subline =
                titleText && bodyText && bodyText !== titleText ? bodyText : bodyText && !titleText ? bodyText : ''
              const { Icon, bg, iconClass } = notificationIconVisual(n.icon)
              const row = (
                <button
                  type="button"
                  className={cn(
                    'flex min-h-[72px] w-full items-center gap-3 bg-white px-4 py-2 text-left transition-colors',
                    n.read ? 'hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/70'
                  )}
                  onClick={() => void onItemActivate(n)}
                >
                  <span
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{ width: 40, height: 40, backgroundColor: bg }}
                    aria-hidden
                  >
                    <Icon className={cn('h-5 w-5', iconClass)} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block line-clamp-2 text-[14px] font-semibold text-brand-navy">{titleText}</span>
                      {subline ? (
                        <span className="mt-0.5 block line-clamp-2 text-[12px] leading-snug text-[#6B7280]">
                          {subline}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11px] text-[#9CA3AF]">{formatListTime(n.createdAt)}</span>
                    </span>
                    {!n.read ? (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: '#10B981' }}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              )

              if (!onItemDelete) {
                return (
                  <li key={n.id} className="list-none border-b border-slate-200/80 last:border-b-0">
                    {row}
                  </li>
                )
              }

              return (
                <li key={n.id} className="list-none">
                  <SwipeDeleteRow onDelete={() => void onItemDelete(n)}>
                    {(bind) => (
                      <div
                        className="relative touch-pan-y bg-white"
                        style={bind.style}
                        onPointerDown={bind.onPointerDown}
                        onPointerMove={bind.onPointerMove}
                        onPointerUp={bind.onPointerUp}
                        onPointerCancel={bind.onPointerCancel}
                      >
                        {row}
                      </div>
                    )}
                  </SwipeDeleteRow>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </>
  )
}
