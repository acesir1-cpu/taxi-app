import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../ui/badge'
import { Banknote, CarFront, Clock, MapPin, Navigation, User } from 'lucide-react'
import type { DriverUiState } from '../../types/domain'
import { driverAcceptRequest, driverRejectRequest, scheduleNewRequestAfterReject } from '../../services/driverSessionApi'
import { useToastStore } from '../../store/notificationStore'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'
import { useEffect, useState } from 'react'
import { RejectRideModal } from './RejectRideModal'
import { cn } from '../../lib/utils'
import { loadRidePrefs } from '../../lib/driverSettingsPrefs'

export function DriverNewRideCard({ accountId, ui }: { accountId: string; ui: DriverUiState }) {
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [ridePrefs, setRidePrefs] = useState(() => loadRidePrefs(accountId))
  useEffect(() => {
    setRidePrefs(loadRidePrefs(accountId))
  }, [accountId])
  useEffect(() => {
    const fn = () => setRidePrefs(loadRidePrefs(accountId))
    window.addEventListener('urbanflow:driver-prefs-changed', fn)
    return () => window.removeEventListener('urbanflow:driver-prefs-changed', fn)
  }, [accountId])
  const req = ui.pendingRequest
  const distanceWarn =
    req && ridePrefs.maxDistanceKm > 0 && req.distanceToPassengerKm > ridePrefs.maxDistanceKm + 1e-6
  const preShift = ui.availabilityStatus === 'van_smjene'
  const canAccept = ui.availabilityStatus === 'dostupan' && req && !ui.activeRide

  const emptyHint = preShift
    ? 'Započnite smjenu da biste primali nove ponude.'
    : ui.availabilityStatus === 'dostupan'
      ? 'Trenutno nema novih zahtjeva. Nova ponuda stiže kada sistem pronađe vožnju za vas.'
      : 'Za prijem vožnji morate biti dostupni.'

  const acceptMut = useMutation({
    mutationFn: () => driverAcceptRequest(accountId),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      push('Vožnja prihvaćena.', 'success')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: (p: { reason: Parameters<typeof driverRejectRequest>[1]; note?: string }) =>
      driverRejectRequest(accountId, p.reason, p.note),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      setRejectOpen(false)
      push('Zahtjev odbijen. Sistem traži drugog vozača.', 'info')
      await qc.invalidateQueries({ queryKey: ['driverUi', accountId] })
      void scheduleNewRequestAfterReject(accountId)
    },
  })

  return (
    <>
      <Card
        aria-disabled={preShift}
        className={cn(
          passengerAppCardClassName,
          'transition-colors',
          preShift &&
            'pointer-events-none select-none border-slate-200 bg-slate-100/95 text-slate-500 shadow-none grayscale-[0.35]',
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className={cn(preShift ? 'text-slate-500' : undefined)}>Nova vožnja</CardTitle>
            {req ? (
              <Badge
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold',
                  preShift
                    ? 'border-slate-200 bg-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'border-slate-200/90 bg-brand-yellow text-brand-navy hover:bg-brand-yellow',
                )}
              >
                NOVO
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!req ? (
            <div
              className={cn(
                'rounded-2xl border border-dashed p-4',
                preShift ? 'border-slate-300 bg-slate-200/70 text-slate-500' : 'border-slate-200 bg-slate-50/70 text-slate-600'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('rounded-xl p-2', preShift ? 'bg-slate-300/70' : 'bg-slate-200/70')}>
                  <CarFront className="h-4 w-4" />
                </div>
                <p className="text-sm">{emptyHint}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 rounded-2xl bg-slate-50/90 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-slate-600">Preuzimanje</p>
                    <p className="font-semibold text-brand-navy">{req.pickup.label}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-slate-600">Odredište</p>
                    <p className="font-semibold text-brand-navy">{req.destination.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{req.distanceToPassengerKm} km do putnika</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>ETA {req.etaToPickupMin} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Banknote className="h-3.5 w-3.5" />
                    <span>{req.estimatedPrice.toFixed(2)} BAM</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="h-3.5 w-3.5" />
                    <span>{req.passengerName}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Plaćanje: <span className="font-semibold text-brand-navy">{req.paymentMethod}</span> · Tip:{' '}
                  <span className="font-semibold capitalize">{req.type}</span>
                </p>
                {distanceWarn ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-900">
                    Upozorenje: udaljenost do putnika ({req.distanceToPassengerKm} km) prelazi vašu postavku maksimalne
                    udaljenosti ({ridePrefs.maxDistanceKm} km). I dalje možete prihvatiti vožnju.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="cta"
                  className="h-11 min-h-[44px] flex-1"
                  disabled={!canAccept || acceptMut.isPending}
                  onClick={() => acceptMut.mutate()}
                >
                  Prihvati
                </Button>
                <Button
                  variant="outlineThin"
                  className="min-h-11 flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={rejectMut.isPending || !req}
                  onClick={() => setRejectOpen(true)}
                >
                  Odbij
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <RejectRideModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        loading={rejectMut.isPending}
        onConfirm={(reason, note) => rejectMut.mutate({ reason, note })}
      />
    </>
  )
}
