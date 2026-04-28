import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Map as MapIcon, MapPin, Navigation, Search, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Location, OrderType } from '../types/domain'
import { calculateRoute, createLocationFromMapClick, isInServiceZone } from '../services/locationApi'
import { createRideRequest, getActiveRide, getRideHistory } from '../services/rideApi'
import { formatBsDate } from '../utils/date'
import { useToastStore } from '../store/notificationStore'
import { LocationSearch } from '../components/ride/LocationSearch'
import { MapChunkFallback } from '../components/map/MapChunkFallback'

const RouteMap = lazy(() => import('../components/map/RouteMap'))
import { PageContainer } from '../components/layout/PageContainer'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { MapLocationOnboarding } from '../components/onboarding/MapLocationOnboarding'
import { hasSeenMapGuide, setMapGuideSeen } from '../lib/mapGuideStorage'
import { getHistoryPrivacyPrefs } from '../lib/historyPrivacy'
import { haversineKm } from '../utils/distance'

type MobileLocMethod = 'map' | 'address' | null
const SEARCH_REQUEST_KEY = 'urbanflow_search_request_id'

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
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const loc = useLocation() as { state?: { pickup?: Location; destination?: Location } }
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
  const addressGuideRef = useRef<HTMLDivElement>(null)
  const scheduleGuideRef = useRef<HTMLDivElement>(null)
  const mapShellGuideRef = useRef<HTMLDivElement>(null)
  const mapInteractiveRef = useRef<HTMLDivElement>(null)
  const estimateGuideRef = useRef<HTMLDivElement>(null)
  const isMobileFlow = useIsMobileOrderFlow()
  const [sameLocationError, setSameLocationError] = useState(false)
  const [demoNoDriverMode, setDemoNoDriverMode] = useState(false)
  const historyPrefs = getHistoryPrivacyPrefs(me.account.id)

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
      try {
        sessionStorage.setItem(SEARCH_REQUEST_KEY, res.request.id)
      } catch {
        // ignore storage issues in private mode
      }
      navigate('/app/searching', {
        state: { requestId: res.request.id, forceNoDriversDemo: demoNoDriverMode },
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
    setDemoNoDriverMode(false)
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
        if (isMobileFlow) setMapPickTarget('destination')
        else setMapPickTarget(null)
      } else if (mapPickTarget === 'destination') {
        setDestination(loc)
        setMobileDestMethod(null)
        setMapPickTarget(null)
      }
    },
    [isMobileFlow, mapPickTarget, push, t.order.outsideZone]
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
      if (isMobileFlow) setMapPickTarget('destination')
      else setMapPickTarget(null)
    })()
  }

  function requestCurrentLocationForPickup() {
    if (!navigator.geolocation) {
      push(t.order.geoUnsupported, 'error')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPickupFromCoords(pos.coords.latitude, pos.coords.longitude)
        setGeoLoading(false)
      },
      () => {
        push(t.order.geoDenied, 'error')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    )
  }

  function setPickMode(next: 'pickup' | 'destination' | null) {
    setMapOverlayDismissed(true)
    setMobilePickupMethod(null)
    setMobileDestMethod(null)
    setMapPickTarget(next)
  }

  const na = t.order.notAvailable
  const showMapOverlay =
    !isMobileFlow && !mapGuideActive && !mapOverlayDismissed && !mapPickTarget
  const mobileMapPicking =
    isMobileFlow &&
    ((mapPickTarget === 'pickup' && mobilePickupMethod === 'map') ||
      (mapPickTarget === 'destination' && mobileDestMethod === 'map'))
  const routeMapPickTarget = !isMobileFlow ? mapPickTarget : mobileMapPicking ? mapPickTarget : null
  const mapEngaged = !!mapPickTarget || mapOverlayDismissed

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

  useEffect(() => {
    if (!isMobileFlow) return
    if (!pickup && mapPickTarget === 'destination') {
      setMapPickTarget('pickup')
      setMobilePickupMethod(null)
      setMobileDestMethod(null)
      return
    }
    if (!pickup && !destination && mapPickTarget === null) {
      setMapPickTarget('pickup')
      setMobileDestMethod(null)
    }
    if (pickup && !destination && mapPickTarget === null) {
      setMapPickTarget('destination')
      setMobilePickupMethod(null)
    }
  }, [isMobileFlow, pickup, destination, mapPickTarget])

  function completeMapGuide() {
    setMapGuideSeen()
    setMapGuideActive(false)
  }

  const stepTitle =
    !pickup ? t.order.stepPickup : !destination ? t.order.stepDestination : t.order.stepReady
  const canPickDestinationMobile = pickup != null

  const confirmDisabled = !route || !!activeQ.data || mut.isPending
    || sameLocationByDistance
  const confirmLabel = mut.isPending
    ? t.common.loading
    : activeQ.data
      ? t.order.activeExists
      : !route
        ? t.order.confirmDisabledHint
        : sameLocationByDistance
          ? t.order.sameLoc
        : t.order.confirm

  return (
    <PageContainer className="!py-6 max-lg:pb-40">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="order-3 scroll-mt-24 lg:order-none lg:col-span-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.nav.orderRide}</CardTitle>
                <p className="text-sm text-slate-600 lg:hidden">{t.order.mobileOrderSubtitle}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div ref={addressGuideRef} className="hidden space-y-5 lg:block">
                  <LocationSearch
                    label={t.order.pickup}
                    value={pickup}
                    onChange={setPickup}
                    placeholder={t.order.addressPlaceholder}
                    emptyHint={t.order.geocodeEmpty}
                  />
                  <LocationSearch
                    label={t.order.destination}
                    value={destination}
                    onChange={setDestination}
                    placeholder={t.order.addressPlaceholder}
                    emptyHint={t.order.geocodeEmpty}
                  />
                  {sameLocationError ? (
                    <p className="text-xs font-medium text-brand-danger">
                      Polaziste i odrediste ne mogu biti ista lokacija.
                    </p>
                  ) : null}
                </div>
                <div ref={scheduleGuideRef} className="space-y-4">
                  <div className="flex rounded-2xl border border-black/[0.12] bg-slate-100/90 p-1">
                    <button
                      type="button"
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-150 ease-out',
                        orderType === 'odmah'
                          ? 'bg-brand-navy text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-white/60 hover:text-brand-navy'
                      )}
                      onClick={() => setOrderType('odmah')}
                    >
                      {t.order.now}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-150 ease-out',
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
                    <div className="space-y-2">
                      <Label htmlFor="sched" className="text-sm font-semibold text-slate-800">
                        {t.order.scheduleDateLabel}
                      </Label>
                      <Input
                        id="sched"
                        type="datetime-local"
                        value={scheduledLocal}
                        min={scheduleMin}
                        onChange={(e) => {
                          const next = e.target.value
                          setScheduledLocal(next)
                          if (next && new Date(next) < new Date()) {
                            push(t.order.pastSchedule, 'error')
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="pt-0.5">
                    <label className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brand-navy"
                        checked={demoNoDriverMode}
                        onChange={(e) => setDemoNoDriverMode(e.target.checked)}
                      />
                      <span>
                        {t.order.demoNoDriverToggle}
                      </span>
                    </label>
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

        <div className="order-1 space-y-3 lg:order-none lg:col-span-5 lg:space-y-4">
          <Card className="hidden p-6 shadow-card lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{t.order.mapPick}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ease-out',
                  mapPickTarget === 'pickup'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'border border-black/[0.12] bg-white text-slate-800 shadow-sm hover:border-black/[0.18]'
                )}
                onClick={() => setPickMode(mapPickTarget === 'pickup' ? null : 'pickup')}
              >
                {t.order.mapPickPickup}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ease-out',
                  mapPickTarget === 'destination'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'border border-black/[0.12] bg-white text-slate-800 shadow-sm hover:border-black/[0.18]'
                )}
                onClick={() => setPickMode(mapPickTarget === 'destination' ? null : 'destination')}
              >
                {t.order.mapPickDestination}
              </button>
              {mapPickTarget ? (
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-brand-navy"
                  onClick={() => setPickMode(null)}
                >
                  {t.order.mapPickOff}
                </button>
              ) : null}
            </div>
            {mapPickTarget ? (
              <p className="mt-3 text-xs font-medium text-brand-teal">{t.order.mapPickHint}</p>
            ) : null}
          </Card>

          <div className="lg:hidden sticky top-0 z-40 -mx-4 border-b border-black/[0.08] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md sm:-mx-6">
            <p className="mb-3 text-center text-[13px] font-extrabold leading-snug text-brand-navy">{stepTitle}</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPickMode(mapPickTarget === 'pickup' ? null : 'pickup')}
                className={cn(
                  'flex w-full min-h-[52px] items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors',
                  mapPickTarget === 'pickup'
                    ? 'border-brand-yellow bg-amber-50/90 shadow-sm'
                    : 'border-black/[0.08] bg-white hover:border-black/[0.14]'
                )}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Navigation className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t.order.pickup}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-brand-navy">
                    {pickup?.label ?? t.order.tapSelectPickup}
                  </span>
                </span>
              </button>
              {mapPickTarget === 'pickup' ? (
                <div className="space-y-2 border-t border-black/[0.06] pt-2">
                  {mobilePickupMethod === null ? (
                    <>
                      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t.order.locMethodHow}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setMobilePickupMethod('address')}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/[0.08] bg-white px-1 py-2 text-brand-navy shadow-sm active:scale-[0.98]"
                        >
                          <Search className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="text-center text-[11px] font-extrabold leading-tight">
                            {t.order.methodAddressShort}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobilePickupMethod('map')}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/[0.08] bg-white px-1 py-2 text-brand-navy shadow-sm active:scale-[0.98]"
                        >
                          <MapIcon className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="text-center text-[11px] font-extrabold leading-tight">
                            {t.order.methodMapShort}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={geoLoading}
                          onClick={() => requestCurrentLocationForPickup()}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/[0.08] bg-white px-1 py-2 text-brand-navy shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                          <Navigation className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="text-center text-[11px] font-extrabold leading-tight">
                            {geoLoading ? t.common.loading : t.order.methodHereShort}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : mobilePickupMethod === 'address' ? (
                    <div className="space-y-2">
                      <LocationSearch
                        label={t.order.pickup}
                        value={pickup}
                        onChange={(loc) => {
                          setPickup(loc)
                          if (loc) {
                            setMobilePickupMethod(null)
                            setMapPickTarget('destination')
                          }
                        }}
                        placeholder={t.order.addressPlaceholder}
                        emptyHint={t.order.geocodeEmpty}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-full text-xs font-semibold text-slate-600"
                        onClick={() => setMobilePickupMethod(null)}
                      >
                        {t.order.changeLocMethod}
                      </Button>
                    </div>
                  ) : mobilePickupMethod === 'map' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full text-xs font-semibold text-slate-600"
                      onClick={() => setMobilePickupMethod(null)}
                    >
                      {t.order.changeLocMethod}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                disabled={isMobileFlow && !canPickDestinationMobile}
                onClick={() => {
                  if (isMobileFlow && !canPickDestinationMobile) return
                  setPickMode(mapPickTarget === 'destination' ? null : 'destination')
                }}
                className={cn(
                  'flex w-full min-h-[52px] items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors',
                  mapPickTarget === 'destination'
                    ? 'border-brand-yellow bg-amber-50/90 shadow-sm'
                    : 'border-black/[0.08] bg-white hover:border-black/[0.14]',
                  isMobileFlow && !canPickDestinationMobile && 'opacity-50'
                )}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t.order.destination}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-brand-navy">
                    {destination?.label ?? t.order.tapSelectDestination}
                  </span>
                </span>
              </button>
              {mapPickTarget === 'destination' ? (
                <div className="space-y-2 border-t border-black/[0.06] pt-2">
                  {mobileDestMethod === null ? (
                    <>
                      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t.order.locMethodHow}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMobileDestMethod('address')}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/[0.08] bg-white px-2 py-2 text-brand-navy shadow-sm active:scale-[0.98]"
                        >
                          <Search className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="text-center text-[11px] font-extrabold leading-tight">
                            {t.order.methodAddressShort}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobileDestMethod('map')}
                          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-black/[0.08] bg-white px-2 py-2 text-brand-navy shadow-sm active:scale-[0.98]"
                        >
                          <MapIcon className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="text-center text-[11px] font-extrabold leading-tight">
                            {t.order.methodMapShort}
                          </span>
                        </button>
                      </div>
                    </>
                  ) : mobileDestMethod === 'address' ? (
                    <div className="space-y-2">
                      <LocationSearch
                        label={t.order.destination}
                        value={destination}
                        onChange={(loc) => {
                          setDestination(loc)
                          if (loc) {
                            setMobileDestMethod(null)
                            setMapPickTarget(null)
                          }
                        }}
                        placeholder={t.order.addressPlaceholder}
                        emptyHint={t.order.geocodeEmpty}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-full text-xs font-semibold text-slate-600"
                        onClick={() => setMobileDestMethod(null)}
                      >
                        {t.order.changeLocMethod}
                      </Button>
                    </div>
                  ) : mobileDestMethod === 'map' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full text-xs font-semibold text-slate-600"
                      onClick={() => setMobileDestMethod(null)}
                    >
                      {t.order.changeLocMethod}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div
              ref={(node) => {
                mapInteractiveRef.current = node
                mapShellGuideRef.current = node
              }}
              className={cn(
                'group/map-shell scroll-mt-24 relative overflow-hidden rounded-2xl border border-black/[0.12] bg-slate-100',
                'max-lg:-mx-4 max-lg:rounded-none max-lg:border-x-0 max-lg:border-y',
                'transition-all duration-200 ease-out',
                mobileMapPicking &&
                  'max-lg:ring-2 max-lg:ring-inset max-lg:ring-[rgba(255,200,0,0.55)] max-lg:shadow-[0_0_0_2px_rgba(255,200,0,0.18)]',
                mapEngaged
                  ? 'shadow-[0_4px_16px_rgba(0,0,0,0.10)]'
                  : [
                      'shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
                      'lg:hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] lg:focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
                      'lg:hover:scale-[1.01] lg:focus-within:scale-[1.01]',
                      'lg:hover:ring-2 lg:hover:ring-inset lg:hover:ring-[rgba(255,200,0,0.35)]',
                      'lg:focus-within:ring-2 lg:focus-within:ring-inset lg:focus-within:ring-[rgba(255,200,0,0.35)]',
                    ]
              )}
            >
              <Suspense
                fallback={
                  <MapChunkFallback className="min-h-[260px] rounded-none border-0 bg-transparent shadow-none lg:min-h-[420px]" />
                }
              >
                <RouteMap
                  pickup={pickup}
                  destination={destination}
                  routePoints={route?.routePoints ?? []}
                  className="rounded-none border-0 shadow-none"
                  mapPickTarget={routeMapPickTarget}
                  onMapPick={handleMapPick}
                  onUserMapInteraction={() => setMapOverlayDismissed(true)}
                  interactionMode={isMobileFlow ? 'centerPin' : 'mapClick'}
                  setCenterLocationLabel={t.order.setCenterLocation}
                  allowTouchInteraction={!isMobileFlow || mobileMapPicking}
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
                Polaziste i odrediste ne mogu biti ista lokacija.
              </p>
            ) : null}
          </div>
        </div>

        <div className="order-2 space-y-6 lg:order-none lg:col-span-3">
          <div ref={estimateGuideRef} className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>{t.order.estimateCardTitle}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <Row
                  label={t.order.estimate}
                  value={route ? `${route.estimatedPrice.toFixed(2)} ${t.order.bam}` : na}
                  emphasize={!!route}
                  muted={!route}
                />
                <Row label={t.order.distance} value={route ? `${route.distanceKm.toFixed(2)} ${t.order.km}` : na} muted={!route} />
                <Row label={t.order.eta} value={route ? `~${route.durationMin} ${t.order.min}` : na} muted={!route} />
                <Row label={t.order.payment} value={t.order.cash} />
              </CardContent>
            </Card>
          </div>
          <div className="hidden lg:block">
            <ConfirmBlock
              disabled={confirmDisabled}
              label={confirmLabel}
              onClick={() => mut.mutate()}
            />
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-black/[0.08] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
        role="region"
        aria-label={t.order.confirm}
      >
        <div className="mx-auto w-full max-w-6xl">
          <ConfirmBlock disabled={confirmDisabled} label={confirmLabel} onClick={() => mut.mutate()} />
          {activeQ.data ? <p className="mt-2 text-center text-xs text-amber-800">{t.order.activeExists}</p> : null}
          {sameLocationError ? (
            <p className="mt-2 text-center text-xs text-brand-danger">
              Polaziste i odrediste ne mogu biti ista lokacija.
            </p>
          ) : null}
        </div>
      </div>

      {mobileMapPicking ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[120] bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={t.order.mapFullscreenTitle}
        >
          <div className="absolute inset-x-0 top-0 z-[950] border-b border-black/[0.08] bg-white/95 px-4 py-3 backdrop-blur-md">
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
            <div className="pointer-events-none absolute inset-x-0 top-16 z-[960] flex justify-center px-4">
              <p className="rounded-full border border-white/50 bg-white/90 px-4 py-2 text-center text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
                {t.order.mapMoveHint}
              </p>
            </div>
          ) : null}

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
          />

          {mapPickTarget === 'pickup' ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[950] flex justify-center px-4">
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
        </motion.div>
      ) : null}

      {!historyPrefs.saveHistory ? null : (
        <section className="mt-12 space-y-4 sm:mt-14">
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
              <CardContent className="py-6 text-sm font-medium text-slate-600">
                {t.history.empty}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {historyQ.data?.slice(0, 3).map((r) => (
                <Card
                  key={r.id}
                  className="transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-[2px] hover:shadow-card-hover"
                >
                  <CardContent className="flex flex-col gap-3 py-6 text-sm">
                    <p className="order-3 text-xs font-medium text-slate-500">{formatBsDate(r.createdAt)}</p>
                    <p className="order-1 text-[15px] font-extrabold leading-snug text-brand-navy">
                      {r.pickup.label} → {r.destination.label}
                    </p>
                    <p className="order-2 text-sm font-bold tabular-nums tracking-tight text-brand-navy whitespace-nowrap">
                      {(r.finalPrice ?? r.estimatedPrice).toFixed(2)} {t.order.bam}
                    </p>
                    <Link
                      to={`/app/history/${r.id}`}
                      className="order-4 w-fit text-sm font-semibold text-brand-teal no-underline decoration-brand-teal underline-offset-4 transition-colors duration-150 hover:text-brand-navy hover:underline hover:decoration-brand-navy"
                    >
                      {t.history.details}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

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
    </PageContainer>
  )
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
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button variant="cta" className="w-full" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  )
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
