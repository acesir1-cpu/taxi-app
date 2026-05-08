import { createPortal } from 'react-dom'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import type { Location } from '../../types/domain'
import { cn } from '../../lib/utils'
import { destIcon, driverIcon, pickupIcon } from './mapIcons'
import { FitBounds } from './FitBounds'

export type RouteMapInteractionMode = 'mapClick' | 'centerPin'

interface RouteMapProps {
  pickup: Location | null
  destination: Location | null
  routePoints: Array<{ lat: number; lng: number }>
  className?: string
  /** Kada je postavljeno, sljedeći klik na kartu poziva `onMapPick` s koordinatama (samo u `mapClick` načinu). */
  mapPickTarget?: 'pickup' | 'destination' | null
  onMapPick?: (lat: number, lng: number) => void
  /** Called when the user pans, zooms, or clicks the map (not on programmatic updates). */
  onUserMapInteraction?: () => void
  /** `centerPin`: korisnik pomjera kartu, lokacija se postavlja dugmetom (mobilni). */
  interactionMode?: RouteMapInteractionMode
  /** Tekst na dugmetu ispod mape u `centerPin` načinu. */
  setCenterLocationLabel?: string
  /** Controls whether the map should capture user gestures. */
  allowTouchInteraction?: boolean
  /** Fullscreen canvas mode for mobile picking. */
  fullscreen?: boolean
  /** Pozicija vozača (simulacija). */
  driverPosition?: { lat: number; lng: number } | null
  /** Isprekidana linija trenutna pozicija → preuzimanje (faza „na putu“), kao kod putnika. */
  driverApproachToPickup?: boolean
  /** Početna tačka simulacije (blago iscrtana do preuzimanja). */
  driverTraceOrigin?: { lat: number; lng: number } | null
}

function MapClickHandler({
  active,
  onPick,
  onUserInteraction,
}: {
  active: boolean
  onPick: (lat: number, lng: number) => void
  onUserInteraction?: () => void
}) {
  useMapEvents({
    click(e) {
      onUserInteraction?.()
      if (active) onPick(e.latlng.lat, e.latlng.lng)
    },
    /** User pan — avoid zoomstart (programmatic fit also zooms). */
    dragstart() {
      onUserInteraction?.()
    },
  })
  return null
}

function CenterPinOverlays({
  active,
  target,
  onCommit,
  commitLabel,
}: {
  active: boolean
  target: 'pickup' | 'destination'
  onCommit: (lat: number, lng: number) => void
  commitLabel: string
}) {
  const map = useMap()
  if (!active) return null
  const root = map.getContainer()
  const isPickup = target === 'pickup'
  const lineCls = isPickup ? 'bg-emerald-700/85' : 'bg-red-700/85'
  const headCls = isPickup
    ? 'border-2 border-white bg-emerald-500 shadow-md ring-2 ring-emerald-700/25'
    : 'border-2 border-white bg-red-500 shadow-md ring-2 ring-red-700/25'

  const crosshair = (
    <div
      className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center"
      aria-hidden
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className={cn('absolute h-8 w-0.5 rounded-full shadow-sm', lineCls)} />
        <span className={cn('absolute h-0.5 w-8 rounded-full shadow-sm', lineCls)} />
        <span
          className={cn(
            'absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-[calc(50%+10px)] rounded-full',
            headCls
          )}
        />
      </div>
    </div>
  )

  const bar = (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[910] flex justify-center px-3 pb-3 pt-8">
      <button
        type="button"
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-black/[0.1] bg-brand-navy px-4 py-3.5 text-center text-sm font-extrabold tracking-tight text-white shadow-lg active:scale-[0.99]"
        onClick={() => {
          const c = map.getCenter()
          onCommit(c.lat, c.lng)
        }}
      >
        {commitLabel}
      </button>
    </div>
  )

  return (
    <>
      {createPortal(crosshair, root)}
      {createPortal(bar, root)}
    </>
  )
}

export default function RouteMap({
  pickup,
  destination,
  routePoints,
  className,
  mapPickTarget,
  onMapPick,
  onUserMapInteraction,
  interactionMode = 'mapClick',
  setCenterLocationLabel = '',
  allowTouchInteraction = true,
  fullscreen = false,
  driverPosition = null,
  driverApproachToPickup = false,
}: RouteMapProps) {
  // Minimalist basemap: Carto Positron by default.
  // To switch to a dark minimalist style, replace with:
  // https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : [43.8563, 18.4131]
  const positions: Array<[number, number]> = []
  if (pickup) positions.push([pickup.lat, pickup.lng])
  if (destination) positions.push([destination.lat, destination.lng])
  const line = routePoints.map((p) => [p.lat, p.lng] as [number, number])
  let fitPoints: Array<[number, number]> = line.length > 1 ? line : positions.length ? positions : [center]
  if (driverPosition) {
    fitPoints = [...fitPoints, [driverPosition.lat, driverPosition.lng]]
  }
  const showApproachLeg = Boolean(driverApproachToPickup && driverPosition && pickup)

  const picking = !!mapPickTarget && !!onMapPick
  const clickPick = picking && interactionMode === 'mapClick'
  const centerPinPick = picking && interactionMode === 'centerPin'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        fullscreen && 'rounded-none border-0',
        picking && 'ring-2 ring-inset ring-brand-yellow/90',
        className
      )}
    >
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        className={cn(
          fullscreen
            ? 'h-[100dvh] w-full min-h-[100dvh] touch-pan-x touch-pan-y'
            : 'h-[min(52vh,420px)] w-full min-h-[260px] touch-manipulation lg:h-[420px] lg:min-h-[420px]',
          !allowTouchInteraction && 'touch-auto',
          clickPick && 'cursor-crosshair',
          centerPinPick && 'touch-pan-x touch-pan-y'
        )}
        scrollWheelZoom={allowTouchInteraction}
        dragging={allowTouchInteraction}
        touchZoom={allowTouchInteraction}
        doubleClickZoom={allowTouchInteraction}
        boxZoom={allowTouchInteraction}
        keyboard={allowTouchInteraction}
      >
        <MapClickHandler
          active={clickPick}
          onPick={(lat, lng) => onMapPick?.(lat, lng)}
          onUserInteraction={onUserMapInteraction}
        />
        <CenterPinOverlays
          active={centerPinPick}
          target={mapPickTarget === 'destination' ? 'destination' : 'pickup'}
          onCommit={(lat, lng) => onMapPick?.(lat, lng)}
          commitLabel={setCenterLocationLabel}
        />
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url={tileUrl} />
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
        {showApproachLeg && driverPosition && pickup ? (
          <Polyline
            positions={[
              [driverPosition.lat, driverPosition.lng],
              [pickup.lat, pickup.lng],
            ]}
            pathOptions={{ color: '#F59E0B', weight: 3, opacity: 0.9, dashArray: '8 8' }}
          />
        ) : null}
        {pickup ? <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} /> : null}
        {destination ? <Marker position={[destination.lat, destination.lng]} icon={destIcon} /> : null}
        {driverPosition ? (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon} />
        ) : null}
        <FitBounds points={fitPoints} />
      </MapContainer>
    </div>
  )
}
