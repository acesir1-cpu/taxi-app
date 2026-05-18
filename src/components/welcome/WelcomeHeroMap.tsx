import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { destIcon, pickupIcon } from '../map/mapIcons'

const SARAJEVO_CENTER: [number, number] = [43.8563, 18.4131]
const DEMO_PICKUP: [number, number] = [43.858, 18.405]
const DEMO_DEST: [number, number] = [43.848, 18.428]
const DEMO_ROUTE: [number, number][] = [
  DEMO_PICKUP,
  [43.856, 18.412],
  [43.852, 18.42],
  DEMO_DEST,
]

/** Live map backdrop for welcome booking column (Sarajevo demo route). */
export function WelcomeHeroMap() {
  useEffect(() => {
    const container = L.DomUtil.get('welcome-hero-map-root')
    if (container) {
      ;(container as HTMLElement & { _leaflet_id?: number })._leaflet_id = undefined
    }
  }, [])

  return (
    <div className="welcome-hero-map" id="welcome-hero-map-root" aria-hidden>
      <MapContainer
        center={SARAJEVO_CENTER}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline
          positions={DEMO_ROUTE}
          pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.85 }}
        />
        <Marker position={DEMO_PICKUP} icon={pickupIcon} />
        <Marker position={DEMO_DEST} icon={destIcon} />
      </MapContainer>
    </div>
  )
}
