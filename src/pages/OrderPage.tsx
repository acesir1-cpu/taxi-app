import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Car,
  ChevronRight,
  CloudSun,
  Crosshair,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Navigation,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { getGuestLang } from '../i18n/guestLocale'
import type { AppOutletContext } from '../types/appContext'
import type { Location, OrderType } from '../types/domain'
import { calculateRoute, createLocationFromMapClick, isInServiceZone } from '../services/locationApi'
import {
  cancelRideRequest,
  createRideRequest,
  getActiveRide,
  getPassengerRideRequestIfSearchable,
  getRideHistory,
  getScheduledRideRequests,
} from '../services/rideApi'
import { useToastStore } from '../store/notificationStore'
import { LocationSearch } from '../components/ride/LocationSearch'
import { PickupDestinationFields } from '../components/ride/PickupDestinationFields'
import { MapChunkFallback } from '../components/map/MapChunkFallback'
import type { RouteMapHandle } from '../components/map/RouteMap'

const RouteMap = lazy(() => import('../components/map/RouteMap'))
import { PageContainer } from '../components/layout/PageContainer'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { MapLocationOnboarding } from '../components/onboarding/MapLocationOnboarding'
import { hasSeenMapGuide, setMapGuideSeen } from '../lib/mapGuideStorage'
import { getHistoryPrivacyPrefs } from '../lib/historyPrivacy'
import {
  loadPassengerLocationPrefs,
  loadPassengerProfileExtras,
  savePassengerLocationPrefs,
  type PassengerLocationPrefsState,
} from '../lib/passengerSettingsPrefs'
import { haversineKm } from '../utils/distance'
import {
  displayedNearbyDriverCount,
  IDLE_MAP_SCATTER_ZONE,
  initialSimDriverCount,
  jitterWithinZone,
  randomPointInZone,
  resolveDriverZone,
  SARAJEVO_CENTER_FALLBACK,
} from '../lib/driverZonesSimulation'
import { getDb } from '../services/mockDb'
import { useLiveClock } from '../hooks/useLiveClock'

type MobileLocMethod = 'map' | 'address' | null
const SEARCH_REQUEST_KEY = 'urbanflow_search_request_id'

/** Pre-pickup / GPS-pending: show 2–4 drivers using city-center simulation (never 0 before interaction). */
const IDLE_DEFAULT_DRIVER_COUNT = 3

function randomIdleDriverCount(): number {
  return 2 + Math.floor(Math.random() * 3)
}

