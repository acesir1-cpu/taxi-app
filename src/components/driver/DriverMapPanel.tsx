import { lazy, Suspense } from 'react'
import { Clock, Navigation } from 'lucide-react'
import { useDriverRideMapSimulation } from '../../hooks/useDriverRideMapSimulation'
import { useRoadRoute } from '../../hooks/useRoadRoute'
import { useDriverSimStore } from '../../store/driverSimStore'
import type { DriverUiState } from '../../types/domain'
import { cn } from '../../lib/utils'
import { MapChunkFallback } from '../map/MapChunkFallback'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'

const RouteMap = lazy(() => import('../map/RouteMap'))

export function DriverMapPanel({ accountId, ui }: { accountId: string; ui: DriverUiState }) {
  const simSpeed = useDriverSimStore((s) => s.simSpeed)
  const preShift = ui.availabilityStatus === 'van_smjene'
  const ride = ui.activeRide
  const pending = ui.pendingRequest
  const noRideContext = !ride && !pending
  const { mapDriverPos, mapDriverOrigin } = useDriverRideMapSimulation(accountId, ride, simSpeed)
  const pickup = ride?.pickup ?? pending?.pickup ?? null
  const destination = ride?.destination ?? pending?.destination ?? null
  const previewRoute = useRoadRoute(!ride && pending ? pickup : null, !ride && pending ? destination : null)
  const routePoints = ride?.routePoints ?? previewRoute?.routePoints ?? []
  const driverPos =
    mapDriverPos ??
    (ride?.driverLat != null && ride?.driverLng != null ? { lat: ride.driverLat, lng: ride.driverLng } : null)
  const approachPhase = Boolean(
    ride && (ride.flowStatus === 'vozac_na_putu' || ride.flowStatus === 'prihvacena'),
  )

  const distKm = ride?.routeDistanceKm ?? pending?.routeDistanceKm ?? 0
  const etaMin = ride?.estimatedDurationMin ?? pending?.estimatedDurationMin ?? 0

  return (
    <Card
      aria-disabled={preShift}
      className={cn(
        passengerAppCardClassName,
        'transition-colors lg:sticky lg:top-20',
        preShift && 'border-slate-200 bg-slate-100/95 shadow-none',
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className={cn(preShift ? 'text-slate-500' : undefined)}>Mapa i ruta</CardTitle>
        {preShift ? (
          <p className="text-xs text-slate-500">Pregled mape nakon početka smjene.</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={cn(
            'rounded-2xl transition-[filter]',
            (preShift || noRideContext) && 'pointer-events-none select-none grayscale-[0.45] opacity-[0.72]',
          )}
        >
          <Suspense fallback={<MapChunkFallback />}>
            <RouteMap
              pickup={pickup}
              destination={destination}
              routePoints={routePoints}
              driverPosition={driverPos}
              driverApproachToPickup={approachPhase}
              driverTraceOrigin={approachPhase ? mapDriverOrigin : null}
              allowTouchInteraction={!preShift && !noRideContext}
              className="min-h-[240px] lg:min-h-[360px]"
            />
          </Suspense>
        </div>
        <div
          className={cn(
            'flex flex-wrap gap-3 text-sm',
            preShift ? 'text-slate-500' : 'text-slate-700',
          )}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold',
              preShift ? 'border-slate-200 bg-slate-200/80 text-slate-600' : 'border-slate-200 bg-white text-slate-700',
            )}
          >
            <Navigation className={cn('h-3.5 w-3.5', preShift ? 'text-slate-500' : 'text-brand-teal')} />
            {distKm.toFixed(1)} km
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold',
              preShift ? 'border-slate-200 bg-slate-200/80 text-slate-600' : 'border-slate-200 bg-white text-slate-700',
            )}
          >
            <Clock className={cn('h-3.5 w-3.5', preShift ? 'text-slate-500' : 'text-brand-teal')} />
            ~{etaMin} min
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
