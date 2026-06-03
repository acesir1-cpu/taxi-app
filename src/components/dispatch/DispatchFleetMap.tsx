import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet'
import { fetchRoadRoute, getCachedRoadRoute, type LatLng } from '../../services/routingApi'
import { cn } from '../../lib/utils'
import { isDispatchRideAwaitingAssignment, type DispatchDriverRow, type DispatchRideRow } from '../../services/dispatcherApi'
import type { Ride } from '../../types/domain'
import { FitBounds } from '../map/FitBounds'

const SARAJEVO_BOUNDS = {
  minLat: 43.78,
  maxLat: 43.94,
  minLng: 18.22,
  maxLng: 18.52,
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function isValidSarajevoCoord(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false
  return lat >= SARAJEVO_BOUNDS.minLat && lat <= SARAJEVO_BOUNDS.maxLat && lng >= SARAJEVO_BOUNDS.minLng && lng <= SARAJEVO_BOUNDS.maxLng
}

function toLine(points: LatLng[]): Array<[number, number]> {
  return points
    .filter((p) => isValidSarajevoCoord(p.lat, p.lng))
    .map((p) => [p.lat, p.lng] as [number, number])
}

function resolveRideRoutePoints(ride: Ride): LatLng[] {
  const cached = getCachedRoadRoute(ride.pickup, ride.destination)
  if (cached.routePoints.length >= 2 && cached.source !== 'fallback') {
    return cached.routePoints
  }
  if (ride.routePoints.length >= 2) {
    const fromRide = ride.routePoints.filter((p) => isValidSarajevoCoord(p.lat, p.lng))
    if (fromRide.length >= 2) return fromRide
  }
  return cached.routePoints
}

function colorFor(status: DispatchDriverRow['driver']['availabilityStatus']): string {
  if (status === 'dostupan') return '#10B981'
  if (status === 'zauzet') return '#F59E0B'
  if (status === 'na_pauzi') return '#6366F1'
  if (status === 'van_funkcije') return '#EF4444'
  return '#94A3B8'
}

function driverIcon(row: DispatchDriverRow) {
  const color = colorFor(row.driver.availabilityStatus)
  const initials = `${row.driver.firstName.charAt(0)}${row.driver.lastName.charAt(0)}`.toUpperCase()
  return L.divIcon({
    className: '',
    html: `
      <div style="width:34px;height:34px;border-radius:999px;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:900;border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.22)">
        ${esc(initials)}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

const pickupIcon = L.divIcon({
  className: '',
  html: '<div style="width:15px;height:15px;border-radius:999px;background:#14B8A6;border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,.22)"></div>',
  iconSize: [15, 15],
  iconAnchor: [7, 7],
})

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:4px;background:#0F172A;border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,.22)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const problemIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:4px;background:#EF4444;border:3px solid white;box-shadow:0 4px 12px rgba(15,23,42,.22)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function rideRouteKey(ride: Ride): string {
  return `${ride.id}:${ride.pickup.lat},${ride.pickup.lng}|${ride.destination.lat},${ride.destination.lng}`
}

export function DispatchFleetMap({
  drivers,
  rides,
  className,
  showRideRoutes,
}: {
  drivers: DispatchDriverRow[]
  rides: DispatchRideRow[]
  className?: string
  /** Fleet overview: hide overlapping lines when many rides; detail view: pass true */
  showRideRoutes?: boolean
}) {
  const awaitingRides = rides.filter(isDispatchRideAwaitingAssignment)
  const activeRides = rides.filter(
    (row) => row.ride && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna'].includes(row.ride.status),
  )
  const drawRoutes = showRideRoutes ?? activeRides.length <= 1
  const ridesToDraw = drawRoutes ? activeRides : []

  const initialLines = useMemo(() => {
    const map = new Map<string, Array<[number, number]>>()
    for (const row of ridesToDraw) {
      if (!row.ride) continue
      map.set(rideRouteKey(row.ride), toLine(resolveRideRoutePoints(row.ride)))
    }
    return map
  }, [ridesToDraw])

  const [routeLines, setRouteLines] = useState(initialLines)

  const rideIdsKey = ridesToDraw.map((r) => r.ride?.id).join(',')

  useEffect(() => {
    setRouteLines(initialLines)
    if (!drawRoutes || ridesToDraw.length === 0) return

    let cancelled = false
    void (async () => {
      const next = new Map(initialLines)
      await Promise.all(
        ridesToDraw.map(async (row) => {
          if (!row.ride) return
          const key = rideRouteKey(row.ride)
          const road = await fetchRoadRoute(row.ride.pickup, row.ride.destination)
          if (cancelled) return
          const line = toLine(road.routePoints)
          if (line.length >= 2) next.set(key, line)
        }),
      )
      if (!cancelled) setRouteLines(new Map(next))
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch routes only when ride set changes
  }, [drawRoutes, rideIdsKey])

  const points: Array<[number, number]> = useMemo(() => {
    const out: Array<[number, number]> = []
    for (const row of drivers) {
      const { lat, lng } = row.driver.currentLocation
      if (isValidSarajevoCoord(lat, lng)) out.push([lat, lng])
    }
    for (const row of activeRides) {
      if (!row.ride) continue
      if (isValidSarajevoCoord(row.ride.pickup.lat, row.ride.pickup.lng)) {
        out.push([row.ride.pickup.lat, row.ride.pickup.lng])
      }
      if (isValidSarajevoCoord(row.ride.destination.lat, row.ride.destination.lng)) {
        out.push([row.ride.destination.lat, row.ride.destination.lng])
      }
    }
    for (const row of awaitingRides) {
      if (isValidSarajevoCoord(row.request.pickup.lat, row.request.pickup.lng)) {
        out.push([row.request.pickup.lat, row.request.pickup.lng])
      }
      if (isValidSarajevoCoord(row.request.destination.lat, row.request.destination.lng)) {
        out.push([row.request.destination.lat, row.request.destination.lng])
      }
    }
    if (drawRoutes) {
      for (const line of routeLines.values()) {
        for (const pt of line) out.push(pt)
      }
    }
    return out
  }, [activeRides, drivers, drawRoutes, routeLines])

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]', className)}>
      <MapContainer center={[43.8563, 18.4131]} zoom={12} zoomControl={false} className="h-full min-h-[360px] w-full">
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <ZoomControl position="bottomright" />
        {ridesToDraw.map((row) => {
          if (!row.ride) return null
          const line = routeLines.get(rideRouteKey(row.ride)) ?? []
          return line.length > 1 ? (
            <Polyline
              key={row.ride.id}
              positions={line}
              pathOptions={{
                color: row.ride.status === 'problematicna' ? '#EF4444' : '#14B8A6',
                weight: row.ride.status === 'problematicna' ? 5 : 4,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          ) : null
        })}
        {awaitingRides.map((row) => (
          <Marker
            key={`${row.request.id}-await-pickup`}
            position={[row.request.pickup.lat, row.request.pickup.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <strong>{row.pickupLabel}</strong>
              <br />
              {row.passengerName} · čeka dodjelu
            </Popup>
          </Marker>
        ))}
        {activeRides.map((row) =>
          row.ride ? (
            <Marker
              key={`${row.ride.id}-pickup`}
              position={[row.ride.pickup.lat, row.ride.pickup.lng]}
              icon={row.ride.status === 'problematicna' ? problemIcon : pickupIcon}
            >
              <Popup>
                <strong>{row.pickupLabel}</strong>
                <br />
                {row.passengerName}
              </Popup>
            </Marker>
          ) : null,
        )}
        {drawRoutes
          ? activeRides.map((row) =>
              row.ride ? (
                <Marker key={`${row.ride.id}-dest`} position={[row.ride.destination.lat, row.ride.destination.lng]} icon={destIcon}>
                  <Popup>
                    <strong>{row.destinationLabel}</strong>
                  </Popup>
                </Marker>
              ) : null,
            )
          : null}
        {drivers.map((row) => (
          <Marker key={row.driver.id} position={[row.driver.currentLocation.lat, row.driver.currentLocation.lng]} icon={driverIcon(row)}>
            <Popup>
              <strong>
                {row.driver.firstName} {row.driver.lastName}
              </strong>
              <br />
              {row.statusLabel}
              {row.vehicle ? (
                <>
                  <br />
                  {row.vehicle.brand} {row.vehicle.model} · {row.vehicle.registration}
                </>
              ) : null}
              {row.warning ? (
                <>
                  <br />
                  <span>{row.warning}</span>
                </>
              ) : null}
            </Popup>
          </Marker>
        ))}
        {points.length > 0 ? <FitBounds points={points} /> : null}
      </MapContainer>
    </div>
  )
}
