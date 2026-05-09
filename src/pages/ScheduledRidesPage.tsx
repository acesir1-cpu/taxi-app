import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Clock3, MapPin, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Location, RideRequest } from '../types/domain'
import {
  cancelRideRequest,
  getScheduledRideRequests,
  updateScheduledRideRequest,
} from '../services/rideApi'
import { LocationSearch } from '../components/ride/LocationSearch'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToastStore } from '../store/notificationStore'

export function ScheduledRidesPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [editing, setEditing] = useState<RideRequest | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<RideRequest | null>(null)

  const scheduledQ = useQuery({
    queryKey: ['scheduledRequests', me.profile.id],
    queryFn: () => getScheduledRideRequests(me.profile.id),
  })

  const cancelMut = useMutation({
    mutationFn: (requestId: string) => cancelRideRequest(requestId, me.account.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['scheduledRequests', me.profile.id] })
      push(t.notifications.rideCancelled, 'success')
      push(t.order.scheduledManageDesc, 'info')
    },
    onError: () => {
      push(`${t.common.error} ${t.common.retry}`, 'error')
    },
  })

  const requests = useMemo(() => scheduledQ.data ?? [], [scheduledQ.data])

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[1200px] space-y-4',
        'max-lg:-mx-4 max-lg:min-h-[100dvh] max-lg:px-4 max-lg:pb-6 sm:max-lg:-mx-6 sm:max-lg:px-6',
        'lg:mx-auto lg:min-h-0 lg:pb-0'
      )}
    >
      <h1 className="text-xl font-bold text-brand-navy lg:px-4">{t.nav.scheduled}</h1>

      {scheduledQ.isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : requests.length === 0 ? (
        <div className="min-h-[calc(100dvh-var(--mobile-nav-height,5.25rem)-34rem)] md:min-h-0">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <CalendarClock className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-bold text-brand-navy">{t.order.scheduledEmptyTitle}</h2>
              <p className="max-w-xs text-sm text-slate-600">{t.order.scheduledEmptyHint}</p>
              <Button type="button" className="mt-1" onClick={() => navigate('/app/order')}>
                {t.order.scheduleRide}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid min-h-[calc(100dvh-var(--mobile-nav-height,5.25rem)-34rem)] grid-cols-1 items-start gap-3 md:min-h-0 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
              <Card
              key={request.id}
                className="group flex flex-col rounded-[18px] border-slate-200/90 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <CardHeader className="space-y-2 pb-0 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base text-brand-navy md:block md:text-base max-md:hidden">{t.order.scheduleRide}</CardTitle>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 md:inline-flex max-md:hidden">
                    {t.order.schedule}
                  </span>
                  <p className="truncate text-[1rem] font-bold text-brand-navy md:hidden">
                    {request.pickup.label} {'\u2192'} {request.destination.label}
                  </p>
                  <span className={statusBadgeClass(request.status)}>
                    {request.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2.5 pt-3 text-sm">
                <p className="truncate font-semibold text-brand-navy md:block max-md:hidden">
                  {request.pickup.label} {'\u2192'} {request.destination.label}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p className="truncate text-xs font-medium text-slate-700">{request.pickup.label}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 text-rose-600" />
                    <p className="truncate text-xs font-medium text-slate-700">{request.destination.label}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
                    <Clock3 className="h-3.5 w-3.5" />
                    {request.scheduledAt ? formatDateTime(request.scheduledAt) : t.order.notAvailable}
                  </p>
                  <p className="text-xs font-bold text-indigo-700">{request.estimatedPrice.toFixed(2)} BAM</p>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    className="flex h-10 min-h-0 flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-transparent text-sm font-semibold text-brand-navy transition active:scale-[0.98]"
                    onClick={() => setEditing(request)}
                  >
                    <PencilLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t.common.edit}
                  </button>
                  <button
                    type="button"
                    className="flex h-10 min-h-0 flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[#FECACA] bg-transparent text-sm font-semibold text-[#EF4444] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    disabled={cancelMut.isPending}
                    onClick={() => setCancelConfirm(request)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t.ride.cancel}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <EditScheduledRideModal
          request={editing}
          accountId={me.account.id}
          passengerProfileId={me.profile.id}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await qc.invalidateQueries({ queryKey: ['scheduledRequests', me.profile.id] })
          }}
        />
      ) : null}
      {cancelConfirm ? (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-brand-navy">{t.ride.cancel}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {cancelConfirm.pickup.label} → {cancelConfirm.destination.label}
            </p>
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {t.history.deleteRideWarning}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t.order.scheduledManageDesc}</p>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="secondary" className="w-full" onClick={() => setCancelConfirm(null)}>
                {t.common.close}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={cancelMut.isPending}
                onClick={() => {
                  cancelMut.mutate(cancelConfirm.id)
                  setCancelConfirm(null)
                }}
              >
                {t.ride.confirmCancelRide}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 -z-10"
            aria-label={t.common.close}
            onClick={() => setCancelConfirm(null)}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="fixed z-[105] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#F5A623] text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] lg:hidden"
        style={{
          bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
          right: 20,
        }}
        aria-label={t.order.scheduleRide}
        onClick={() => navigate('/app/order', { state: { focusSchedule: true } })}
      >
        <Plus className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}

function EditScheduledRideModal({
  request,
  accountId,
  passengerProfileId,
  onClose,
  onSaved,
}: {
  request: RideRequest
  accountId: string
  passengerProfileId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const t = strings()
  const [pickup, setPickup] = useState<Location | null>(request.pickup)
  const [destination, setDestination] = useState<Location | null>(request.destination)
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    request.scheduledAt ? toLocalDateTimeValue(new Date(request.scheduledAt)) : ''
  )

  const editMut = useMutation({
    mutationFn: async () => {
      if (!pickup || !destination || !scheduledLocal) throw new Error('invalid')
      return updateScheduledRideRequest({
        requestId: request.id,
        accountId,
        passengerProfileId,
        pickup,
        destination,
        scheduledAt: new Date(scheduledLocal).toISOString(),
      })
    },
    onSuccess: async (res) => {
      if ('error' in res) return
      await onSaved()
    },
  })

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-navy">{t.order.editScheduledRide}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LocationSearch
            label={t.order.pickup}
            value={pickup}
            onChange={setPickup}
            placeholder={t.order.addressPlaceholder}
            emptyHint={t.order.geocodeEmpty}
          />
          <LocationSearch
            label={t.order.destination}
            value={destination}
            onChange={setDestination}
            placeholder={t.order.addressPlaceholder}
            emptyHint={t.order.geocodeEmpty}
          />
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="sched-edit">{t.order.scheduleDateLabel}</Label>
          <Input
            id="sched-edit"
            type="datetime-local"
            value={scheduledLocal}
            min={toLocalDateTimeValue(new Date())}
            onChange={(e) => setScheduledLocal(e.target.value)}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={editMut.isPending || !pickup || !destination || !scheduledLocal}
            onClick={() => editMut.mutate()}
          >
            {editMut.isPending ? t.common.loading : t.common.save}
          </Button>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label={t.common.close} onClick={onClose} />
    </div>
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${y}-${m}-${d}T${h}:${min}`
}

function statusBadgeClass(status: string): string {
  const base =
    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide md:hidden'
  if (status === 'dodijeljen') return `${base} bg-emerald-100 text-emerald-700`
  if (status === 'otkazan') return `${base} bg-rose-100 text-rose-700`
  return `${base} bg-blue-100 text-blue-700`
}
