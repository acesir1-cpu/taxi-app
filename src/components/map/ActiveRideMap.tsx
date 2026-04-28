import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { Location, Ride } from '../../types/domain'
import { destIcon, driverIcon, pickupIcon } from './mapIcons'
import { FitBounds } from './FitBounds'

interface ActiveRideMapProps {
  ride: Ride
  driverPos: { lat: number; lng: number }
  className?: string
}

export default function ActiveRideMap({ ride, driverPos, className }: ActiveRideMapProps) {
  const pickup: Location = ride.pickup
  const destination: Location = ride.destination
  const line = ride.routePoints.map((p) => [p.lat, p.lng] as [number, number])
  const positions: Array<[number, number]> = [
    [pickup.lat, pickup.lng],
    [destination.lat, destination.lng],
    [driverPos.lat, driverPos.lng],
  ]

  return (
    <div className={`overflow-hidden rounded-2xl border border-brand-border bg-slate-100 ${className ?? ''}`}>
      <MapContainer center={[driverPos.lat, driverPos.lng]} zoom={13} className="h-72 w-full sm:h-96" scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {line.length > 1 ? (
          <Polyline positions={line} pathOptions={{ color: '#14B8A6', weight: 4, opacity: 0.85 }} />
        ) : null}
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
        <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />
        <FitBounds points={positions} />
      </MapContainer>
    </div>
  )
}
