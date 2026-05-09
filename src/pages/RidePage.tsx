import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { demoGlassDividerClass, demoGlassPanelClass } from '../lib/demoGlassPanel'
import { cn } from '../lib/utils'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { Ride, RideStatus } from '../types/domain'
import { generateDriverStartNearPickup } from '../utils/driverSim'
import { buildDriverAnimationPath } from '../utils/driverRouteAnimation'
import { distanceAlongPolylineKm, haversineKm } from '../utils/distance'
import { interpolateRoute, pointAlongPolyline } from '../utils/route'
import { fetchRoadRoute } from '../services/routingApi'
import {
  cancelRide,
  confirmPassengerEnteredVehicle,
  getDriverById,
  getRideById,
  getVehicleById,
  resetAllDriversAvailable,
  setRideStatus,
  updateDriverSimPosition,
} from '../services/rideApi'
import { resetDb } from '../services/mockDb'
import { useDriverSimStore } from '../store/driverSimStore'
import { useToastStore } from '../store/notificationStore'
import { MapChunkFallback } from '../components/map/MapChunkFallback'

const ActiveRideMap = lazy(() => import('../components/map/ActiveRideMap'))
import { RideStatusBadge } from '../components/common/StatusBadge'
import { RideDriverCard } from '../components/ride/RideDriverCard'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

