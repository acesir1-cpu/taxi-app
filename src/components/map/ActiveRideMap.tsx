import L from 'leaflet'
import { useEffect, useLayoutEffect, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import { cn } from '../../lib/utils'
import type { Location, Ride } from '../../types/domain'
import { destIcon, driverIcon, pickupIcon } from './mapIcons'
import { FitBounds } from './FitBounds'

function MapLayoutSync() {
  const map = useMap()
  useEffect(() => {
    const fix = () => {
      map.invalidateSize({ pan: false })
    }
    fix()
    const t1 = window.setTimeout(fix, 120)
    const t2 = window.setTimeout(fix, 400)
    window.addEventListener('resize', fix)
    return () => {
      window.removeEventListener('resize', fix)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [map])
  return null
}

interface ActiveRideMapProps {
  ride: Ride
  driverPos: { lat: number; lng: number }
  driverOrigin?: { lat: number; lng: number } | null
  /** When set (e.g. while status is "vozac_na_putu"), dashed line follows the same path as the sim. */
  approachPolyline?: Array<{ lat: number; lng: number }> | null
  className?: string
  /** `fullscreen` = edge-to-edge map (no card chrome); default card layout for desktop. */
  variant?: 'card' | 'fullscreen'
  followDriver?: boolean
  showArrivalPopup?: boolean
  arrivalPopupText?: string
}

/** Shift map center south so the driver sits in the visible band above a tall bottom sheet (fullscreen mobile). */
function useFollowCenterShiftYPx(fullscreen: boolean): number {
  const [px, setPx] = useState(0)
  useEffect(() => {
    if (!fullscreen) {
      setPx(0)
      return
    }
    const calc = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      // Sheet ~60vh: aim ~upper third of top 40% viewport ≈ 0.24–0.30 of height
      setPx(Math.round(Math.min(300, Math.max(130, h * 0.27))))
    }
    calc()
    window.addEventListener('resize', calc)
    window.visualViewport?.addEventListener('resize', calc)
    return () => {
      window.removeEventListener('resize', calc)
      window.visualViewport?.removeEventListener('resize', calc)
    }
  }, [fullscreen])
  return px
}

function FollowDriverView({
  enabled,
  driverPos,
  centerShiftYPx = 0,
}: {
  enabled: boolean
  driverPos: { lat: number; lng: number }
  /** Move geographic center this many px toward bottom so marker appears higher (fullscreen + sheet). */
  centerShiftYPx?: number
}) {
  const map = useMap()
  /** Sync camera with marker before paint; animated panTo lags behind high-frequency sim updates. */
  useLayoutEffect(() => {
    if (!enabled) return
    const z = map.getZoom()
    const ll = L.latLng(driverPos.lat, driverPos.lng)
    map.setView(ll, z, { animate: false })
    if (centerShiftYPx > 0) {
      const p = map.latLngToContainerPoint(ll)
      const shiftedCenter = map.containerPointToLatLng(L.point(p.x, p.y + centerShiftYPx))
      map.setView(shiftedCenter, z, { animate: false })
    }
  }, [driverPos.lat, driverPos.lng, enabled, map, centerShiftYPx])
  return null
}

export default function ActiveRideMap({
  ride,
  driverPos,
  approachPolyline = null,
  className,
  variant = 'card',
  followDriver = false,
  showArrivalPopup = false,
  arrivalPopupText = '',
}: ActiveRideMapProps) {
  const fullscreen = variant === 'fullscreen'
  const followCenterShiftYPx = useFollowCenterShiftYPx(fullscreen)
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  const pickup: Location = ride.pickup
  const destination: Location = ride.destination
  const line = ride.routePoints.map((p) => [p.lat, p.lng] as [number, number])
  const positions: Array<[number, number]> = [
    [pickup.lat, pickup.lng],
    [destination.lat, destination.lng],
  ]
  const approachLine: Array<[number, number]> = [
    [driverPos.lat, driverPos.lng],
    [pickup.lat, pickup.lng],
  ]
  const approachPositions: Array<[number, number]> =
    approachPolyline && approachPolyline.length >= 2
      ? approachPolyline.map((p) => [p.lat, p.lng] as [number, number])
      : approachLine
  const showApproach = ride.status === 'dodijeljena' || ride.status === 'vozac_na_putu'

  return (
    <div
      className={cn(
        fullscreen
          ? 'relative h-full min-h-0 w-full bg-slate-200'
          : 'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className
      )}
    >
      <MapContainer
        center={[driverPos.lat, driverPos.lng]}
        zoom={13}
        zoomControl={false}
        className={cn(
          'active-ride-map-canvas w-full',
          fullscreen ? 'active-ride-map-fullscreen h-full min-h-0' : 'h-72 sm:h-96'
        )}
        scrollWheelZoom
      >
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url={tileUrl} />
        <MapLayoutSync />
        <ZoomControl position="bottomright" />
        {line.length > 1 ? (
          <>
            <Polyline
              positions={line}
              pathOptions={{ color: '#FFFFFF', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={line}
              pathOptions={{ color: '#14B8A6', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        ) : null}
        {showApproach ? (
          <Polyline
            positions={approachPositions}
            pathOptions={{ color: '#F59E0B', weight: 3, opacity: 0.9, dashArray: '8 8' }}
          />
        ) : null}
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
        <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />
        {showArrivalPopup ? (
          <Popup position={[driverPos.lat, driverPos.lng]} autoPan={false} closeButton={false} closeOnClick={false}>
            {arrivalPopupText}
          </Popup>
        ) : null}
        {followDriver ? null : <FitBounds points={positions} />}
        <FollowDriverView
          enabled={followDriver}
          driverPos={driverPos}
          centerShiftYPx={fullscreen && followDriver ? followCenterShiftYPx : 0}
        />
      </MapContainer>
    </div>
  )
}
