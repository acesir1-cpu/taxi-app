import { Activity, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LoadingState } from '../components/common/LoadingState'
import { formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { cn } from '../lib/utils'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { DispatchLogKind } from '../types/domain'

const kinds: Array<DispatchLogKind | 'sve'> = ['sve', 'auth', 'ride', 'driver', 'complaint', 'anomaly', 'rbac', 'note', 'system']

export function DispatcherActivityPage() {
  useLangRefresh()
  const t = strings()
  const a = t.dispatcher.activity
  const logKind = t.dispatcher.logKind
  const c = t.dispatcher.common
  const { me } = useDispatcherSession()
  const [kind, setKind] = useState<DispatchLogKind | 'sve'>('sve')
  const [query, setQuery] = useState('')
  const { data, isPending } = useDispatchData()

  const logs = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.logs.filter((log) => {
      if (kind !== 'sve' && log.kind !== kind) return false
      if (!q) return true
      return (
        log.message.toLowerCase().includes(q) ||
        log.rideId?.toLowerCase().includes(q) ||
        log.driverId?.toLowerCase().includes(q) ||
        log.complaintId?.toLowerCase().includes(q)
      )
    })
  }, [data, kind, query])

  if (isPending && !data) return <LoadingState />

  return (
    <Card className={passengerAppCardClassName}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {a.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={a.searchPlaceholder} />
          </div>
          <div className="flex flex-wrap gap-2">
            {kinds.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-bold transition',
                  kind === item ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700 hover:text-brand-navy',
                )}
                onClick={() => setKind(item)}
              >
                {logKind[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {logs.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-600">{a.empty}</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="grid gap-2 px-4 py-3 text-sm lg:grid-cols-[9rem_8rem_1fr] lg:items-start">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{formatDispatchDateTime(log.createdAt)}</span>
                <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{logKind[log.kind]}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-brand-navy">{log.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      log.rideId && a.metaRide.replace('{id}', log.rideId),
                      log.requestId && a.metaRequest.replace('{id}', log.requestId),
                      log.driverId && a.metaDriver.replace('{id}', log.driverId),
                      log.complaintId && a.metaComplaint.replace('{id}', log.complaintId),
                    ]
                      .filter(Boolean)
                      .join(' · ') || c.centralLog}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
