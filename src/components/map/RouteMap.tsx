import { createPortal } from 'react-dom'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
  type Ref,
} from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import type { Location } from '../../types/domain'
import { cn } from '../../lib/utils'
import { destIcon, driverIcon, pickupIcon, simDriverFleetIcon } from './mapIcons'
import { FitBounds } from './FitBounds'

export type RouteMapInteractionMode = 'mapClick' | 'centerPin'

export type RouteMapHandle = {
  /** Fit camera to route polyline (or pickup+destination) using the given padding. */
  fitRouteToBounds: () => void
  /** Animate camera to coordinates. */
  flyToLatLng: (lat: number, lng: number, zoom: number) => void
}

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
  /** Simulated nearby fleet markers (order page). */
  simulationDriverMarkers?: Array<{ id: string; lat: number; lng: number }>
  /** Isprekidana linija trenutna pozicija → preuzimanje (faza „na putu“), kao kod putnika. */
  driverApproachToPickup?: boolean
  /** Početna tačka simulacije (blago iscrtana do preuzimanja). */
  driverTraceOrigin?: { lat: number; lng: number } | null
  /**
   * When true, the map fills the parent (use with a `h-full` wrapper), e.g. mobile full-bleed behind a sheet.
   * Default sizing uses fixed vh caps for card layouts.
   */
  fillContainer?: boolean
  /** Bumps Leaflet `invalidateSize()` when the container layout changes (e.g. bottom sheet snap). */
  invalidateSizeToken?: string | number
  /** External trigger used to force re-fitting route bounds. */
  autoFitTriggerKey?: string | number
  /** Resets "manual interaction lock" logic for autofit. */
  autoFitResetKey?: string | number
  /** Enable/disable route autofit behavior. */
  autoFitEnabled?: boolean
  /** Camera animation duration in ms for route autofit. */
  autoFitDurationMs?: number
  /** Fit padding in px. */
  autoFitPadding?: { top: number; right: number; bottom: number; left: number }
  /** Called after a programmatic fly/setView from the map (auto-fit, FAB, etc.). */
  onProgrammaticRouteFitComplete?: () => void
}