function useIsMobileRideLayout() {
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

export function RidePage() {
  const t = strings()
  const { id } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const isMobileRide = useIsMobileRideLayout()
  const simSpeed = useDriverSimStore((s) => s.simSpeed)
  const setSimSpeed = useDriverSimStore((s) => s.setSimSpeed)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [demoOpen, setDemoOpen] = useState(true)
  const [forcePending, setForcePending] = useState(false)
  const [followTaxi, setFollowTaxi] = useState(true)
  const [showArrivalPopup, setShowArrivalPopup] = useState(false)
  const [driverPosSim, setDriverPosSim] = useState<{ lat: number; lng: number } | null>(null)
  const [driverOriginState, setDriverOriginState] = useState<{ lat: number; lng: number } | null>(null)
  const [driverStartDistanceKm, setDriverStartDistanceKm] = useState<number | null>(null)
  /** Full road approach path while driving to pickup (map preview line matches sim polyline). */
  const [driverApproachPolyline, setDriverApproachPolyline] = useState<Array<{ lat: number; lng: number }> | null>(
    null
  )
  const rideMarkerRef = useRef<string | null>(null)
  const driverOriginRef = useRef<{ lat: number; lng: number } | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const animCancelRef = useRef<(() => void) | null>(null)
  const simRunIdRef = useRef(0)
  const speedRef = useRef(simSpeed)
  const simStatusRef = useRef<
    'assigned' | 'driver_on_way' | 'driver_arrived' | 'ride_in_progress' | 'completed' | 'cancelled' | null
  >(null)

  const rideQuery = useQuery({
    queryKey: ['ride', id],
    queryFn: () => getRideById(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku'].includes(s)
        ? Math.max(70, Math.round(1200 / simSpeed))
        : false
    },
  })

  const ride = rideQuery.data
  const status = ride?.status
  const rideId = ride?.id

  const rideRef = useRef(ride)
  useEffect(() => {
    rideRef.current = ride
  }, [ride])

  const driverQuery = useQuery({
    queryKey: ['driver', ride?.driverId],
    queryFn: () => getDriverById(ride!.driverId),
    enabled: !!ride?.driverId,
  })
  const vehicleQuery = useQuery({
    queryKey: ['vehicle', ride?.vehicleId],
    queryFn: () => getVehicleById(ride!.vehicleId),
    enabled: !!ride?.vehicleId,
  })

  const driverPos = useMemo(() => {
    if (driverPosSim) return driverPosSim
    if (!ride) return { lat: 43.856, lng: 18.41 }
    return {
      lat: ride.driverLat ?? ride.pickup.lat,
      lng: ride.driverLng ?? ride.pickup.lng,
    }
  }, [driverPosSim, ride])

  const driverPosRef = useRef(driverPos)
  driverPosRef.current = driverPos

  useEffect(() => {
    if (status !== 'vozac_na_putu') {
      setDriverApproachPolyline(null)
    }
  }, [status])

  useEffect(() => {
    if (!rideId || !ride) return
    if (rideMarkerRef.current !== rideId) {
      rideMarkerRef.current = rideId
      const existing = ride.driverLat != null && ride.driverLng != null
        ? { lat: ride.driverLat, lng: ride.driverLng }
        : null
      const chosenStart = existing ?? generateDriverStartNearPickup(ride.pickup)
      const dKm = haversineKm(chosenStart, ride.pickup)
      const mustRegenerate = !existing || dKm < 0.2 || dKm > 3
      const start = mustRegenerate ? generateDriverStartNearPickup(ride.pickup) : chosenStart
      driverOriginRef.current = start
      setDriverOriginState(start)
      setDriverPosSim(start)
      setDriverStartDistanceKm(haversineKm(start, ride.pickup))
      if (mustRegenerate) {
        void updateDriverSimPosition(rideId, start.lat, start.lng)
      }
    }
  }, [ride, rideId])

  const distPickup = ride ? haversineKm(driverPos, ride.pickup) : 0

  const scaledDelay = useMemo(
    () => (baseMs: number) => Math.max(35, Math.round(baseMs / simSpeed)),
    [simSpeed]
  )

  useEffect(() => {
    speedRef.current = simSpeed
  }, [simSpeed])

  function cancelActiveAnimation() {
    animCancelRef.current?.()
    animCancelRef.current = null
    if (animationFrameIdRef.current !== null) {
      window.cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
  }

  function stopSimulationRun() {
    simRunIdRef.current += 1
    cancelActiveAnimation()
  }

  const setRideStatusSafe = useCallback(async (next: RideStatus) => {
    if (!rideId) return false
    const res = await setRideStatus(rideId, next, me.account.id)
    if ('error' in res) {
      push(`${strings().common.error} (${res.error})`, 'error')
      return false
    }
    await qc.invalidateQueries({ queryKey: ['ride', rideId] })
    await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
    await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
    return true
  }, [me.account.id, me.profile.id, push, qc, rideId])

  const animateMarkerAlongRoute = useCallback((
    routeCoordinates: Array<{ lat: number; lng: number }>,
    onDone: () => void,
    explicitDistanceKm?: number
  ) => {
    if (routeCoordinates.length < 2) {
      onDone()
      return () => undefined
    }
    let cancelled = false
    let persistStamp = 0
    const measuredKm = explicitDistanceKm ?? distanceAlongPolylineKm(routeCoordinates)
    // ~6s/km, clamped to keep short rides snappy and long rides watchable.
    const baseDuration = Math.max(8_000, Math.min(180_000, Math.round(measuredKm * 6_000)))
    let progress = 0
    let lastTs = 0
    const step = (now: number) => {
      if (cancelled) return
      if (!lastTs) {
        lastTs = now
      }
      const delta = Math.max(0, now - lastTs)
      lastTs = now
      const progressDelta = (delta / baseDuration) * speedRef.current
      progress = Math.min(1, progress + progressDelta)
      const p = pointAlongPolyline(routeCoordinates, progress)
      setDriverPosSim({ lat: p.lat, lng: p.lng })
      if (now - persistStamp >= 450 && rideId) {
        persistStamp = now
        void updateDriverSimPosition(rideId, p.lat, p.lng)
      }
      if (progress >= 1) {
        if (rideId) void updateDriverSimPosition(rideId, p.lat, p.lng)
        animationFrameIdRef.current = null
        onDone()
        return
      }
      animationFrameIdRef.current = window.requestAnimationFrame(step)
    }
    animationFrameIdRef.current = window.requestAnimationFrame(step)
    return () => {
      cancelled = true
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
    }
  }, [rideId])

  function runDemoStatus(next: RideStatus) {
    void (async () => {
      if (!rideId || !ride || forcePending) return
      setForcePending(true)
      setShowArrivalPopup(false)
      try {
        if (next === 'vozac_na_putu') {
          const origin = driverOriginRef.current ?? {
            lat: ride.driverLat ?? ride.pickup.lat,
            lng: ride.driverLng ?? ride.pickup.lng,
          }
          setDriverPosSim(origin)
          await updateDriverSimPosition(rideId, origin.lat, origin.lng)
          await setRideStatusSafe('vozac_na_putu')
          return
        }
        if (next === 'stigao') {
          stopSimulationRun()
          setDriverPosSim({ lat: ride.pickup.lat, lng: ride.pickup.lng })
          await updateDriverSimPosition(rideId, ride.pickup.lat, ride.pickup.lng)
          const ok = await setRideStatusSafe('stigao')
          if (ok) setShowArrivalPopup(true)
          return
        }
        if (next === 'u_toku') {
          stopSimulationRun()
          setDriverPosSim({ lat: ride.pickup.lat, lng: ride.pickup.lng })
          await updateDriverSimPosition(rideId, ride.pickup.lat, ride.pickup.lng)
          await setRideStatusSafe('u_toku')
          return
        }
        if (next === 'zavrsena') {
          stopSimulationRun()
          setDriverPosSim({ lat: ride.destination.lat, lng: ride.destination.lng })
          await updateDriverSimPosition(rideId, ride.destination.lat, ride.destination.lng)
          await setRideStatusSafe('zavrsena')
        }
      } finally {
        setForcePending(false)
      }
    })()
  }

  useEffect(() => {
    if (!rideId || status !== 'dodijeljena' || !rideRef.current) return
    simStatusRef.current = 'assigned'
    const timer = window.setTimeout(() => {
      void setRideStatusSafe('vozac_na_putu')
    }, scaledDelay(1000))
    return () => clearTimeout(timer)
  }, [rideId, scaledDelay, setRideStatusSafe, status])

  useEffect(() => {
    if (!rideId || status !== 'vozac_na_putu') return
    const r = rideRef.current
    if (!r) return
    const runId = ++simRunIdRef.current
    setShowArrivalPopup(false)
    simStatusRef.current = 'driver_on_way'
    cancelActiveAnimation()
    let cancelled = false

    void (async () => {
      const start =
        driverOriginRef.current ??
        (r.driverLat != null && r.driverLng != null ? { lat: r.driverLat, lng: r.driverLng } : { lat: r.pickup.lat, lng: r.pickup.lng })
      const road = await fetchRoadRoute(start, r.pickup)
      const approachRaw =
        road.routePoints.length > 1 ? road.routePoints : interpolateRoute(start, r.pickup, 64)
      const approach = buildDriverAnimationPath(approachRaw, start, r.pickup, 64)
      if (cancelled || simRunIdRef.current !== runId) return
      if (rideRef.current?.status !== 'vozac_na_putu') return
      setDriverApproachPolyline(approach)
      animCancelRef.current = animateMarkerAlongRoute(
        approach,
        () => {
          void (async () => {
            if (simRunIdRef.current !== runId) return
            const cur = rideRef.current
            if (!cur || cur.status !== 'vozac_na_putu') return
            setDriverApproachPolyline(null)
            setDriverPosSim({ lat: cur.pickup.lat, lng: cur.pickup.lng })
            await updateDriverSimPosition(rideId, cur.pickup.lat, cur.pickup.lng)
            const ok = await setRideStatusSafe('stigao')
            if (ok) {
              simStatusRef.current = 'driver_arrived'
              setShowArrivalPopup(true)
            }
          })()
        },
        undefined,
      )
    })()

    return () => {
      cancelled = true
      setDriverApproachPolyline(null)
      cancelActiveAnimation()
    }
  }, [animateMarkerAlongRoute, rideId, setRideStatusSafe, status])

  useEffect(() => {
    if (status !== 'stigao') setShowArrivalPopup(false)
  }, [status])

  useEffect(() => {
    if (!rideId || status !== 'u_toku') return
    const r = rideRef.current
    if (!r) return
    const runId = ++simRunIdRef.current
    simStatusRef.current = 'ride_in_progress'
    cancelActiveAnimation()
    const pathRaw = r.routePoints.length > 1 ? r.routePoints : interpolateRoute(r.pickup, r.destination, 72)
    const from = driverPosRef.current
    const path = buildDriverAnimationPath(pathRaw, from, r.destination, 72)
    animCancelRef.current = animateMarkerAlongRoute(
      path,
      () => {
        void (async () => {
          if (simRunIdRef.current !== runId) return
          const cur = rideRef.current
          if (!cur || cur.status !== 'u_toku') return
          setDriverPosSim({ lat: cur.destination.lat, lng: cur.destination.lng })
          await updateDriverSimPosition(rideId, cur.destination.lat, cur.destination.lng)
          const ok = await setRideStatusSafe('zavrsena')
          if (ok) simStatusRef.current = 'completed'
        })()
      },
      undefined,
    )
    const measuredKm = distanceAlongPolylineKm(path)
    const baseDuration = Math.max(8_000, Math.min(180_000, Math.round(measuredKm * 6_000)))
    const fallbackMs = Math.max(3_000, Math.round((baseDuration / Math.max(0.25, simSpeed)) * 1.25))
    const fallbackId = window.setTimeout(() => {
      void (async () => {
        if (simRunIdRef.current !== runId) return
        const cur = rideRef.current
        if (!cur || cur.status !== 'u_toku') return
        setDriverPosSim({ lat: cur.destination.lat, lng: cur.destination.lng })
        await updateDriverSimPosition(rideId, cur.destination.lat, cur.destination.lng)
        const ok = await setRideStatusSafe('zavrsena')
        if (ok) simStatusRef.current = 'completed'
      })()
    }, fallbackMs)
    return () => {
      window.clearTimeout(fallbackId)
      cancelActiveAnimation()
    }
  }, [animateMarkerAlongRoute, rideId, setRideStatusSafe, status])

  useEffect(() => {
    if (status === 'zavrsena' && rideId) {
      simStatusRef.current = 'completed'
      navigate(`/app/rate/${rideId}`, { replace: true })
    }
    if (status === 'otkazana') simStatusRef.current = 'cancelled'
  }, [navigate, rideId, status])

  const cancelMut = useMutation({
    mutationFn: () =>
      cancelRide(ride!.id, me.account.id, cancelReason || strings().ride.cancelByPassengerDefault),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(strings().ride.cannotCancel, 'error')
        return
      }
      stopSimulationRun()
      setShowArrivalPopup(false)
      setCancelOpen(false)
      push(strings().notifications.rideCancelled, 'success')
      await qc.invalidateQueries({ queryKey: ['ride', ride!.id] })
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
      navigate('/app/history', { replace: true })
    },
  })

  const confirmMut = useMutation({
    mutationFn: () => confirmPassengerEnteredVehicle(ride!.id, me.account.id),
    onSuccess: async (res) => {
      if ('error' in res) {
        push(strings().common.error, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['ride', ride!.id] })
    },
  })

  if (!ride) {
    return <p className="p-6 text-center text-sm text-slate-600">{t.history.rideNotFound}</p>
  }

  const driver = driverQuery.data
  const vehicle = vehicleQuery.data

  const etaMinutesDisplay =
    ride.status === 'vozac_na_putu'
      ? `~${Math.max(1, Math.ceil(distPickup * 2))} ${t.order.min}`
      : ride.status === 'u_toku'
        ? `~${ride.estimatedDurationMin} ${t.order.min}`
        : '—'

  const rideOverlayTopStyle = {
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
    left: '16px',
    right: 'calc(16px + 44px + 8px)',
  } as const

  const rideSheetPaddingBottom =
    'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-height, 5.25rem) + 10px)'

  const rideActionButtons = (
    <div className="ride-mobile-action-dock ride-mobile-action-dock--inline flex flex-col gap-2 sm:flex-row">
      {ride.status === 'stigao' ? (
        <Button
          className="ride-confirm-btn flex-1"
          size="lg"
          onClick={() => confirmMut.mutate()}
          disabled={confirmMut.isPending}
        >
          {t.ride.confirmEntry}
        </Button>
      ) : null}
      {['dodijeljena', 'vozac_na_putu', 'stigao'].includes(ride.status) ? (
        <Button
          variant="secondary"
          className="ride-cancel-btn flex-1 border-red-400/80 text-red-700 hover:bg-red-50 hover:text-red-800"
          size="lg"
          onClick={() => setCancelOpen(true)}
        >
          {t.ride.cancel}
        </Button>
      ) : null}
      <Button
        variant="ghost"
        className="ride-problem-btn flex-1 border-2 border-white/85 bg-white/10 text-slate-600 shadow-[0_0_0_1px_rgb(255_255_255/0.45),0_2px_10px_rgb(15_23_42/0.06)] backdrop-blur-[2px] hover:bg-white/18 hover:text-slate-800"
        size="lg"
        onClick={() => navigate(`/app/problem/${ride.id}`)}
      >
        {t.ride.problem}
      </Button>
    </div>
  )

  const demoPanel = (
    <motion.div layout className={demoGlassPanelClass}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setDemoOpen((v) => !v)}
        >
          <span className="text-xs font-bold uppercase tracking-wide text-brand-yellow">{t.common.demoControls}</span>
          <span className="text-lg font-light leading-none text-brand-navy tabular-nums">{demoOpen ? '−' : '+'}</span>
        </button>
        {demoOpen ? (
          <div className={cn('mt-3 space-y-3', demoGlassDividerClass)}>
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-brand-navy">{t.common.demoSpeedLabel}:</span>{' '}
              <span className="font-extrabold text-brand-navy">{simSpeed}x</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={
                  simSpeed === 1
                    ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                    : 'border-slate-200 hover:border-brand-yellow/40'
                }
                disabled={simSpeed === 1}
                onClick={() => setSimSpeed(1)}
              >
                1x
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={
                  simSpeed === 2
                    ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                    : 'border-slate-200 hover:border-brand-yellow/40'
                }
                disabled={simSpeed === 2}
                onClick={() => setSimSpeed(2)}
              >
                2x
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={
                  simSpeed === 4
                    ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                    : 'border-slate-200 hover:border-brand-yellow/40'
                }
                disabled={simSpeed === 4}
                onClick={() => setSimSpeed(4)}
              >
                4x
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={
                  simSpeed === 10
                    ? 'border-2 border-brand-yellow/50 bg-brand-yellow/10 text-brand-navy hover:bg-brand-yellow/15'
                    : 'border-slate-200 hover:border-brand-yellow/40'
                }
                disabled={simSpeed === 10}
                onClick={() => setSimSpeed(10)}
              >
                10x
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                disabled={!rideId || forcePending}
                onClick={() => runDemoStatus('vozac_na_putu')}
              >
                {t.common.forceDriverWay}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                disabled={!rideId || forcePending}
                onClick={() => runDemoStatus('stigao')}
              >
                {t.common.forceArrived}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                disabled={!rideId || forcePending}
                onClick={() => runDemoStatus('u_toku')}
              >
                {t.common.forceStartRide}
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="border-slate-200 hover:border-brand-yellow/45 hover:bg-brand-yellow/5"
                disabled={!rideId || forcePending}
                onClick={() => runDemoStatus('zavrsena')}
              >
                {t.common.forceComplete}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="border-2 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                  void (async () => {
                    stopSimulationRun()
                    setShowArrivalPopup(false)
                    setSimSpeed(1)
                    if (rideId && driverOriginRef.current) {
                      const newStart = ride ? generateDriverStartNearPickup(ride.pickup) : driverOriginRef.current
                      driverOriginRef.current = newStart
                      setDriverOriginState(newStart)
                      setDriverPosSim(newStart)
                      setDriverStartDistanceKm(ride ? haversineKm(newStart, ride.pickup) : null)
                      await updateDriverSimPosition(
                        rideId,
                        newStart.lat,
                        newStart.lng
                      )
                      await setRideStatusSafe('dodijeljena')
                    } else {
                      await resetAllDriversAvailable()
                      resetDb()
                      await qc.invalidateQueries()
                    }
                    push(strings().common.demoResetOk, 'success')
                  })()
                }}
              >
                {t.common.resetDemo}
              </Button>
            </div>
          </div>
        ) : null}
    </motion.div>
  )

  return (
    <>
      {isMobileRide ? (
        <>
          <div className="fixed inset-0 z-[50] lg:hidden">
            <Suspense fallback={<MapChunkFallback className="h-full w-full border-0 bg-slate-200/80" />}>
              <ActiveRideMap
                variant="fullscreen"
                ride={ride}
                driverPos={driverPos}
                driverOrigin={driverOriginState}
                approachPolyline={driverApproachPolyline}
                followDriver={followTaxi}
                showArrivalPopup={showArrivalPopup}
                arrivalPopupText={t.ride.driverArrived}
                className="h-full w-full"
              />
            </Suspense>
          </div>
          <div className="pointer-events-none fixed z-[60] lg:hidden" style={rideOverlayTopStyle}>
            <div
              className="pointer-events-auto rounded-2xl border border-black/[0.06] px-4 py-3 shadow-lg backdrop-blur-[12px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <RideStatusBadge status={ride.status} />
                <Button
                  size="sm"
                  variant={followTaxi ? 'secondary' : 'outline'}
                  type="button"
                  onClick={() => setFollowTaxi((v) => !v)}
                >
                  {followTaxi ? t.ride.followTaxiOn : t.ride.followTaxiOff}
                </Button>
              </div>
              {driverStartDistanceKm != null ? (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {t.ride.distanceToYou} ~{driverStartDistanceKm.toFixed(1)} {t.ride.kmUnit}
                </p>
              ) : null}
            </div>
          </div>
          <div
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[60vh] flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)] lg:hidden"
            style={{ paddingBottom: rideSheetPaddingBottom }}
          >
            <div className="flex shrink-0 justify-center pt-3 pb-2" aria-hidden>
              <span className="block h-1 w-[36px] shrink-0 rounded-full bg-[#D1D5DB]" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 pt-1">
                <div className="flex flex-row items-center justify-between gap-2 pb-0.5">
                  <span className="text-base font-semibold text-brand-navy">{t.ride.etaLabel}</span>
                  <span className="text-sm font-semibold text-brand-teal">{etaMinutesDisplay}</span>
                </div>
                <RideEstimateSection ride={ride} t={t} />
                <RideProgressStepper status={ride.status} />
                {driver && vehicle ? (
                  <RideDriverCard driver={driver} vehicle={vehicle} t={t} distPickup={distPickup} />
                ) : null}
                {rideActionButtons}
                {demoPanel}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!isMobileRide ? (
      <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-[8.5rem] md:pb-0">
        <RideStatusBadge status={ride.status} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.ride.track}</p>
            <Button
              size="sm"
              variant={followTaxi ? 'secondary' : 'outline'}
              type="button"
              onClick={() => setFollowTaxi((v) => !v)}
            >
              {followTaxi ? t.ride.followTaxiOn : t.ride.followTaxiOff}
            </Button>
          </div>
          {driverStartDistanceKm != null ? (
            <p className="text-xs font-medium text-slate-600">
              {t.ride.distanceToYou} ~{driverStartDistanceKm.toFixed(1)} {t.ride.kmUnit}
            </p>
          ) : null}
          <Suspense fallback={<MapChunkFallback className="min-h-72 sm:min-h-96" />}>
            <ActiveRideMap
              ride={ride}
              driverPos={driverPos}
              driverOrigin={driverOriginState}
              approachPolyline={driverApproachPolyline}
              followDriver={followTaxi}
              showArrivalPopup={showArrivalPopup}
              arrivalPopupText={t.ride.driverArrived}
            />
          </Suspense>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">{t.ride.etaLabel}</CardTitle>
            <span className="text-sm font-semibold text-brand-teal">{etaMinutesDisplay}</span>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <RideEstimateSection ride={ride} t={t} />
          </CardContent>
        </Card>

        <RideProgressStepper status={ride.status} />

        {driver && vehicle ? (
          <RideDriverCard driver={driver} vehicle={vehicle} t={t} distPickup={distPickup} />
        ) : null}

        {rideActionButtons}

        {demoPanel}
      </div>
      ) : null}

      {cancelOpen ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setCancelOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-navy">{t.ride.cancel}</h3>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="why">{t.ride.cancelReason}</Label>
              <Input id="why" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                disabled={cancelMut.isPending || !cancelReason.trim()}
                onClick={() => cancelMut.mutate()}
              >
                {t.ride.confirmCancelRide}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>
                {t.common.close}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

const RIDE_PROGRESS_KEYS = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'zavrsena'] as const
const RIDE_PROGRESS_LABELS = ['Dodjeljen', 'Na putu', 'Stigao', 'Vožnja', 'Završeno'] as const

