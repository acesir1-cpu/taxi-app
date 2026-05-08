import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lazy, Suspense, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ChevronDown, User, Banknote, MapPin, Navigation } from 'lucide-react'
import { LoadingState } from '../components/common/LoadingState'
import { DriverRideFlowCard } from '../components/driver/DriverRideFlowCard'
import { MapChunkFallback } from '../components/map/MapChunkFallback'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useDriverRideMapSimulation } from '../hooks/useDriverRideMapSimulation'
import { demoGlassDividerClass, demoGlassPanelClass } from '../lib/demoGlassPanel'
import { cn } from '../lib/utils'
import { strings } from '../i18n/strings'
import { driverDemoForcePhase, type DriverDemoForcePhase } from '../services/driverSessionApi'
import { useDriverRideSummaryStore } from '../store/driverRideSummaryStore'
import { useDriverSimStore } from '../store/driverSimStore'
import { useToastStore } from '../store/notificationStore'
import { useDriverUi } from '../hooks/useDriverUi'
import type { DriverOutletContext } from '../types/appContext'

const RouteMap = lazy(() => import('../components/map/RouteMap'))

export function DriverActiveRidePage() {
  const t = strings()
  const [demoFoldOpen, setDemoFoldOpen] = useState(false)
  const { me } = useOutletContext<DriverOutletContext>()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const simSpeed = useDriverSimStore((s) => s.simSpeed)
  const setSimSpeed = useDriverSimStore((s) => s.setSimSpeed)
  const { data: ui, isLoading } = useDriverUi(me.account.id)
  const ride = ui?.activeRide ?? null
  const { mapDriverPos, mapDriverOrigin } = useDriverRideMapSimulation(me.account.id, ride, simSpeed)

  const openRideSummary = useDriverRideSummaryStore((s) => s.openWith)

  const demoPhaseMut = useMutation({
    mutationFn: (phase: DriverDemoForcePhase) => driverDemoForcePhase(me.account.id, phase),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(res.error, 'error')
        return
      }
      if ('summary' in res) {
        openRideSummary({
          ...res.summary,
          payment: String(res.summary.payment),
        })
        push(strings().notifications.driverRideSummaryToast, 'success')
      }
      await qc.invalidateQueries({ queryKey: ['driverUi', me.account.id] })
      await qc.invalidateQueries({ queryKey: ['notifications', me.account.id] })
    },
  })

  if (isLoading || !ui) return <LoadingState />

  const driverPos =
    mapDriverPos ??
    (ride?.driverLat != null && ride?.driverLng != null
      ? { lat: ride.driverLat, lng: ride.driverLng }
      : null)
  const approachPhase = Boolean(
    ride && (ride.flowStatus === 'vozac_na_putu' || ride.flowStatus === 'prihvacena'),
  )

  return (
    <div className="space-y-4">
      {!ride ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            <p>{t.driver.activeRideNone}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t.driver.activeRideNextStep}: {t.driver.activeRideOpenDashboard}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-black/[0.06] shadow-card">
            <CardHeader>
              <CardTitle className="text-brand-navy">{t.driver.activeRideTitle}</CardTitle>
              <p className="text-xs text-slate-500">{t.driver.rideTrackHint}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Suspense fallback={<MapChunkFallback />}>
                <RouteMap
                  pickup={ride.pickup}
                  destination={ride.destination}
                  routePoints={ride.routePoints}
                  driverPosition={driverPos}
                  driverApproachToPickup={approachPhase}
                  driverTraceOrigin={approachPhase ? mapDriverOrigin : null}
                  className="min-h-[280px] lg:min-h-[420px]"
                />
              </Suspense>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3">
                  <User className="mt-0.5 h-4 w-4 text-brand-navy" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{t.driver.ridePassenger}</p>
                    <p className="font-semibold text-brand-navy">{ride.passengerName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3">
                  <Banknote className="mt-0.5 h-4 w-4 text-brand-navy" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{t.driver.ridePayment}</p>
                    <p className="font-semibold text-brand-navy">{ride.paymentMethod}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{t.driver.rideRoute}</p>
                    <p className="font-semibold text-brand-navy">
                      {ride.pickup.label} → {ride.destination.label}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                      <Navigation className="h-3.5 w-3.5" />
                      {ride.routeDistanceKm.toFixed(1)} km · {t.driver.rideEstimated} {ride.estimatedDurationMin} min ·{' '}
                      {ride.estimatedPrice.toFixed(2)} BAM
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DriverRideFlowCard accountId={me.account.id} ui={ui} />

          <motion.div layout className={demoGlassPanelClass}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setDemoFoldOpen((v) => !v)}
              aria-expanded={demoFoldOpen}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-brand-yellow">{t.common.demoControls}</span>
              <ChevronDown
                className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200', demoFoldOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {demoFoldOpen ? (
            <div className={cn('mt-3 space-y-3', demoGlassDividerClass)}>
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-brand-navy">{t.common.demoSpeedLabel}:</span>{' '}
                <span className="font-extrabold text-brand-navy">{simSpeed}x</span>
              </p>
              <p className="text-xs text-slate-500">{t.common.demoSimMapHint}</p>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 4, 10] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    type="button"
                    className={
                      simSpeed === s
                        ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                        : 'border-slate-200 hover:border-brand-yellow/40'
                    }
                    disabled={simSpeed === s}
                    onClick={() => setSimSpeed(s)}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                  disabled={demoPhaseMut.isPending}
                  onClick={() => demoPhaseMut.mutate('vozac_na_putu')}
                >
                  {t.common.forceDriverWay}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                  disabled={demoPhaseMut.isPending}
                  onClick={() => demoPhaseMut.mutate('stigao')}
                >
                  {t.common.forceArrived}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                  disabled={demoPhaseMut.isPending}
                  onClick={() => demoPhaseMut.mutate('u_toku')}
                >
                  {t.common.forceStartRide}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                  disabled={demoPhaseMut.isPending}
                  onClick={() => demoPhaseMut.mutate('zavrsena')}
                >
                  {t.common.forceComplete}
                </Button>
              </div>
            </div>
            ) : null}
          </motion.div>
        </>
      )}
    </div>
  )
}
