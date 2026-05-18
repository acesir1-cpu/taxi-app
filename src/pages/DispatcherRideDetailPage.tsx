import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Ban, Car, MessageSquare, RefreshCw, Route, User, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AiEstimatePanel } from '../components/common/AiEstimatePanel'
import { LoadingState } from '../components/common/LoadingState'
import { DispatchFleetMap } from '../components/dispatch/DispatchFleetMap'
import { DispatchDriverSuggestList } from '../components/dispatch/DispatchDriverSuggestList'
import { DispatchStatusBadge, formatDispatchDateTime } from '../components/dispatch/dispatchUi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { useAiRouteEstimate } from '../hooks/useAiRouteEstimate'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { strings } from '../i18n/strings'
import { dispatchToastMessage } from '../lib/dispatchToast'
import {
  appendDispatchLog,
  assignRideToDriver,
  cancelRideByDispatcher,
  dispatcherCan,
  markRideProblematic,
  reassignRide,
  suggestDriversForRequest,
} from '../services/dispatcherApi'
import { useToastStore } from '../store/notificationStore'
import { useDispatcherSession } from '../hooks/useDispatcherSession'

export function DispatcherRideDetailPage() {
  useLangRefresh()
  const t = strings()
  const d = t.dispatcher.rideDetail
  const c = t.dispatcher.common
  const toast = t.dispatcher.toast
  const { id = '' } = useParams()
  const { me } = useDispatcherSession()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [reason, setReason] = useState<string>(d.defaultCancelReason)
  const [note, setNote] = useState('')
  const { data, isPending } = useDispatchData()
  const row = useMemo(() => data?.rides.find((item) => item.id === id || item.request.id === id || item.ride?.id === id) ?? null, [data, id])

  const aiQ = useAiRouteEstimate(row?.request.pickup, row?.request.destination, {
    availableDrivers: data?.kpis.availableDrivers ?? 0,
    orderType: row?.request.orderType,
    scheduledAt: row?.request.scheduledAt,
  })
  const aiEstimate = aiQ.data && !('error' in aiQ.data) ? aiQ.data : null
  const aiError = aiQ.data && 'error' in aiQ.data ? aiQ.data.error : null

  const suggestionsQ = useQuery({
    queryKey: ['dispatchDriverSuggestions', row?.request.id],
    queryFn: () => suggestDriversForRequest(row!.request.id),
    enabled: Boolean(row?.request.id),
  })

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', me.account.id] })
    if (row?.request.id) await qc.invalidateQueries({ queryKey: ['dispatchDriverSuggestions', row.request.id] })
  }

  const assignMut = useMutation({
    mutationFn: (driverId: string) =>
      row?.ride ? reassignRide(me.account.id, row.ride.id, driverId) : assignRideToDriver(me.account.id, row!.request.id, driverId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(dispatchToastMessage(res.error, t), 'error')
        return
      }
      push(row?.ride ? toast.rideReassigned : toast.rideAssignedShort, 'success')
      await refresh()
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelRideByDispatcher(me.account.id, row!.ride!.id, reason),
    onSuccess: async (res) => {
      if ('error' in res) push(dispatchToastMessage(res.error, t), 'error')
      else push(toast.rideCancelled, 'info')
      await refresh()
    },
  })

  const problemMut = useMutation({
    mutationFn: () => markRideProblematic(me.account.id, row!.ride!.id, note || d.defaultProblemNote),
    onSuccess: async (res) => {
      if ('error' in res) push(dispatchToastMessage(res.error, t), 'error')
      else push(toast.rideMarkedProblem, 'success')
      await refresh()
    },
  })

  const noteMut = useMutation({
    mutationFn: () =>
      appendDispatchLog({
        dispatcherAccountId: me.account.id,
        kind: 'note',
        message: note.trim() || d.emptyNoteFallback,
        rideId: row?.ride?.id,
        requestId: row?.request.id,
        driverId: row?.ride?.driverId,
      }),
    onSuccess: async () => {
      setNote('')
      push(toast.noteLogged, 'success')
      await refresh()
    },
  })

  if (isPending && !data) return <LoadingState />
  if (!data) return <LoadingState />
  if (!row) {
    return (
      <Card className={passengerAppCardClassName}>
        <CardContent className="py-10 text-center">
          <p className="font-semibold text-brand-navy">{d.notFound}</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link to="/dispatch/rides">{d.backToRides}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canResolve = dispatcherCan(me.dispatcherProfile.roleLevel, 'cancel_or_resolve_ride')

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-5">
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {row.pickupLabel} → {row.destinationLabel}
              </span>
              <DispatchStatusBadge status={row.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DispatchFleetMap drivers={data.drivers} rides={[row]} showRideRoutes className="min-h-[430px]" />
            <AiEstimatePanel
              estimate={aiEstimate}
              isLoading={aiQ.isFetching && !aiEstimate}
              errorKey={aiError}
            />
            <div className="grid gap-3 md:grid-cols-4">
              <InfoTile icon={<User className="h-4 w-4" />} label={d.passenger} value={row.passengerName} sub={row.passengerPhone} />
              <InfoTile icon={<Car className="h-4 w-4" />} label={d.driver} value={row.driverName ?? c.unassigned} sub={row.vehicleLabel ?? d.awaitingAssign} />
              <InfoTile icon={<Route className="h-4 w-4" />} label={d.route} value={`${row.distanceKm.toFixed(1)} km`} sub={`${row.request.estimatedDurationMin} min`} />
              <InfoTile
                icon={<Wallet className="h-4 w-4" />}
                label={d.price}
                value={`${row.estimatedPrice.toFixed(2)} BAM`}
                sub={row.request.orderType === 'zakazano' ? c.scheduled : c.immediate}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{d.timelineTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TimelineItem label={d.timelineCreated} time={row.request.createdAt} />
            {row.ride?.assignedAt ? <TimelineItem label={d.timelineAssigned} time={row.ride.assignedAt} /> : null}
            {row.ride?.driverArrivedAt ? <TimelineItem label={d.timelineArrived} time={row.ride.driverArrivedAt} /> : null}
            {row.ride?.startedAt ? <TimelineItem label={d.timelineStarted} time={row.ride.startedAt} /> : null}
            {row.ride?.finishedAt ? <TimelineItem label={d.timelineFinished} time={row.ride.finishedAt} /> : null}
            {row.ride?.cancelledAt ? <TimelineItem label={d.timelineCancelled} time={row.ride.cancelledAt} /> : null}
            <div className="space-y-2 pt-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={d.notePlaceholder} />
              <Button variant="secondary" disabled={noteMut.isPending} onClick={() => noteMut.mutate()}>
                <MessageSquare className="h-4 w-4" />
                {d.logNote}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5" />
              {d.assignTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DispatchDriverSuggestList
              drivers={suggestionsQ.data}
              pickup={row.request.pickup}
              availableDrivers={data?.kpis.availableDrivers ?? 0}
              aiEstimate={aiEstimate}
              isLoading={suggestionsQ.isLoading}
              assignPending={assignMut.isPending}
              onAssign={(driverId) => assignMut.mutate(driverId)}
              assignLabel={row.ride ? d.reassign : c.assign}
              emptyMessage={d.noFreeDrivers}
            />
          </CardContent>
        </Card>

        <Card className={passengerAppCardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5" />
              {d.interventionTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={d.cancelReasonPlaceholder} />
            <Button className="w-full" variant="outlineThin" disabled={!row.ride || !canResolve || cancelMut.isPending} onClick={() => cancelMut.mutate()}>
              <Ban className="h-4 w-4" />
              {d.cancelRide}
            </Button>
            <Button className="w-full text-red-700 hover:text-red-800" variant="outlineThin" disabled={!row.ride || !canResolve || problemMut.isPending} onClick={() => problemMut.mutate()}>
              <AlertCircle className="h-4 w-4" />
              {d.markProblematic}
            </Button>
            {!canResolve ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{d.interventionLocked}</p>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function InfoTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate font-bold text-brand-navy">{value}</p>
      {sub ? <p className="truncate text-xs text-slate-500">{sub}</p> : null}
    </div>
  )
}

function TimelineItem({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm">
      <span className="font-semibold text-brand-navy">{label}</span>
      <span className="text-xs font-semibold text-slate-500">{formatDispatchDateTime(time)}</span>
    </div>
  )
}
