import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DispatchStatusBadge, formatDispatchDateTime } from './dispatchUi'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'
import { strings } from '../../i18n/strings'
import { dispatchToastMessage } from '../../lib/dispatchToast'
import { AiEstimatePanel } from '../common/AiEstimatePanel'
import { DispatchDriverSuggestList } from './DispatchDriverSuggestList'
import { useAiRouteEstimate } from '../../hooks/useAiRouteEstimate'
import {
  assignRideToDriver,
  isDispatchRideAwaitingAssignment,
  suggestDriversForRequest,
} from '../../services/dispatcherApi'
import type { DispatchRideRow } from '../../services/dispatcherApi'
import { useToastStore } from '../../store/notificationStore'

const assignCardHighlight = `${passengerAppCardClassName} ring-2 ring-brand-yellow/50`

export function DispatcherRideAssignPanel({
  dispatcherAccountId,
  selectedRow,
  availableDrivers = 0,
  onClearSelection,
  onAssigned,
}: {
  dispatcherAccountId: string
  selectedRow: DispatchRideRow | null
  availableDrivers?: number
  onClearSelection: () => void
  onAssigned: () => void
}) {
  const t = strings()
  const r = t.dispatcher.rides
  const c = t.dispatcher.common
  const toast = t.dispatcher.toast
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const awaitingAssignment = Boolean(selectedRow && isDispatchRideAwaitingAssignment(selectedRow))
  const requestId = awaitingAssignment ? selectedRow!.request.id : ''

  const suggestionsQ = useQuery({
    queryKey: ['dispatchDriverSuggestions', requestId],
    queryFn: () => suggestDriversForRequest(requestId),
    enabled: Boolean(requestId),
  })

  const aiQ = useAiRouteEstimate(
    awaitingAssignment ? selectedRow?.request.pickup : undefined,
    awaitingAssignment ? selectedRow?.request.destination : undefined,
    {
      availableDrivers,
      orderType: selectedRow?.request.orderType,
      scheduledAt: selectedRow?.request.scheduledAt,
    },
  )
  const aiEstimate = aiQ.data && !('error' in aiQ.data) ? aiQ.data : null
  const aiError = aiQ.data && 'error' in aiQ.data ? aiQ.data.error : null

  const assignMut = useMutation({
    mutationFn: (driverId: string) => assignRideToDriver(dispatcherAccountId, requestId, driverId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(dispatchToastMessage(res.error, t), 'error')
        return
      }
      push(toast.rideAssigned, 'success')
      await qc.invalidateQueries({ queryKey: ['dispatchSnapshot', dispatcherAccountId] })
      await qc.invalidateQueries({ queryKey: ['dispatchDriverSuggestions', requestId] })
      onAssigned()
    },
  })

  if (!selectedRow) {
    return (
      <Card className={passengerAppCardClassName}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{r.assignPanelTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-brand-navy">{r.assignPanelEmpty}</p>
          <p className="mt-2 text-sm text-slate-600">{r.assignPanelEmptyHint}</p>
        </CardContent>
      </Card>
    )
  }

  const detailPath = `/dispatch/rides/${selectedRow.ride?.id ?? selectedRow.request.id}`

  if (selectedRow.ride?.driverId) {
    return (
      <Card className={passengerAppCardClassName}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{r.assignPanelTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="font-bold text-brand-navy">{r.assignPanelAssigned}</p>
            <p className="mt-1 text-sm text-slate-600">{r.assignPanelAssignedHint}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-brand-navy">
              {selectedRow.pickupLabel} → {selectedRow.destinationLabel}
            </p>
            <p className="text-slate-600">
              {selectedRow.passengerName} · {selectedRow.driverName}
            </p>
            <DispatchStatusBadge status={selectedRow.status} />
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild variant="cta">
              <Link to={detailPath}>{r.openRideDetail}</Link>
            </Button>
            <Button type="button" variant="outlineThin" onClick={onClearSelection}>
              {r.changeSelection}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={assignCardHighlight}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span>{r.assignPanelTitle}</span>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection}>
            {r.changeSelection}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-brand-yellow/40 bg-brand-yellow/15 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-brand-navy">
            <UserRound className="h-4 w-4 shrink-0" />
            {selectedRow.passengerName}
          </p>
          <p className="mt-1 text-slate-600">{selectedRow.passengerPhone}</p>
          <p className="mt-3 flex items-start gap-2 font-semibold text-brand-navy">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
            <span>
              {selectedRow.pickupLabel}
              <ArrowRight className="mx-1 inline h-3.5 w-3.5" />
              {selectedRow.destinationLabel}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {formatDispatchDateTime(selectedRow.createdAt)} · {selectedRow.distanceKm.toFixed(1)} km ·{' '}
            {selectedRow.estimatedPrice.toFixed(2)} BAM
          </p>
          <div className="mt-2">
            <DispatchStatusBadge status={selectedRow.status} />
          </div>
        </div>

        <AiEstimatePanel
          estimate={aiEstimate}
          isLoading={aiQ.isFetching && !aiEstimate}
          errorKey={aiError}
          variant="compact"
        />

        <DispatchDriverSuggestList
          drivers={suggestionsQ.data}
          pickup={selectedRow.request.pickup}
          availableDrivers={availableDrivers}
          aiEstimate={aiEstimate}
          isLoading={suggestionsQ.isLoading}
          assignPending={assignMut.isPending}
          onAssign={(driverId) => assignMut.mutate(driverId)}
          assignLabel={r.confirmAssign}
          emptyMessage={r.noDriversForRequest}
        />

        <Button asChild variant="outlineThin" className="w-full">
          <Link to={detailPath}>{c.details}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