function MapClickHandler({
  active,
  onPick,
  onUserInteraction,
  gestureSuppressUntilRef,
}: {
  active: boolean
  onPick: (lat: number, lng: number) => void
  onUserInteraction?: () => void
  gestureSuppressUntilRef: MutableRefObject<number>
}) {
  useMapEvents({
    click(e) {
      if (Date.now() < gestureSuppressUntilRef.current) return
      onUserInteraction?.()
      if (active) onPick(e.latlng.lat, e.latlng.lng)
    },
    /** User pan — avoid zoomstart (programmatic fit also zooms). */
    dragstart() {
      if (Date.now() < gestureSuppressUntilRef.current) return
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

function AutoFitController({
  points,
  enabled,
  triggerKey,
  resetKey,
  durationMs,
  padding,
  onUserInteraction,
  onFlyComplete,
  gestureSuppressUntilRef,
}: {
  points: Array<[number, number]>
  enabled: boolean
  triggerKey?: string | number
  resetKey?: string | number
  durationMs: number
  padding: { top: number; right: number; bottom: number; left: number }
  onUserInteraction?: () => void
  onFlyComplete?: () => void
  gestureSuppressUntilRef: MutableRefObject<number>
}) {
  const map = useMap()
  const lockedByUserRef = useRef(false)
  const onFlyCompleteRef = useRef(onFlyComplete)
  onFlyCompleteRef.current = onFlyComplete
  const pointsSig = points.map(([lat, lng]) => `${lat},${lng}`).join('|')

  useMapEvents({
    click() {
      if (!enabled) return
      if (Date.now() < gestureSuppressUntilRef.current) return
      lockedByUserRef.current = true
      onUserInteraction?.()
    },
    dragstart() {
      if (!enabled) return
      if (Date.now() < gestureSuppressUntilRef.current) return
      lockedByUserRef.current = true
      onUserInteraction?.()
    },
    zoomstart() {
      if (!enabled) return
      if (Date.now() < gestureSuppressUntilRef.current) return
      lockedByUserRef.current = true
      onUserInteraction?.()
    },
  })

  useEffect(() => {
    lockedByUserRef.current = false
  }, [resetKey])

  useEffect(() => {
    if (!enabled || points.length < 2 || lockedByUserRef.current) return
    const bounds = L.latLngBounds(points)
    // Cover programmatic fly + any follow-up tile/layout work so zoomstart isn’t treated as user input.
    gestureSuppressUntilRef.current = Date.now() + Math.max(1600, durationMs + 1000)
    map.stop()
    map.flyToBounds(bounds, {
      duration: durationMs / 1000,
      paddingTopLeft: [padding.left, padding.top],
      paddingBottomRight: [padding.right, padding.bottom],
      maxZoom: 14,
    })
    const t = window.setTimeout(() => onFlyCompleteRef.current?.(), durationMs + 80)
    return () => window.clearTimeout(t)
  }, [
    map,
    points.length,
    pointsSig,
    enabled,
    triggerKey,
    durationMs,
    padding.bottom,
    padding.left,
    padding.right,
    padding.top,
    gestureSuppressUntilRef,
  ])

  return null
}

function RouteMapCommands({
  forwardedRef,
  linePositions,
  markerPositions,
  fitPadding,
  fitDurationMs,
  gestureSuppressUntilRef,
  onProgrammaticComplete,
}: {
  forwardedRef: Ref<RouteMapHandle | null>
  linePositions: Array<[number, number]>
  markerPositions: Array<[number, number]>
  fitPadding: { top: number; right: number; bottom: number; left: number }
  fitDurationMs: number
  gestureSuppressUntilRef: MutableRefObject<number>
  onProgrammaticComplete?: () => void
}) {
  const map = useMap()
  const onProgrammaticCompleteRef = useRef(onProgrammaticComplete)
  onProgrammaticCompleteRef.current = onProgrammaticComplete
  const lineSig = linePositions.map(([lat, lng]) => `${lat},${lng}`).join('|')
  const markerSig = markerPositions.map(([lat, lng]) => `${lat},${lng}`).join('|')

  useImperativeHandle(
    forwardedRef,
    () => ({
      fitRouteToBounds: () => {
        const pts: Array<[number, number]> =
          linePositions.length > 1 ? linePositions : markerPositions.length >= 2 ? markerPositions : []
        if (pts.length < 2) return
        const bounds = L.latLngBounds(pts)
        gestureSuppressUntilRef.current = Date.now() + Math.max(1600, fitDurationMs + 1000)
        map.stop()
        map.flyToBounds(bounds, {
          duration: fitDurationMs / 1000,
          paddingTopLeft: [fitPadding.left, fitPadding.top],
          paddingBottomRight: [fitPadding.right, fitPadding.bottom],
          maxZoom: 14,
        })
        window.setTimeout(() => onProgrammaticCompleteRef.current?.(), fitDurationMs + 80)
      },
      flyToLatLng: (lat, lng, zoom) => {
        gestureSuppressUntilRef.current = Date.now() + 1600
        map.stop()
        map.setView([lat, lng], zoom, { animate: true, duration: 0.45 })
        window.setTimeout(() => onProgrammaticCompleteRef.current?.(), 480)
      },
    }),
    [
      map,
      lineSig,
      markerSig,
      fitPadding.bottom,
      fitPadding.left,
      fitPadding.right,
      fitPadding.top,
      fitDurationMs,
      gestureSuppressUntilRef,
    ]
  )
  return null
}

function InvalidateSizeOnToken({ token }: { token?: string | number }) {
  const map = useMap()
  useEffect(() => {
    if (token === undefined) return
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false })
      })
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [map, token])
  return null
}

const RouteMap = forwardRef<RouteMapHandle | null, RouteMapProps>(function RouteMap(
  {
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
    simulationDriverMarkers,
    driverApproachToPickup = false,
    fillContainer = false,
    invalidateSizeToken,
    autoFitTriggerKey,
    autoFitResetKey,
    autoFitEnabled = false,
    autoFitDurationMs = 600,
    autoFitPadding = { top: 80, right: 40, bottom: 120, left: 40 },
    onProgrammaticRouteFitComplete,
  },
  ref
) {
  const gestureSuppressUntilRef = useRef(0)
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
  if (simulationDriverMarkers?.length) {
    fitPoints = [...fitPoints, ...simulationDriverMarkers.map((m) => [m.lat, m.lng] as [number, number])]
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
        fillContainer && 'flex h-full min-h-0 w-full flex-col rounded-none border-0 shadow-none',
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
            : fillContainer
              ? 'min-h-0 w-full flex-1 touch-pan-x touch-pan-y touch-manipulation'
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
          gestureSuppressUntilRef={gestureSuppressUntilRef}
        />
        <CenterPinOverlays
          active={centerPinPick}
          target={mapPickTarget === 'destination' ? 'destination' : 'pickup'}
          onCommit={(lat, lng) => onMapPick?.(lat, lng)}
          commitLabel={setCenterLocationLabel}
        />
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url={tileUrl} />
        {invalidateSizeToken !== undefined ? <InvalidateSizeOnToken token={invalidateSizeToken} /> : null}
        <ZoomControl position={fillContainer ? 'bottomleft' : 'bottomright'} />
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
        {simulationDriverMarkers?.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={simDriverFleetIcon} />
        ))}
        <RouteMapCommands
          forwardedRef={ref}
          linePositions={line}
          markerPositions={positions}
          fitPadding={autoFitPadding}
          fitDurationMs={autoFitDurationMs}
          gestureSuppressUntilRef={gestureSuppressUntilRef}
          onProgrammaticComplete={onProgrammaticRouteFitComplete}
        />
        <AutoFitController
          points={positions}
          enabled={autoFitEnabled}
          triggerKey={autoFitTriggerKey}
          resetKey={autoFitResetKey}
          durationMs={autoFitDurationMs}
          padding={autoFitPadding}
          onUserInteraction={onUserMapInteraction}
          onFlyComplete={onProgrammaticRouteFitComplete}
          gestureSuppressUntilRef={gestureSuppressUntilRef}
        />
        {!centerPinPick && !(autoFitEnabled && positions.length >= 2) ? <FitBounds points={fitPoints} /> : null}
      </MapContainer>
    </div>
  )
})

export default RouteMap
