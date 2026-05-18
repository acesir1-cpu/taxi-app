import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../components/common/LoadingState'
import { DispatchStatusBadge, formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { complaintStatusLabel } from '../lib/passengerStatusLabels'
import { dispatchToastMessage } from '../lib/dispatchToast'
import { acknowledgeAnomaly, updateComplaintStatus } from '../services/dispatcherApi'
import { useToastStore } from '../store/notificationStore'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { ComplaintStatus } from '../types/domain'

const complaintStatuses: ComplaintStatus[] = ['zaprimljena', 'u_obradi', 'rijesena', 'odbijena', 'nepotpuna']

export function DispatcherProblemsPage() {
  useLangRefresh()
  const t = strings()
  const p = t.dispatcher.problems
  const c = t.dispatcher.common
  const toast = t.dispatcher.toast
  const { me } = useDispatcherSession()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [outcome, setOutcome] = useState<string>(p.defaultOutcome)
  const { data, isPending } = useDispatchData()

  const updateMut = useMutation({
    mutationFn: (payload: { complaintId: string; status: ComplaintStatus }) =>
      updateComplaintStatus(me.account.id, payload.complaintId, payload.status, outcome),
    onSuccess: async (res) => {
      if ('error' in res) push(dispatchToastMessage(res.error, t), 'error')
      else push(toast.complaintUpdated, 'success')
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    },
  })

  const ackMut = useMutation({
    mutationFn: (id: string) => acknowledgeAnomaly(me.account.id, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    },
  })

  if (isPending && !data) return <LoadingState />

  const problemRides = data.rides.filter((row) =>
    ['problematicna', 'neuspjesna', 'neuspjesan', 'otkazana', 'otkazan'].includes(row.status),
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-5">
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              {p.complaintsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={p.outcomePlaceholder} />
            {data.complaints.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{p.noComplaints}</p>
            ) : (
              data.complaints.map((complaint) => {
                const ride = data.rides.find((row) => row.ride?.id === complaint.rideId || row.request.id === complaint.rideId)
                return (
                  <div key={complaint.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy">{complaint.category}</p>
                        <p className="mt-1 text-sm text-slate-600">{complaint.description}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{formatDispatchDateTime(complaint.createdAt)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {complaintStatusLabel(complaint.status, t.history.complaintStatuses)}
                      </span>
                    </div>
                    {ride ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        {p.rideLine
                          .replace('{route}', `${ride.pickupLabel} → ${ride.destinationLabel}`)
                          .replace('{passenger}', ride.passengerName)}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {complaintStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={status === 'rijesena' ? 'success' : status === 'odbijena' ? 'danger' : 'secondary'}
                          disabled={updateMut.isPending}
                          onClick={() => updateMut.mutate({ complaintId: complaint.id, status })}
                        >
                          {complaintStatusLabel(status, t.history.complaintStatuses)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {p.problemRidesTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {problemRides.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{p.noProblemRides}</p>
            ) : (
              problemRides.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-brand-navy">
                        {row.pickupLabel} → {row.destinationLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {row.passengerName} · {row.driverName ?? c.noDriver}
                      </p>
                    </div>
                    <DispatchStatusBadge status={row.status} />
                  </div>
                  <Button asChild className="mt-3" size="sm" variant="outlineThin">
                    <Link to={`/dispatch/rides/${row.ride?.id ?? row.request.id}`}>{p.openDetails}</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <aside>
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{p.warningsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.anomalies.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{p.noWarnings}</p>
            ) : (
              data.anomalies.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <p className="font-bold text-brand-navy">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400">{item.acknowledged ? p.acknowledged : p.open}</span>
                    {!item.acknowledged ? (
                      <Button size="sm" variant="secondary" disabled={ackMut.isPending} onClick={() => ackMut.mutate(item.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {c.confirm}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