function RideProgressStepper({ status }: { status: RideStatus }) {
  const cancelled = status === 'otkazana' || status === 'neuspjesna'
  const activeIdx = cancelled
    ? -1
    : RIDE_PROGRESS_KEYS.indexOf(status as (typeof RIDE_PROGRESS_KEYS)[number])

  return (
    <div className="w-full">
      <div className="flex w-full items-start">
        {RIDE_PROGRESS_KEYS.map((_, i) => {
          const completed =
            (activeIdx >= 0 && i < activeIdx) || (status === 'zavrsena' && i <= 4)
          const active = activeIdx >= 0 && i === activeIdx && status !== 'zavrsena' && !cancelled
          const leftLineDone = i >= 1 && (activeIdx >= i || status === 'zavrsena')
          const rightLineDone = i < RIDE_PROGRESS_KEYS.length - 1 && (activeIdx > i || status === 'zavrsena')

          return (
            <div key={RIDE_PROGRESS_KEYS[i]} className="flex min-w-0 flex-1 flex-col items-stretch">
              <div className="flex h-4 w-full items-center">
                <div
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    i === 0 ? 'opacity-0' : leftLineDone ? 'bg-[#F5A623]' : 'bg-[#D1D5DB]'
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    'relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full',
                    active
                      ? 'bg-[#F5A623] shadow-[0_0_0_3px_rgba(245,166,35,0.25)]'
                      : completed
                        ? 'bg-[#F5A623]'
                        : 'border-2 border-[#D1D5DB] bg-white'
                  )}
                />
                <div
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    i === RIDE_PROGRESS_KEYS.length - 1 ? 'opacity-0' : rightLineDone ? 'bg-[#F5A623]' : 'bg-[#D1D5DB]'
                  )}
                  aria-hidden
                />
              </div>
              <p
                className={cn(
                  'mt-1 px-0.5 text-center text-[9px] font-medium leading-tight text-[#6B7280] line-clamp-2',
                  active && 'font-bold text-[#111827]',
                  completed && !active && 'text-[#374151]'
                )}
              >
                {RIDE_PROGRESS_LABELS[i]}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RideEstimateSection({
  ride,
  t,
}: {
  ride: Ride
  t: ReturnType<typeof strings>
}) {
  return (
    <>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">{t.driver.rideRoute}</p>
        <p className="text-[15px] font-semibold leading-snug text-[#111827]">
          {ride.pickup.label} → {ride.destination.label}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.order.distance}</p>
          <p className="text-[15px] font-semibold text-[#111827]">
            {ride.distanceKm.toFixed(1)} {t.order.km}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.order.eta}</p>
          <p className="text-[15px] font-semibold text-[#111827]">
            {ride.estimatedDurationMin} {t.order.min}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.order.estimate}</p>
          <p className="text-[15px] font-semibold text-[#111827]">
            {ride.estimatedPrice.toFixed(2)} {t.order.bam}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.order.payment}</p>
          <p className="text-[15px] font-semibold text-[#111827]">{ride.paymentMethod}</p>
        </div>
      </div>
    </>
  )
}