function isFutureScheduleValue(raw: string): boolean {
  const v = raw.trim()
  if (!v) return false
  const ms = new Date(v).getTime()
  if (Number.isNaN(ms)) return false
  return ms > Date.now()
}

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${y}-${m}-${d}T${h}:${min}`
}

function useIsMobileOrderFlow() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

export function OrderPage() {
  const t = strings()
  const userClock = useLiveClock({ locale: undefined })
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const loc = useLocation() as {
    state?: { pickup?: Location; destination?: Location; focusSchedule?: boolean }
  }
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const [pickup, setPickup] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('odmah')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [scheduleMin, setScheduleMin] = useState(() => toLocalDateTimeValue(new Date()))
  const [mapPickTarget, setMapPickTarget] = useState<'pickup' | 'destination' | null>(null)
  const [mapOverlayDismissed, setMapOverlayDismissed] = useState(false)
  const [mapGuideActive, setMapGuideActive] = useState(
    () => typeof window !== 'undefined' && !hasSeenMapGuide()
  )
  const [mapGuideStep, setMapGuideStep] = useState<1 | 2 | 3>(1)
  const [geoLoading, setGeoLoading] = useState(false)
  const [mobilePickupMethod, setMobilePickupMethod] = useState<MobileLocMethod>(null)
  const [mobileDestMethod, setMobileDestMethod] = useState<MobileLocMethod>(null)
  const [showMobileMapHint, setShowMobileMapHint] = useState(false)
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(true)
  const [mobileViewportHeight, setMobileViewportHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800)
  )
  const [routeAutoFitKey, setRouteAutoFitKey] = useState(0)
  const [routeAutoFitLockKey, setRouteAutoFitLockKey] = useState('init')
  const [routeAutoFitLockedByUser, setRouteAutoFitLockedByUser] = useState(false)
  const [mapRelayoutNonce, setMapRelayoutNonce] = useState(0)
  const [mapRecenterHint, setMapRecenterHint] = useState(false)
  const [mapFabGeoLoading, setMapFabGeoLoading] = useState(false)
  /** Distance from viewport top to bottom of the floating header card (px), from getBoundingClientRect. */
  const [mobileHeaderOverlayBottomPx, setMobileHeaderOverlayBottomPx] = useState(0)
  const routeMapRef = useRef<RouteMapHandle | null>(null)
  const routeAutoFitLockedByUserRef = useRef(false)
  routeAutoFitLockedByUserRef.current = routeAutoFitLockedByUser
  const addressGuideRef = useRef<HTMLDivElement>(null)
  const scheduleGuideRef = useRef<HTMLDivElement>(null)
  const mapShellGuideRef = useRef<HTMLDivElement>(null)
  const mapInteractiveRef = useRef<HTMLDivElement>(null)
  const mobileOrderHeaderOverlayRef = useRef<HTMLDivElement>(null)
  const estimateGuideRef = useRef<HTMLDivElement>(null)
  const isMobileFlow = useIsMobileOrderFlow()
  const [sameLocationError, setSameLocationError] = useState(false)
  const [scheduleInputError, setScheduleInputError] = useState(false)
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)
  const profileExtras = useMemo(() => loadPassengerProfileExtras(me.account.id), [me.account.id])
  const [locationPrefs, setLocationPrefs] = useState<PassengerLocationPrefsState>(() =>
    loadPassengerLocationPrefs(me.account.id)
  )
  const [mobileGpsPromptOpen, setMobileGpsPromptOpen] = useState(false)
  const initialGpsRequestDoneRef = useRef(false)
  const db = useMemo(() => getDb(), [])
  const driverById = useMemo(() => new Map(db.drivers.map((d) => [d.id, d])), [db])
  const vehicleById = useMemo(() => new Map(db.vehicles.map((v) => [v.id, v])), [db])

  const [passengerGps, setPassengerGps] = useState<{ lat: number; lng: number } | null>(null)
  /** Browser geolocation: pending until first success or error callback. */
  const [gpsLockState, setGpsLockState] = useState<'pending' | 'ok' | 'blocked'>('pending')
  const [simDriversCount, setSimDriversCount] = useState(() => IDLE_DEFAULT_DRIVER_COUNT)
  const [simDriverMarkers, setSimDriverMarkers] = useState<
    Array<{ id: string; lat: number; lng: number }>
  >(() =>
    Array.from({ length: Math.min(5, IDLE_DEFAULT_DRIVER_COUNT) }, (_, i) => ({
      id: `sim-idle-init-${i}-${Math.random().toString(36).slice(2, 9)}`,
      ...randomPointInZone(IDLE_MAP_SCATTER_ZONE),
    }))
  )
  const [driversFluctuationBanner, setDriversFluctuationBanner] = useState(false)
  const [locationHintDismissed, setLocationHintDismissed] = useState(false)
  const zoneCapRef = useRef(0)
  const pickupRef = useRef<Location | null>(null)
  pickupRef.current = pickup
  const markerJitterZoneRef = useRef(IDLE_MAP_SCATTER_ZONE)

  const refCoords = useMemo(() => {
    if (pickup) return { lat: pickup.lat, lng: pickup.lng }
    if (passengerGps) return passengerGps
    return SARAJEVO_CENTER_FALLBACK
  }, [pickup, passengerGps])

  const activeZone = useMemo(
    () => resolveDriverZone(refCoords.lat, refCoords.lng),
    [refCoords.lat, refCoords.lng]
  )
  const activeZoneRef = useRef(activeZone)
  activeZoneRef.current = activeZone
  zoneCapRef.current = activeZone.baseCount + 2
  markerJitterZoneRef.current = pickup ? activeZone : IDLE_MAP_SCATTER_ZONE

  const displayedNearbyCount = displayedNearbyDriverCount(simDriversCount)
  const hasDriversGreen = simDriversCount > 0

  const persistLocationPrefs = useCallback(
    (next: PassengerLocationPrefsState) => {
      setLocationPrefs(next)
      savePassengerLocationPrefs(me.account.id, next)
    },
    [me.account.id]
  )

  const requestPassengerGps = useCallback(
    (reason: 'initial' | 'pickup' | 'map-center') => {
      if (reason === 'initial') initialGpsRequestDoneRef.current = true
      const s = strings()
      if (!locationPrefs.gps) {
        if (reason !== 'initial') {
          push(
            getGuestLang() === 'en'
              ? 'GPS is disabled in settings. Enter the location manually or enable GPS in Profile.'
              : 'GPS je isključen u postavkama. Unesite lokaciju ručno ili uključite GPS u profilu.',
            'info'
          )
        }
        setGpsLockState('blocked')
        return
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGpsLockState('blocked')
        if (reason !== 'initial') push(s.order.geoUnsupported, 'error')
        return
      }

      if (reason === 'pickup') setGeoLoading(true)
      if (reason === 'map-center') setMapFabGeoLoading(true)

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setPassengerGps(coords)
          setGpsLockState('ok')
          persistLocationPrefs({ gps: true, gpsPromptSeen: true })
          if (reason === 'pickup') {
            applyPickupFromCoords(coords.lat, coords.lng)
            setGeoLoading(false)
          } else if (reason === 'map-center') {
            routeMapRef.current?.flyToLatLng(coords.lat, coords.lng, 15)
            setMapFabGeoLoading(false)
          }
        },
        () => {
          setGpsLockState('blocked')
          persistLocationPrefs({ gps: false, gpsPromptSeen: true })
          if (reason === 'pickup') {
            push(s.order.geoDenied, 'error')
            setGeoLoading(false)
          } else if (reason === 'map-center') {
            push(s.order.geoDenied, 'error')
            setMapFabGeoLoading(false)
          }
        },
        {
          enableHighAccuracy: reason !== 'initial',
          timeout: 12_000,
          maximumAge: reason === 'initial' ? 60_000 : 30_000,
        }
      )
    },
    [locationPrefs.gps, persistLocationPrefs, push]
  )

  useEffect(() => {
    initialGpsRequestDoneRef.current = false
    setLocationPrefs(loadPassengerLocationPrefs(me.account.id))
  }, [me.account.id])

  useEffect(() => {
    if (initialGpsRequestDoneRef.current) return
    if (!locationPrefs.gps) {
      setGpsLockState('blocked')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsLockState('blocked')
      return
    }
    if (isMobileFlow && !locationPrefs.gpsPromptSeen) {
      setMobileGpsPromptOpen(true)
      return
    }
    requestPassengerGps('initial')
  }, [isMobileFlow, locationPrefs.gps, locationPrefs.gpsPromptSeen, requestPassengerGps])

  useEffect(() => {
    const z = activeZone
    const hasPickup = !!pickup
    const initial = hasPickup ? initialSimDriverCount(z) : randomIdleDriverCount()
    setSimDriversCount(initial)
    const markerZone = hasPickup ? z : IDLE_MAP_SCATTER_ZONE
    const n = Math.min(5, initial)
    setSimDriverMarkers(
      n === 0
        ? []
        : Array.from({ length: n }, (_, i) => ({
            id: `sim-${hasPickup ? z.name : 'idle'}-${i}-${Math.random().toString(36).slice(2, 9)}`,
            ...randomPointInZone(markerZone),
          }))
    )
  }, [activeZone, pickup?.lat, pickup?.lng, passengerGps?.lat, passengerGps?.lng])

  useEffect(() => {
    const hasPickup = !!pickupRef.current
    const markerZone = hasPickup ? activeZoneRef.current : IDLE_MAP_SCATTER_ZONE
    const n = Math.min(5, simDriversCount)
    setSimDriverMarkers((prev) => {
      if (n === 0) return []
      if (prev.length === n) return prev
      if (prev.length < n) {
        return [
          ...prev,
          ...Array.from({ length: n - prev.length }, (_, i) => ({
            id: `sim-grow-${Date.now()}-${i}`,
            ...randomPointInZone(markerZone),
          })),
        ]
      }
      return prev.slice(0, n)
    })
  }, [simDriversCount])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSimDriversCount((prev) => {
        const hasPickup = !!pickupRef.current
        const delta = Math.random() < 0.5 ? -1 : 1
        const cap = zoneCapRef.current
        let next: number
        if (!hasPickup) {
          next = Math.min(4, Math.max(2, prev + delta))
        } else {
          next = Math.max(0, Math.min(cap, prev + delta))
        }
        if (hasPickup && prev > 0 && next === 0) {
          queueMicrotask(() => setDriversFluctuationBanner(true))
        }
        return next
      })
    }, 45_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSimDriverMarkers((prev) => {
        if (prev.length === 0) return prev
        const z = markerJitterZoneRef.current
        return prev.map((m) => ({ ...m, ...jitterWithinZone(z, m.lat, m.lng) }))
      })
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!driversFluctuationBanner) return
    const t = window.setTimeout(() => setDriversFluctuationBanner(false), 8000)
    return () => clearTimeout(t)
  }, [driversFluctuationBanner])

  useEffect(() => {
    let alive = true
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(SEARCH_REQUEST_KEY)
    } catch {
      return
    }
    if (!raw) return
    void getPassengerRideRequestIfSearchable(raw, me.profile.id).then((req) => {
      if (!alive || req) return
      try {
        sessionStorage.removeItem(SEARCH_REQUEST_KEY)
      } catch {
        // ignore
      }
    })
    return () => {
      alive = false
    }
  }, [me.profile.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setScheduleMin(toLocalDateTimeValue(new Date()))
    }, 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!hasSeenMapGuide()) {
      setMapGuideActive(true)
      setMapGuideStep(1)
    }
  }, [])

  useLayoutEffect(() => {
    if (!mapGuideActive) return
    const ref =
      mapGuideStep === 1
        ? mapShellGuideRef
        : mapGuideStep === 2
          ? isMobileFlow
            ? scheduleGuideRef
            : addressGuideRef
          : estimateGuideRef
    const scrollToTarget = () => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
    scrollToTarget()
    const t = window.setTimeout(scrollToTarget, 200)
    return () => clearTimeout(t)
  }, [mapGuideActive, mapGuideStep, isMobileFlow])

  useEffect(() => {
    if (loc.state?.pickup) setPickup(loc.state.pickup)
    if (loc.state?.destination) setDestination(loc.state.destination)
    if (loc.state?.focusSchedule) setOrderType('zakazano')
  }, [loc.state])

  const routeQuery = useQuery({
    queryKey: ['routePreview', pickup?.id, destination?.id],
    queryFn: async () => {
      if (!pickup || !destination) return null
      return calculateRoute(pickup, destination)
    },
    enabled: !!pickup && !!destination,
  })

  const activeQ = useQuery({
    queryKey: ['activeRide', me.profile.id],
    queryFn: () => getActiveRide(me.profile.id),
  })
  const historyQ = useQuery({
    queryKey: ['history', me.profile.id],
    queryFn: () => getRideHistory(me.profile.id),
  })
  const scheduledQ = useQuery({
    queryKey: ['scheduledRequests', me.profile.id],
    queryFn: () => getScheduledRideRequests(me.profile.id),
  })

  const mut = useMutation({
    mutationFn: async () => {
      if (!pickup || !destination) throw new Error('missing')
      const route = routeQuery.data
      if (!route || 'error' in route) throw new Error('route')
      let scheduledAt: string | undefined
      if (orderType === 'zakazano') {
        if (!scheduledLocal) throw new Error('schedule')
        scheduledAt = new Date(scheduledLocal).toISOString()
        if (new Date(scheduledAt) <= new Date()) throw new Error('past')
      }
      return createRideRequest({
        passengerProfileId: me.profile.id,
        accountId: me.account.id,
        pickup,
        destination,
        orderType,
        scheduledAt,
      })
    },
    onSuccess: async (res) => {
      const s = strings()
      if ('error' in res) {
        const m =
          res.error === 'active_exists'
            ? s.order.activeExists
            : res.error === 'same_location'
              ? s.order.sameLoc
              : res.error === 'past_schedule'
                ? s.order.pastSchedule
                : res.error === 'outside_zone'
                  ? s.order.outsideZone
                  : s.common.error
        push(m, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      push(s.notifications.rideCreated, 'success')
      if (res.request.orderType === 'zakazano') {
        await qc.invalidateQueries({ queryKey: ['scheduledRequests', me.profile.id] })
        push(s.order.scheduleRide, 'success')
        reset()
        return
      }
      try {
        sessionStorage.setItem(SEARCH_REQUEST_KEY, res.request.id)
      } catch {
        // ignore storage issues in private mode
      }
      navigate('/app/searching', {
        state: { requestId: res.request.id },
        replace: false,
      })
    },
    onError: (e) => {
      const s = strings()
      if ((e as Error).message === 'route') push(s.order.needRoute, 'error')
      else if ((e as Error).message === 'schedule') push(s.auth.scheduleDateError, 'error')
      else if ((e as Error).message === 'past') push(s.order.pastSchedule, 'error')
      else push(s.common.error, 'error')
    },
  })

  const route = routeQuery.data && !('error' in routeQuery.data) ? routeQuery.data : null
  const routeErr = routeQuery.data && 'error' in routeQuery.data ? routeQuery.data.error : null
  const sameLocationByDistance = !!pickup && !!destination && haversineKm(pickup, destination) < 0.05

  useEffect(() => {
    setSameLocationError(sameLocationByDistance)
  }, [sameLocationByDistance])

  const swapPickupAndDestination = useCallback(() => {
    setPickup(destination)
    setDestination(pickup)
  }, [pickup, destination])

  function reset() {
    setPickup(null)
    setDestination(null)
    setOrderType('odmah')
    setScheduledLocal('')
    setMapPickTarget(isMobileFlow ? 'pickup' : null)
    setMobilePickupMethod(null)
    setMobileDestMethod(null)
    setMapOverlayDismissed(false)
    setSameLocationError(false)
    void qc.invalidateQueries({ queryKey: ['routePreview'] })
  }

  const handleMapPick = useCallback(
    async (lat: number, lng: number) => {
      setMapOverlayDismissed(true)
      if (!isInServiceZone(lat, lng)) {
        push(t.order.outsideZone, 'error')
        return
      }
      const loc = await createLocationFromMapClick(lat, lng)
      if (mapPickTarget === 'pickup') {
        setPickup(loc)
        setMobilePickupMethod(null)
      } else if (mapPickTarget === 'destination') {
        setDestination(loc)
        setMobileDestMethod(null)
      }
    },
    [mapPickTarget, push, t.order.outsideZone]
  )

  function applyPickupFromCoords(lat: number, lng: number) {
    if (!isInServiceZone(lat, lng)) {
      push(t.order.outsideZone, 'error')
      return
    }
    setMapOverlayDismissed(true)
    void (async () => {
      const loc = await createLocationFromMapClick(lat, lng)
      setPickup(loc)
      setMobilePickupMethod(null)
    })()
  }

  function requestCurrentLocationForPickup() {
    requestPassengerGps('pickup')
  }

  function allowMobileGpsPrompt() {
    const next = { gps: true, gpsPromptSeen: true }
    persistLocationPrefs(next)
    setMobileGpsPromptOpen(false)
    requestPassengerGps('initial')
  }

  function denyMobileGpsPrompt() {
    persistLocationPrefs({ gps: false, gpsPromptSeen: true })
    setPassengerGps(null)
    setGpsLockState('blocked')
    setMobileGpsPromptOpen(false)
  }

  function setPickMode(next: 'pickup' | 'destination' | null) {
    setMapOverlayDismissed(true)
    setMobilePickupMethod(null)
    setMobileDestMethod(null)
    setMapPickTarget(next)
  }

  const showMapOverlay =
    !isMobileFlow && !mapGuideActive && !mapOverlayDismissed && !mapPickTarget
  const mobileMapPicking =
    isMobileFlow &&
    ((mapPickTarget === 'pickup' && mobilePickupMethod === 'map') ||
      (mapPickTarget === 'destination' && mobileDestMethod === 'map'))
  const routeMapPickTarget = !isMobileFlow ? mapPickTarget : mobileMapPicking ? mapPickTarget : null
  const mapEngaged = !!mapPickTarget || mobileMapPicking

  useEffect(() => {
    if (isMobileFlow || !mapPickTarget) return

    const onPointerDown = (event: PointerEvent) => {
      const mapShell = mapInteractiveRef.current
      if (!mapShell) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (mapShell.contains(target)) return
      setPickMode(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isMobileFlow, mapPickTarget])

  useEffect(() => {
    if (!mobileMapPicking) return
    mapInteractiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [mobileMapPicking])

  useEffect(() => {
    if (!mobileMapPicking) {
      setShowMobileMapHint(false)
      return
    }
    setShowMobileMapHint(true)
    const timer = window.setTimeout(() => setShowMobileMapHint(false), 2000)
    return () => clearTimeout(timer)
  }, [mobileMapPicking])

  useEffect(() => {
    if (!mobileMapPicking) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileMapPicking])

  function closeMobileMapPicker() {
    if (mapPickTarget === 'pickup') setMobilePickupMethod(null)
    if (mapPickTarget === 'destination') setMobileDestMethod(null)
  }

  function snapMobileSheet(expanded: boolean) {
    setMobileSheetExpanded(expanded)
  }

  useEffect(() => {
    if (!isMobileFlow) return
    if (!pickup && mapPickTarget === 'destination') {
      setMapPickTarget(null)
      setMobilePickupMethod(null)
      setMobileDestMethod(null)
    }
  }, [isMobileFlow, pickup, destination, mapPickTarget])

  function completeMapGuide() {
    setMapGuideSeen()
    setMapGuideActive(false)
  }

  const hasBothLocations = !!pickup && !!destination
  const mobileSheetCollapsedHeight = 120
  const mobileSheetExpandedHeight = Math.max(mobileSheetCollapsedHeight + 40, Math.round(mobileViewportHeight * 0.68))
  const mobileSheetCurrentHeight = mobileSheetExpanded ? mobileSheetExpandedHeight : mobileSheetCollapsedHeight

  const mobileSheetHandleDragRef = useRef<{ startY: number; active: boolean }>({ startY: 0, active: false })

  function endMobileSheetHandleDrag(clientY: number) {
    const { startY, active } = mobileSheetHandleDragRef.current
    if (!active) return
    mobileSheetHandleDragRef.current = { startY: 0, active: false }
    const dy = clientY - startY
    const travelDistance = Math.max(1, mobileSheetExpandedHeight - mobileSheetCollapsedHeight)
    const threshold = travelDistance * 0.3
    if (Math.abs(dy) < 12) {
      snapMobileSheet(!mobileSheetExpanded)
      return
    }
    if (mobileSheetExpanded && dy > threshold) {
      snapMobileSheet(false)
      return
    }
    if (!mobileSheetExpanded && dy < -threshold) {
      snapMobileSheet(true)
      return
    }
  }

  function onMobileSheetHandlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    mobileSheetHandleDragRef.current = { startY: e.clientY, active: true }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onMobileSheetHandlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (mobileSheetHandleDragRef.current.active) {
      endMobileSheetHandleDrag(e.clientY)
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore if capture already released
    }
  }

  function onMobileSheetHandlePointerCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    mobileSheetHandleDragRef.current = { startY: 0, active: false }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const mobileFitPadding = useMemo(() => {
    const headerHeight =
      mobileHeaderOverlayBottomPx > 0 ? mobileHeaderOverlayBottomPx : Math.round(mobileViewportHeight * 0.16)
    return {
      top: headerHeight + 24,
      right: 48,
      bottom: mobileSheetCurrentHeight + 24,
      left: 48,
    }
  }, [mobileHeaderOverlayBottomPx, mobileSheetCurrentHeight, mobileViewportHeight])

  const routeAutoFitResetKey = useMemo(() => {
    const pickupKey = pickup ? `${pickup.lat},${pickup.lng}` : 'none'
    const destinationKey = destination ? `${destination.lat},${destination.lng}` : 'none'
    return `${pickupKey}|${destinationKey}|${routeAutoFitLockKey}`
  }, [pickup, destination, routeAutoFitLockKey])

  useEffect(() => {
    const onResize = () => setMobileViewportHeight(window.innerHeight)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const pickupKey = pickup ? `${pickup.lat},${pickup.lng}` : 'none'
    const destinationKey = destination ? `${destination.lat},${destination.lng}` : 'none'
    const nextResetKey = `${pickupKey}|${destinationKey}`
    setRouteAutoFitLockKey(nextResetKey)
    setRouteAutoFitLockedByUser(false)
    setMapRecenterHint(false)
    if (pickup && destination) {
      setRouteAutoFitKey((prev) => prev + 1)
      setMapRelayoutNonce((n) => n + 1)
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng])

  useEffect(() => {
    if (!isMobileFlow || mobileHeaderOverlayBottomPx <= 0) return
    if (!pickup || !destination || routeAutoFitLockedByUser) return
    setRouteAutoFitKey((k) => k + 1)
  }, [isMobileFlow, mobileHeaderOverlayBottomPx, pickup, destination, routeAutoFitLockedByUser])

  const onMapProgrammaticFitComplete = useCallback(() => {
    setMapRecenterHint(false)
  }, [])

  const onMapCenterFabPress = useCallback(() => {
    if (pickup && destination) {
      routeMapRef.current?.fitRouteToBounds()
      setMapRecenterHint(false)
      return
    }
    requestPassengerGps('map-center')
  }, [pickup, destination, requestPassengerGps])

  const mobileSheetMapRelayoutTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const mobileViewportHeightPrevRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (mobileSheetMapRelayoutTimerRef.current) {
        window.clearTimeout(mobileSheetMapRelayoutTimerRef.current)
      }
    },
    []
  )

  function scheduleMobileSheetMapRelayout() {
    if (!isMobileFlow) return
    if (mobileSheetMapRelayoutTimerRef.current) {
      window.clearTimeout(mobileSheetMapRelayoutTimerRef.current)
    }
    mobileSheetMapRelayoutTimerRef.current = window.setTimeout(() => {
      mobileSheetMapRelayoutTimerRef.current = null
      setMapRelayoutNonce((n) => n + 1)
      if (pickup && destination && !routeAutoFitLockedByUserRef.current) {
        setRouteAutoFitKey((k) => k + 1)
      }
    }, 120)
  }

  /** Orientation / viewport changes only (skip first paint — coords effect handles initial layout). */
  useEffect(() => {
    if (!isMobileFlow) return
    const prev = mobileViewportHeightPrevRef.current
    if (prev === null) {
      mobileViewportHeightPrevRef.current = mobileViewportHeight
      return
    }
    if (prev === mobileViewportHeight) return
    mobileViewportHeightPrevRef.current = mobileViewportHeight
    const t = window.setTimeout(() => {
      setMapRelayoutNonce((n) => n + 1)
      if (pickup && destination && !routeAutoFitLockedByUserRef.current) {
        setRouteAutoFitKey((k) => k + 1)
      }
    }, 280)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to viewport height; pickup/destination read at fire time
  }, [isMobileFlow, mobileViewportHeight])

  const recentAddresses = useMemo(() => {
    const src = historyQ.data ?? []
    const unique: Location[] = []
    const seen = new Set<string>()
    for (const ride of src) {
      for (const loc of [ride.pickup, ride.destination]) {
        const key = loc.label.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(loc)
        if (unique.length >= 6) return unique
      }
    }
    return unique
  }, [historyQ.data])
  const quickDestinations = useMemo(() => {
    const saved = profileExtras.savedLocations
    if (!saved) return []
    const pool = [
      { id: 'quick-home', label: 'Kuća', address: saved.home },
      { id: 'quick-work', label: 'Posao', address: saved.work },
      ...saved.favorites.map((f) => ({ id: `quick-${f.id}`, label: f.name, address: f.address })),
    ]
    return pool.filter((item) => item.address.trim().length > 0).slice(0, 6)
  }, [profileExtras.savedLocations])
  const greeting = useMemo(() => getDayGreeting(me.profile.firstName), [me.profile.firstName])

  useLayoutEffect(() => {
    if (!isMobileFlow || typeof ResizeObserver === 'undefined') return
    const el = mobileOrderHeaderOverlayRef.current
    if (!el) return
    const measure = () => {
      const bottom = Math.ceil(el.getBoundingClientRect().bottom)
      setMobileHeaderOverlayBottomPx((prev) => (prev === bottom ? prev : bottom))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [isMobileFlow, quickDestinations.length, greeting, displayedNearbyCount, t.order.quickTo])

  const na = t.order.notAvailable
  const baseConfirmDisabled =
    !route || !!activeQ.data || mut.isPending || sameLocationByDistance
  const scheduleBlocksConfirm = orderType === 'zakazano' && !isFutureScheduleValue(scheduledLocal)
  const confirmDisabled = baseConfirmDisabled || scheduleBlocksConfirm
  const confirmScheduleGateActive = scheduleBlocksConfirm && !baseConfirmDisabled
  const confirmLabel = mut.isPending
    ? t.common.loading
    : activeQ.data
      ? t.order.activeExists
      : !route
        ? t.order.confirmDisabledHint
        : sameLocationByDistance
          ? t.order.sameLoc
          : t.order.confirm
  const confirmHint = activeQ.data
    ? t.order.activeExists
    : sameLocationByDistance
      ? t.order.sameLoc
      : confirmScheduleGateActive
        ? t.auth.scheduleDateError
        : !pickup || !destination
          ? t.order.confirmHelperFillLocations
          : !route
            ? t.order.needRoute
            : t.order.confirmHelperReady

  function focusScheduleDateTimeControl() {
    const id = isMobileFlow ? 'sched-mobile-sheet' : 'sched'
    scheduleGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => document.getElementById(id)?.focus(), 280)
  }
  const addressPlaceholder = isMobileFlow ? 'Unesite adresu' : t.order.addressPlaceholder

  function renderRecentRidesSection(embeddedInSheet?: boolean) {
    if (!historyPrefs.saveHistory) return null
    return (
      <section
        className={cn(
          'space-y-3',
          embeddedInSheet ? 'mt-6 border-t border-slate-200 pt-4' : 'mt-10 sm:mt-14'
        )}
      >
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-brand-navy">{t.order.recentRidesTitle}</h2>
          <Link
            to="/app/history"
            className="text-sm font-semibold text-brand-teal transition-colors duration-150 hover:text-brand-navy hover:underline"
          >
            {t.nav.history}
          </Link>
        </div>
        {historyQ.data && historyQ.data.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm font-medium text-slate-600">{t.history.empty}</CardContent>
          </Card>
        ) : (
          <div className={cn(isMobileFlow ? 'flex gap-3 overflow-x-auto pb-1' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
            {buildRecentRideCards(historyQ.data ?? []).map((r) => {
              const driver = r.driverId ? driverById.get(r.driverId) : undefined
              const vehicle = r.vehicleId ? vehicleById.get(r.vehicleId) : undefined
              const statusMeta = getRideStatusMeta(r.status)
              const hasDriverOrCar = !!driver || !!vehicle
              return (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-[18px] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-[1px] hover:shadow-card-hover',
                    isMobileFlow ? 'w-[82vw] shrink-0' : 'block'
                  )}
                >
                  <Card className="rounded-[18px] border-slate-200/90">
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-brand-navy">
                          {r.pickup.label} {'\u2192'} {r.destination.label}
                        </p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                            statusMeta.toneClass
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-brand-navy tabular-nums">
                          {(r.finalPrice ?? r.estimatedPrice).toFixed(2)} {t.order.bam}
                        </p>
                        <p className="text-[12px] font-medium text-slate-600">{formatRideDateTime(r.createdAt)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {hasDriverOrCar ? (
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {driver ? `${driver.firstName} ${driver.lastName}` : ''}
                            {driver && vehicle ? ' · ' : ''}
                            {vehicle ? `${vehicle.brand} ${vehicle.model}` : ''}
                          </p>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-400">{t.order.notAvailable}</p>
                        )}
                      </div>
                      {isMobileFlow ? (
                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setPickup(r.pickup)
                              setDestination(r.destination)
                              push(t.history.repeat, 'success')
                            }}
                          >
                            {t.history.repeat}
                          </Button>
                          <Button asChild variant="secondary" size="sm" className="flex-1">
                            <Link to={`/app/history/${r.id}`}>{t.history.details}</Link>
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  function renderScheduledSection(embeddedInSheet?: boolean) {
    return (
      <section
        className={cn(
          'mt-5 space-y-2.5',
          embeddedInSheet && 'border-t border-slate-200 pt-4'
        )}
      >
        <h2 className="text-lg font-semibold tracking-tight text-brand-navy">{t.order.scheduleRide}</h2>
        <p className="text-sm text-slate-700">{t.order.scheduledManageDesc}</p>
        <div className="flex justify-end">
          <Link
            to="/app/scheduled"
            className="text-sm font-semibold text-brand-teal transition-colors duration-150 hover:text-brand-navy hover:underline"
          >
            {t.nav.scheduled}
          </Link>
        </div>
        {scheduledQ.isLoading ? (
          <p className="text-sm text-slate-500">{t.common.loading}</p>
        ) : (scheduledQ.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-slate-600">{t.order.scheduledEmpty}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(scheduledQ.data ?? []).slice(0, 2).map((request) => (
              <Card key={request.id} className="rounded-[18px] border-slate-200/90">
                <CardContent className="space-y-2 p-4 text-sm">
                  <p className="font-semibold text-brand-navy">
                    {request.pickup.label} {'\u2192'} {request.destination.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {request.scheduledAt
                      ? new Date(request.scheduledAt).toLocaleString('bs-BA', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : t.order.notAvailable}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-teal">{request.status}</span>
                    <Button
                      type="button"
                      variant="outlineThin"
                      size="sm"
                      className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={async () => {
                        await cancelRideRequest(request.id, me.account.id)
                        await qc.invalidateQueries({ queryKey: ['scheduledRequests', me.profile.id] })
                        push(t.notifications.rideCancelled, 'success')
                      }}
                    >
                      {t.ride.cancel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <PageContainer className={cn('!py-0', isMobileFlow && 'max-lg:!px-0')}>
      <div
        className={cn(
          'mx-auto w-full max-w-[1200px] md:px-6 md:py-12 md:pb-12',
          !isMobileFlow && 'px-3 py-2 sm:px-4',
          isMobileFlow && 'pb-24'
        )}
      >
        {isMobileFlow ? (
          <>
            <div className="fixed inset-0 z-[50] min-h-0 lg:hidden">
              <div
                ref={(node) => {
                  mapInteractiveRef.current = node
                  mapShellGuideRef.current = node
                }}
                className="flex h-full min-h-0 w-full flex-col"
              >
                <Suspense fallback={<MapChunkFallback className="h-full w-full border-0 bg-slate-200/80" />}>
                  <RouteMap
                    ref={routeMapRef}
                    pickup={pickup}
                    destination={destination}
                    routePoints={route?.routePoints ?? []}
                    className="h-full min-h-0 w-full flex-1"
                    fillContainer
                    invalidateSizeToken={mapRelayoutNonce}
                    mapPickTarget={routeMapPickTarget}
                    onMapPick={handleMapPick}
                    onUserMapInteraction={() => {
                      setMapOverlayDismissed(true)
                      setRouteAutoFitLockedByUser(true)
                      if (pickup && destination) setMapRecenterHint(true)
                    }}
                    interactionMode="centerPin"
                    setCenterLocationLabel={t.order.setCenterLocation}
                    allowTouchInteraction
                    autoFitEnabled={isMobileFlow && !!pickup && !!destination && !routeAutoFitLockedByUser}
                    autoFitTriggerKey={routeAutoFitKey}
                    autoFitResetKey={routeAutoFitResetKey}
                    autoFitDurationMs={600}
                    autoFitPadding={mobileFitPadding}
                    onProgrammaticRouteFitComplete={onMapProgrammaticFitComplete}
                    simulationDriverMarkers={simDriverMarkers}
                  />
                </Suspense>
              </div>
            </div>

            <button
              type="button"
              className={cn(
                'fixed z-[61] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] lg:hidden',
                'text-brand-navy transition-[border-color,transform] active:scale-[0.97]',
                mapRecenterHint && pickup && destination && 'border-[#F5A623]'
              )}
              style={{
                bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileSheetCurrentHeight + 12}px)`,
                right: `calc(env(safe-area-inset-right, 0px) + 16px)`,
              }}
              onClick={onMapCenterFabPress}
              disabled={mapFabGeoLoading}
              aria-label={
                pickup && destination ? 'Centriraj prikaz na rutu' : 'Centriraj na moju lokaciju'
              }
            >
              {mapFabGeoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : pickup && destination ? (
                <Maximize2 className="h-5 w-5" strokeWidth={2} aria-hidden />
              ) : (
                <Crosshair className="h-5 w-5" strokeWidth={2} aria-hidden />
              )}
            </button>

            <div
              ref={mobileOrderHeaderOverlayRef}
              className="pointer-events-none fixed left-4 z-[60] lg:hidden"
              style={{
                top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
                right: 'calc(16px + 44px + 8px)',
              }}
            >
              <div className="pointer-events-auto rounded-2xl border border-black/[0.06] bg-[rgba(255,255,255,0.92)] px-4 py-2 shadow-lg backdrop-blur-[12px]">
                <section aria-labelledby="order-greeting-heading-mobile">
                  <header className="space-y-0.5">
                    <p className="text-[11px] font-medium leading-snug text-slate-500">{greeting}</p>
                    <h2
                      id="order-greeting-heading-mobile"
                      className="text-base font-bold leading-tight tracking-tight text-brand-navy"
                    >
                      {t.order.greetingQuestion}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-700">
                        <CloudSun className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                        14°C
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold',
                          hasDriversGreen ? 'text-emerald-700' : 'text-[#D97706]'
                        )}
                      >
                        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                          <span
                            className={cn(
                              'absolute inline-flex h-full w-full rounded-full opacity-75',
                              hasDriversGreen ? 'bg-emerald-400' : 'bg-[#FBBF24]'
                            )}
                          />
                          <span
                            className={cn(
                              'relative inline-flex h-1.5 w-1.5 rounded-full',
                              hasDriversGreen ? 'bg-emerald-600' : 'bg-[#D97706]'
                            )}
                          />
                        </span>
                        {displayedNearbyCount} {t.order.driversNearby}
                      </span>
                    </div>
                    {pickup && !hasDriversGreen ? (
                      <p className="pt-0.5 text-[10px] font-medium leading-snug text-[#B45309]">
                        {t.order.driversNearbyZeroSubtitle}
                      </p>
                    ) : null}
                    {!pickup && gpsLockState === 'blocked' && !locationHintDismissed ? (
                      <button
                        type="button"
                        className="mt-1 w-full rounded-lg bg-slate-100/90 px-2 py-1 text-left text-[10px] font-medium text-slate-600 transition hover:bg-slate-100"
                        onClick={() => setLocationHintDismissed(true)}
                      >
                        {t.order.locationOptionalHint}
                      </button>
                    ) : null}
                  </header>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500">{t.order.quickTo}</p>
                    <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-0.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {quickDestinations.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition active:scale-[0.98]"
                          onClick={() => setDestination(toQuickLocation(item))}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : null}

        {!isMobileFlow ? (
          <div className="mb-3 grid gap-3 md:mb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <Card className="relative max-lg:-mx-2 rounded-2xl border border-white/75 bg-white/28 shadow-[0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-md">
              <CardContent className="space-y-3 p-4 md:p-5">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-600">{greeting}</p>
                  <h2 className="text-xl font-extrabold text-brand-navy md:text-2xl">{t.order.greetingQuestion}</h2>
                  <div className="flex items-center gap-2 pt-1 text-xs font-semibold md:hidden">
                    <span className="text-brand-navy">⛅ 14°C</span>
                    <span className={hasDriversGreen ? 'text-emerald-700' : 'text-[#D97706]'}>
                      ● {displayedNearbyCount} {t.order.driversNearby}
                    </span>
                  </div>
                  {pickup && !hasDriversGreen ? (
                    <p className="text-xs font-medium text-[#B45309]">{t.order.driversNearbyZeroSubtitle}</p>
                  ) : null}
                  {!pickup && gpsLockState === 'blocked' && !locationHintDismissed ? (
                    <button
                      type="button"
                      className="text-left text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-navy"
                      onClick={() => setLocationHintDismissed(true)}
                    >
                      {t.order.locationOptionalHint}
                    </button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-slate-500">{t.order.quickTo}</p>
                  <div className="flex flex-wrap gap-2">
                    {quickDestinations.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-teal/50 hover:text-brand-navy"
                        onClick={() => setDestination(toQuickLocation(item))}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hidden w-full rounded-2xl border border-white/75 bg-white/28 shadow-[0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-md md:block md:max-w-[18rem]">
              <CardContent className="space-y-2 p-5">
                <p className="text-3xl font-extrabold text-brand-navy">⛅ 14°C</p>
                <p className="text-base font-semibold text-slate-700">{t.order.weatherSummary}</p>
                <p className="text-sm font-semibold text-slate-600">{userClock}</p>
                <p className={cn('text-base font-semibold', hasDriversGreen ? 'text-emerald-700' : 'text-[#D97706]')}>
                  ● {displayedNearbyCount} {t.order.driversNearby}
                </p>
                {pickup && !hasDriversGreen ? (
                  <p className="text-sm font-medium text-[#B45309]">{t.order.driversNearbyZeroSubtitle}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {driversFluctuationBanner ? (
          isMobileFlow ? (
            <div
              role="status"
              className="pointer-events-none fixed left-3 right-3 z-[58] max-lg:block lg:hidden"
              style={{
                top:
                  mobileHeaderOverlayBottomPx > 0
                    ? mobileHeaderOverlayBottomPx + 8
                    : 'calc(env(safe-area-inset-top, 0px) + 96px)',
              }}
            >
              <div className="pointer-events-auto rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-center text-[11px] font-medium leading-snug text-amber-950 shadow-md backdrop-blur-sm">
                {t.order.driversNearbyFluctuationBanner}
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2 text-center text-xs font-medium text-amber-900 shadow-sm"
            >
              {t.order.driversNearbyFluctuationBanner}
            </div>
          )
        ) : null}

        {!isMobileFlow ? (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <div className="scroll-mt-24">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-6 pb-0">
                <CardTitle>{t.nav.orderRide}</CardTitle>
                <p className="text-sm text-slate-600 lg:hidden">{t.order.mobileOrderSubtitle}</p>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div ref={addressGuideRef} className="hidden space-y-5 lg:block">
                  <PickupDestinationFields
                    onSwap={swapPickupAndDestination}
                    swapLabel={t.order.swapPickupDestination}
                    pickup={
                      <LocationSearch
                        label={t.order.pickup}
                        value={pickup}
                        onChange={setPickup}
                        placeholder={t.order.addressPlaceholder}
                        emptyHint={t.order.geocodeEmpty}
                        rightAction={
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                            disabled={geoLoading}
                            onClick={requestCurrentLocationForPickup}
                            aria-label={t.order.useCurrentLocation}
                          >
                            <Navigation className="h-4 w-4" />
                          </button>
                        }
                      />
                    }
                    destination={
                      <LocationSearch
                        label={t.order.destination}
                        value={destination}
                        onChange={setDestination}
                        placeholder={t.order.addressPlaceholder}
                        emptyHint={t.order.geocodeEmpty}
                      />
                    }
                  />
                  {sameLocationError ? (
                    <p className="text-xs font-medium text-brand-danger">
                      {t.order.sameLoc}
                    </p>
                  ) : null}
                </div>
                <div ref={scheduleGuideRef} className="space-y-4">
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-100/90 p-1">
                    <button
                      type="button"
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 ease-out',
                        orderType === 'odmah'
                          ? 'bg-yellow-400 font-bold text-slate-900 shadow-[0_8px_18px_rgba(234,179,8,0.26)] hover:scale-[1.02]'
                          : 'bg-transparent text-slate-600 hover:bg-white/60 hover:text-brand-navy'
                      )}
                      onClick={() => {
                        setOrderType('odmah')
                        setScheduleInputError(false)
                      }}
                    >
                      {t.order.now}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-transform transition-[color,background-color,box-shadow] duration-150 ease-out',
                        orderType === 'zakazano'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-white/60 hover:text-brand-navy'
                      )}
                      onClick={() => setOrderType('zakazano')}
                    >
                      {t.order.schedule}
                    </button>
                  </div>
                  {orderType === 'zakazano' ? (
                    <div
                      className={cn(
                        'space-y-2 rounded-xl p-2 -mx-2 transition-[box-shadow,background-color]',
                        scheduleInputError &&
                          'bg-red-50/90 ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                      )}
                    >
                      <Label htmlFor="sched" className="text-sm font-semibold text-slate-800">
                        {t.order.scheduleDateLabel}
                      </Label>
                      <Input
                        id="sched"
                        type="datetime-local"
                        value={scheduledLocal}
                        min={scheduleMin}
                        aria-invalid={scheduleInputError}
                        className={cn(scheduleInputError && 'border-red-400 bg-red-50/60')}
                        onChange={(e) => {
                          const next = e.target.value
                          setScheduleInputError(false)
                          setScheduledLocal(next)
                          if (next && new Date(next) < new Date()) {
                            push(t.order.pastSchedule, 'error')
                          }
                        }}
                      />
                      {scheduleInputError ? (
                        <p className="text-xs font-medium text-red-600">{t.auth.scheduleDateError}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="pt-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 min-h-0 self-start px-2 text-xs font-medium text-slate-400 hover:bg-transparent hover:text-slate-600"
                      onClick={reset}
                    >
                      {t.order.reset}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="scroll-mt-24">
          <div ref={estimateGuideRef} className="space-y-4">
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader className="p-6 pb-0">
                <CardTitle>{t.order.estimateCardTitle}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-sm">
                {orderType === 'zakazano' ? (
                  <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                      {t.order.schedule}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-indigo-900">
                      {scheduledLocal
                        ? new Date(scheduledLocal).toLocaleString('bs-BA', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : t.order.scheduleDateLabel}
                    </p>
                  </div>
                ) : null}
                {route ? (
                  <>
                    <Row
                      label={t.order.estimate}
                      value={`${route.estimatedPrice.toFixed(2)} ${t.order.bam}`}
                      emphasize
                    />
                    <Row label={t.order.distance} value={`${route.distanceKm.toFixed(2)} ${t.order.km}`} />
                    <Row label={t.order.eta} value={`~${route.durationMin} ${t.order.min}`} />
                    <Row label={t.order.payment} value={t.order.cash} />
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-slate-700">
                      <Car className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-brand-navy">{t.order.waitingRouteSelection}</p>
                      <p className="text-xs font-medium text-slate-500">{na}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <ConfirmBlock
              disabled={confirmDisabled}
              label={confirmLabel}
              hint={confirmHint}
              onClick={() => mut.mutate()}
              onDisabledActivate={
                confirmScheduleGateActive
                  ? () => {
                      setScheduleInputError(true)
                      focusScheduleDateTimeControl()
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
        ) : null}

        <div className="mt-0 space-y-0 md:space-y-4 lg:mt-10">
          {isMobileFlow ? (
            <>
            {!mobileSheetExpanded ? (
              <button
                type="button"
                className="fixed left-4 right-4 z-[69] rounded-full border border-slate-200 bg-white px-4 py-3 text-left text-base font-semibold text-brand-navy shadow-[0_8px_24px_rgba(15,23,42,0.16)] lg:hidden"
                style={{
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileSheetCollapsedHeight + 14}px)`,
                }}
                onClick={() => snapMobileSheet(true)}
                aria-label="Prikaži formu"
              >
                Gdje idete?
              </button>
            ) : null}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-[22px] border-t border-slate-200 bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)] lg:hidden"
              animate={{ height: mobileSheetCurrentHeight }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onAnimationComplete={() => scheduleMobileSheetMapRelayout()}
              onClick={() => {
                if (!mobileSheetExpanded) snapMobileSheet(true)
              }}
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem + 8px)',
              }}
            >
              <button
                type="button"
                className="mx-auto my-2.5 block h-1 w-9 shrink-0 rounded-[2px] bg-[#D1D5DB] touch-none"
                onPointerDown={onMobileSheetHandlePointerDown}
                onPointerUp={onMobileSheetHandlePointerUp}
                onPointerCancel={onMobileSheetHandlePointerCancel}
                aria-label={mobileSheetExpanded ? 'Sakrij formu' : 'Prikaži formu'}
              />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
                {mobileSheetExpanded ? (
                  <div
                    ref={scheduleGuideRef}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pb-2 pt-1"
                  >
                <h1 className="text-xl font-bold tracking-tight text-brand-navy">Gdje idete?</h1>
                <PickupDestinationFields
                  variant="sheet"
                  onSwap={swapPickupAndDestination}
                  swapLabel={t.order.swapPickupDestination}
                  pickup={
                    <LocationSearch
                      label={t.order.pickup}
                      value={pickup}
                      onChange={setPickup}
                      placeholder={addressPlaceholder}
                      emptyHint={t.order.geocodeEmpty}
                      formReset={{
                        onClick: reset,
                        ariaLabel: t.order.reset,
                        visible: Boolean(
                          pickup || destination || scheduledLocal || orderType === 'zakazano'
                        ),
                      }}
                      rightAction={
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                            onClick={() => {
                              setMapPickTarget('pickup')
                              setMobilePickupMethod('map')
                            }}
                            aria-label="Odaberi polazište na karti"
                          >
                            <MapIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                            disabled={geoLoading}
                            onClick={requestCurrentLocationForPickup}
                            aria-label={t.order.useCurrentLocation}
                          >
                            <Navigation className="h-4 w-4" />
                          </button>
                        </div>
                      }
                    />
                  }
                  destination={
                    <LocationSearch
                      label={t.order.destination}
                      value={destination}
                      onChange={setDestination}
                      placeholder={addressPlaceholder}
                      emptyHint={t.order.geocodeEmpty}
                      rightAction={
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                          onClick={() => {
                            if (!pickup) {
                              setMapPickTarget('pickup')
                              setMobilePickupMethod('map')
                              push('Prvo odaberite polazište na karti.', 'info')
                              return
                            }
                            setMapPickTarget('destination')
                            setMobileDestMethod('map')
                          }}
                          aria-label="Odaberi odredište na karti"
                        >
                          <MapIcon className="h-4 w-4" />
                        </button>
                      }
                    />
                  }
                />
                {recentAddresses.length > 0 && (!pickup || !destination) ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500">Nedavne adrese</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {recentAddresses.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                          onClick={() => {
                            if (!pickup) setPickup(loc)
                            else setDestination(loc)
                          }}
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sameLocationError ? <p className="text-xs font-medium text-brand-danger">{t.order.sameLoc}</p> : null}
                {!hasBothLocations ? (
                  <p className="text-xs font-medium text-slate-700">
                    Dodajte polazište i odredište za procjenu cijene.
                  </p>
                ) : null}

                    <div ref={estimateGuideRef}>
                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                      <CardHeader className="p-4 pb-0">
                        <CardTitle>{t.order.estimateCardTitle}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4 text-sm">
                        {hasBothLocations ? (
                          <div className="flex rounded-2xl border border-slate-200 bg-slate-100/90 p-1">
                            <button
                              type="button"
                              className={cn(
                                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 ease-out',
                                orderType === 'odmah'
                                  ? 'bg-yellow-400 font-bold text-slate-900 shadow-[0_8px_18px_rgba(234,179,8,0.26)]'
                                  : 'bg-transparent text-slate-600'
                              )}
                              onClick={() => {
                                setOrderType('odmah')
                                setScheduleInputError(false)
                              }}
                            >
                              {t.order.now}
                            </button>
                            <button
                              type="button"
                              className={cn(
                                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 ease-out',
                                orderType === 'zakazano'
                                  ? 'bg-brand-navy text-white shadow-sm'
                                  : 'bg-transparent text-slate-600'
                              )}
                              onClick={() => setOrderType('zakazano')}
                            >
                              {t.order.schedule}
                            </button>
                          </div>
                        ) : null}
                        {hasBothLocations && orderType === 'zakazano' ? (
                          <div
                            className={cn(
                              'space-y-2 rounded-xl p-2 -mx-2 transition-[box-shadow,background-color]',
                              scheduleInputError &&
                                'bg-red-50/90 ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                            )}
                          >
                            <Label htmlFor="sched-mobile-sheet" className="text-sm font-semibold text-slate-800">
                              {t.order.scheduleDateLabel}
                            </Label>
                            <Input
                              id="sched-mobile-sheet"
                              type="datetime-local"
                              value={scheduledLocal}
                              min={scheduleMin}
                              aria-invalid={scheduleInputError}
                              className={cn(scheduleInputError && 'border-red-400 bg-red-50/60')}
                              onChange={(e) => {
                                const next = e.target.value
                                setScheduleInputError(false)
                                setScheduledLocal(next)
                                if (next && new Date(next) < new Date()) {
                                  push(t.order.pastSchedule, 'error')
                                }
                              }}
                            />
                            {scheduleInputError ? (
                              <p className="text-xs font-medium text-red-600">{t.auth.scheduleDateError}</p>
                            ) : null}
                          </div>
                        ) : null}
                        {hasBothLocations && route ? (
                          <>
                            <Row
                              label={t.order.estimate}
                              value={`${route.estimatedPrice.toFixed(2)} ${t.order.bam}`}
                              emphasize
                            />
                            <Row label={t.order.distance} value={`${route.distanceKm.toFixed(2)} ${t.order.km}`} />
                            <Row label={t.order.eta} value={`~${route.durationMin} ${t.order.min}`} />
                          </>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100 text-slate-700">
                              <Car className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-brand-navy">Čekamo odabir rute...</p>
                              <p className="text-xs font-medium text-slate-500">{na}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    </div>
                    <button
                      type="button"
                      className="flex h-11 w-full shrink-0 items-center gap-3 rounded-xl bg-transparent px-0 text-sm font-semibold text-[#374151] transition active:bg-slate-50/80"
                      disabled
                      aria-label={`${t.order.payment}: ${t.order.cash}`}
                    >
                      <Wallet className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-left">{t.order.cash}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    </button>
                    <ConfirmBlock
                      disabled={confirmDisabled}
                      label={confirmLabel}
                      hint={confirmHint}
                      onClick={() => mut.mutate()}
                      onDisabledActivate={
                        confirmScheduleGateActive
                          ? () => {
                              setScheduleInputError(true)
                              focusScheduleDateTimeControl()
                            }
                          : undefined
                      }
                    />
                    {renderRecentRidesSection(true)}
                    {renderScheduledSection(true)}
                  </div>
                ) : null}
              </div>
            </motion.div>
            </>
          ) : null}

          {!isMobileFlow ? (
          <div className="space-y-3">
            <div
              ref={(node) => {
                mapInteractiveRef.current = node
                mapShellGuideRef.current = node
              }}
              className={cn(
                'group/map-shell scroll-mt-24 relative h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:h-[420px]',
                'transition-all duration-200 ease-out',
                !mapEngaged &&
                  'lg:grayscale-[0.28] lg:saturate-[0.82] lg:contrast-[0.95] lg:hover:grayscale-0 lg:hover:saturate-100 lg:hover:contrast-100 lg:focus-within:grayscale-0 lg:focus-within:saturate-100 lg:focus-within:contrast-100',
                mobileMapPicking &&
                  'max-lg:ring-2 max-lg:ring-inset max-lg:ring-[rgba(255,200,0,0.55)] max-lg:shadow-[0_0_0_2px_rgba(255,200,0,0.18)]',
                mapEngaged
                    ? 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                  : [
                      'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
                      'lg:hover:shadow-[0_10px_32px_rgb(0,0,0,0.06)] lg:focus-within:shadow-[0_10px_32px_rgb(0,0,0,0.06)]',
                      'lg:hover:scale-[1.01] lg:focus-within:scale-[1.01]',
                      'lg:hover:ring-2 lg:hover:ring-inset lg:hover:ring-[rgba(255,200,0,0.35)]',
                      'lg:focus-within:ring-2 lg:focus-within:ring-inset lg:focus-within:ring-[rgba(255,200,0,0.35)]',
                    ]
              )}
            >
              <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 hidden lg:flex lg:items-center lg:justify-between">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 p-1 shadow-ambient backdrop-blur-md">
                  <button
                    type="button"
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-150 ease-out',
                      mapPickTarget === 'pickup'
                        ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50'
                    )}
                    onClick={() => setPickMode(mapPickTarget === 'pickup' ? null : 'pickup')}
                  >
                    {t.order.mapPickPickup}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-150 ease-out',
                      mapPickTarget === 'destination'
                        ? 'border-rose-500 bg-rose-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-rose-300 hover:bg-rose-50'
                    )}
                    onClick={() => setPickMode(mapPickTarget === 'destination' ? null : 'destination')}
                  >
                    {t.order.mapPickDestination}
                  </button>
                </div>
                {mapPickTarget ? (
                  <button
                    type="button"
                    className="pointer-events-auto rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-ambient backdrop-blur-md transition hover:bg-white"
                    onClick={() => setPickMode(null)}
                  >
                    {t.order.mapPickOff}
                  </button>
                ) : null}
              </div>
              <Suspense
                fallback={
                  <MapChunkFallback className="h-full min-h-0 rounded-none border-0 bg-transparent shadow-none" />
                }
              >
                <RouteMap
                  pickup={pickup}
                  destination={destination}
                  routePoints={route?.routePoints ?? []}
                  className="h-full rounded-none border-0 shadow-none"
                  mapPickTarget={routeMapPickTarget}
                  onMapPick={handleMapPick}
                  onUserMapInteraction={() => setMapOverlayDismissed(true)}
                  interactionMode={isMobileFlow ? 'centerPin' : 'mapClick'}
                  setCenterLocationLabel={t.order.setCenterLocation}
                  allowTouchInteraction={!isMobileFlow || mobileMapPicking}
                  simulationDriverMarkers={simDriverMarkers}
                />
              </Suspense>
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-0 z-[15] rounded-2xl bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-[rgba(0,0,0,0.08)] transition-opacity duration-200 ease-out max-lg:hidden',
                  mapEngaged
                    ? 'opacity-0'
                    : 'opacity-100 group-hover/map-shell:opacity-[0.35] group-focus-within/map-shell:opacity-[0.35]'
                )}
              />
              {showMapOverlay ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center rounded-b-2xl px-4 pb-3 pt-10 opacity-100 transition-opacity duration-200 ease-out group-hover/map-shell:opacity-0 group-focus-within/map-shell:opacity-0"
                  aria-hidden
                >
                  <p className="max-w-[280px] rounded-full border border-white/40 bg-white/65 px-3 py-1.5 text-center text-[11px] font-medium leading-snug text-slate-700/90 shadow-md backdrop-blur-xl backdrop-saturate-150">
                    {t.order.mapOverlayHint}
                  </p>
                </div>
              ) : null}
            </div>
            {routeQuery.isFetching ? (
              <p className="text-center text-xs text-slate-500">{t.common.loading}</p>
            ) : null}
            {routeErr === 'outside' ? (
              <p className="text-center text-xs font-medium text-brand-danger">{t.order.outsideZone}</p>
            ) : null}
            {sameLocationError ? (
              <p className="text-center text-xs font-medium text-brand-danger">
                {t.order.sameLoc}
              </p>
            ) : null}
          </div>
          ) : null}
        </div>

      {mobileMapPicking && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-[400] bg-white"
              role="dialog"
              aria-modal="true"
              aria-label={t.order.mapFullscreenTitle}
            >
              <div className="absolute inset-x-0 top-0 z-[10] border-b border-black/[0.08] bg-white/95 px-4 py-3 backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold tracking-tight text-brand-navy">{t.order.mapFullscreenTitle}</h3>
                  <button
                    type="button"
                    onClick={closeMobileMapPicker}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.1] bg-white text-slate-700 active:scale-[0.98]"
                    aria-label={t.common.close}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              {showMobileMapHint ? (
                <div className="pointer-events-none absolute inset-x-0 top-16 z-[11] flex justify-center px-4">
                  <p className="rounded-full border border-white/50 bg-white/90 px-4 py-2 text-center text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
                    {t.order.mapMoveHint}
                  </p>
                </div>
              ) : null}

              <Suspense fallback={<MapChunkFallback className="h-full min-h-[50dvh] rounded-none border-0 bg-slate-200/80" />}>
                <RouteMap
                  pickup={pickup}
                  destination={destination}
                  routePoints={route?.routePoints ?? []}
                  className="h-full"
                  mapPickTarget={routeMapPickTarget}
                  onMapPick={handleMapPick}
                  onUserMapInteraction={() => {
                    setMapOverlayDismissed(true)
                    setShowMobileMapHint(false)
                  }}
                  interactionMode="centerPin"
                  setCenterLocationLabel={t.order.setCenterLocation}
                  allowTouchInteraction
                  fullscreen
                  simulationDriverMarkers={simDriverMarkers}
                />
              </Suspense>

              {mapPickTarget === 'pickup' ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[12] flex justify-center px-4">
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={requestCurrentLocationForPickup}
                    className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-black/[0.1] bg-white/95 px-4 py-2 text-xs font-bold text-brand-navy shadow-lg active:scale-[0.98] disabled:opacity-60"
                  >
                    {geoLoading ? t.common.loading : t.order.useCurrentLocation}
                  </button>
                </div>
              ) : null}
            </motion.div>,
            document.body
          )
        : null}

      {mobileGpsPromptOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[500] flex items-end bg-slate-950/35 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center sm:pb-0"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-gps-title"
            >
              <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Navigation className="h-5 w-5" aria-hidden />
                </div>
                <h2 id="mobile-gps-title" className="text-lg font-extrabold tracking-tight text-brand-navy">
                  {getGuestLang() === 'en' ? 'Allow GPS location?' : 'Dozvoliti GPS lokaciju?'}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  {getGuestLang() === 'en'
                    ? 'UrbanFlow uses your location to set pickup faster, show nearby drivers, and estimate arrival time. If you decline, you can still enter addresses manually.'
                    : 'UrbanFlow koristi lokaciju za brže postavljanje polazišta, prikaz najbližih vozača i precizniju procjenu dolaska. Ako odbijete, adrese i dalje možete unositi ručno.'}
                </p>
                <div className="mt-5 grid gap-3">
                  <Button type="button" className="w-full" onClick={allowMobileGpsPrompt}>
                    {getGuestLang() === 'en' ? 'Allow GPS' : 'Dozvoli GPS'}
                  </Button>
                  <Button type="button" variant="secondary" className="w-full" onClick={denyMobileGpsPrompt}>
                    {getGuestLang() === 'en' ? 'Not now' : 'Ne sada'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {!isMobileFlow ? renderRecentRidesSection() : null}
      {!isMobileFlow ? renderScheduledSection() : null}

      <MapLocationOnboarding
        open={mapGuideActive}
        step={mapGuideStep}
        mapRef={mapShellGuideRef}
        inputsRef={isMobileFlow ? scheduleGuideRef : addressGuideRef}
        estimateRef={estimateGuideRef}
        messages={{
          badge: t.order.mapGuideBadge,
          step1: isMobileFlow ? t.order.mapGuideStep1Mobile : t.order.mapGuideStep1,
          step2: isMobileFlow ? t.order.mapGuideStep2Mobile : t.order.mapGuideStep2,
          step3: isMobileFlow ? t.order.mapGuideStep3Mobile : t.order.mapGuideStep3,
          gotIt: t.order.mapGuideGotIt,
          skip: t.order.mapGuideSkip,
        }}
        onStepChange={setMapGuideStep}
        onComplete={completeMapGuide}
      />
      </div>
    </PageContainer>
  )
}

type RecentRideCardItem = {
  id: string
  pickup: Location
  destination: Location
  status: string
  createdAt: string
  driverId?: string
  vehicleId?: string
  estimatedPrice: number
  finalPrice?: number
}

function buildRecentRideCards(rides: RecentRideCardItem[]) {
  const keep: typeof rides = []
  for (const ride of rides) {
    const duplicate = keep.some((x) => {
      if (x.pickup.label !== ride.pickup.label || x.destination.label !== ride.destination.label) return false
      if (x.status !== ride.status) return false
      const delta = Math.abs(new Date(x.createdAt).getTime() - new Date(ride.createdAt).getTime())
      return delta < 3 * 60 * 60 * 1000
    })
    if (!duplicate) keep.push(ride)
    if (keep.length >= 3) break
  }
  return keep
}

function formatRideDateTime(iso: string): string {
  return new Date(iso).toLocaleString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getRideStatusMeta(status: string): { label: string; toneClass: string } {
  if (status === 'zavrsena') {
    return {
      label: 'Završena',
      toneClass: 'bg-emerald-100 text-emerald-700',
    }
  }
  if (status === 'otkazana') {
    return {
      label: 'Otkazana',
      toneClass: 'bg-rose-100 text-rose-700',
    }
  }
  if (status === 'u_toku') {
    return {
      label: 'U toku',
      toneClass: 'bg-amber-100 text-amber-700',
    }
  }
  return {
    label: 'U obradi',
    toneClass: 'bg-slate-100 text-slate-700',
  }
}

function Row({
  label,
  value,
  emphasize,
  muted,
}: {
  label: string
  value: string
  emphasize?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-b border-black/[0.08] last:border-0',
        emphasize ? 'py-4 first:pt-2' : 'py-3 first:pt-2'
      )}
    >
      <span className="min-w-0 break-words text-xs font-semibold leading-snug tracking-wide text-slate-600">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 justify-self-end text-right tabular-nums break-words leading-snug',
          emphasize && 'text-base font-extrabold leading-none tracking-tight text-brand-navy whitespace-nowrap',
          !emphasize && !muted && 'text-sm font-semibold text-brand-navy',
          muted && 'text-sm font-normal italic text-slate-400/95'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ConfirmBlock({
  disabled,
  label,
  hint,
  onClick,
  onDisabledActivate,
}: {
  disabled: boolean
  label: string
  hint: string
  onClick: () => void
  /** Kada je gumb vizualno onemogućen zbog pravila (npr. zakazivanje), hvata klik i pokreće povratnu informaciju. */
  onDisabledActivate?: () => void
}) {
  const captureDisabledClick = Boolean(disabled && onDisabledActivate)
  return (
    <div className="relative w-full">
      <Button variant="cta" className="w-full" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
      {captureDisabledClick ? (
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-0 z-[2] cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-transparent"
          aria-label={`${label}: ${hint}`}
          onClick={(e) => {
            e.preventDefault()
            onDisabledActivate?.()
          }}
        />
      ) : null}
      <p className="mt-2 text-center text-xs font-medium text-slate-500">{hint}</p>
    </div>
  )
}

function getDayGreeting(name: string): string {
  const h = new Date().getHours()
  if (h < 12) return `Dobro jutro, ${name}`
  if (h < 18) return `Dobar dan, ${name}`
  return `Dobro veče, ${name}`
}

function toQuickLocation(item: { id: string; label: string; address: string }): Location {
  return {
    id: item.id,
    label: item.label,
    address: item.address,
    lat: 43.8563,
    lng: 18.4131,
    zoneId: 'sarajevo',
  }
}
