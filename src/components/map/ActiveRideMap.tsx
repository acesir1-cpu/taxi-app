import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Location, Ride } from '../../types/domain'
import { destIcon, driverIcon, pickupIcon } from './mapIcons'
import { FitBounds } from './FitBounds'

interface ActiveRideMapProps {
  ride: Ride
  driverPos: { lat: number; lng: number }
  driverOrigin?: { lat: number; lng: number } | null
  className?: string
  followDriver?: boolean
  showArrivalPopup?: boolean
  arrivalPopupText?: string
}

function FollowDriverView({
  enabled,
  driverPos,
}: {
  enabled: boolean
  driverPos: { lat: number; lng: number }
}) {
  const map = useMap()
  const lastPanAtRef = useRef(0)
  const lastPanPosRef = useRef<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!enabled) return
    const now = Date.now()
    const last = lastPanPosRef.current
    const movedEnough = !last || Math.abs(last.lat - driverPos.lat) + Math.abs(last.lng - driverPos.lng) > 0.00035
    if (now - lastPanAtRef.current < 500 && !movedEnough) return
    lastPanAtRef.current = now
    lastPanPosRef.current = driverPos
    map.panTo([driverPos.lat, driverPos.lng], { animate: true, duration: 0.35 })
  }, [driverPos, enabled, map])
  return null
}

export default function ActiveRideMap({
  ride,
  driverPos,
  driverOrigin = null,
  className,
  followDriver = false,
  showArrivalPopup = false,
  arrivalPopupText = '',
}: ActiveRideMapProps) {
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
  const showApproach = ride.status === 'dodijeljena' || ride.status === 'vozac_na_putu'
  const fullApproach: Array<[number, number]> | null = driverOrigin
    ? [
        [driverOrigin.lat, driverOrigin.lng],
        [pickup.lat, pickup.lng],
      ]
    : null

  return (
    <div className={`overflow-hidden rounded-2xl border border-brand-border bg-slate-100 ${className ?? ''}`}>
      <MapContainer center={[driverPos.lat, driverPos.lng]} zoom={13} className="h-72 w-full sm:h-96" scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {line.length > 1 ? (
          <Polyline positions={line} pathOptions={{ color: '#14B8A6', weight: 4, opacity: 0.85 }} />
        ) : null}
        {fullApproach ? (
          <Polyline
            positions={fullApproach}
            pathOptions={{ color: '#F59E0B', weight: 2, opacity: 0.35, dashArray: '4 10' }}
          />
        ) : null}
        {showApproach ? (
          <Polyline
            positions={approachLine}
            pathOptions={{ color: '#F59E0B', weight: 3, opacity: 0.9, dashArray: '8 8' }}
          />
        ) : null}
        {driverOrigin ? (
          <CircleMarker
            center={[driverOrigin.lat, driverOrigin.lng]}
            radius={5}
            pathOptions={{ color: '#A16207', fillColor: '#FCD34D', fillOpacity: 0.9, weight: 2 }}
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
        <FollowDriverView enabled={followDriver} driverPos={driverPos} />
      </MapContainer>
    </div>
  )
}
