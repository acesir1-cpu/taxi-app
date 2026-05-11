import { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router-dom'
import { User, Banknote, MapPin, Navigation } from 'lucide-react'
import { LoadingState } from '../components/common/LoadingState'
import { DriverRideFlowCard } from '../components/driver/DriverRideFlowCard'
import { MapChunkFallback } from '../components/map/MapChunkFallback'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useDriverRideMapSimulation } from '../hooks/useDriverRideMapSimulation'
import { strings } from '../i18n/strings'
import { useDriverSimStore } from '../store/driverSimStore'
import { useDriverUi } from '../hooks/useDriverUi'
import type { DriverOutletContext } from '../types/appContext'

const RouteMap = lazy(() => import('../components/map/RouteMap'))

export function DriverActiveRidePage() {
  const t = strings()
  const { me } = useOutletContext<DriverOutletContext>()
  const simSpeed = useDriverSimStore((s) => s.simSpeed)
  const { data: ui, isLoading } = useDriverUi(me.account.id)
  const ride = ui?.activeRide ?? null
  const { mapDriverPos, mapDriverOrigin } = useDriverRideMapSimulation(me.account.id, ride, simSpeed)

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
        </>
      )}
    </div>
  )
}
