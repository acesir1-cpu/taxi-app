import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { demoGlassDividerClass, demoGlassPanelClass } from '../lib/demoGlassPanel'
import { cn } from '../lib/utils'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { RideStatus } from '../types/domain'
import { generateDriverStartNearPickup } from '../utils/driverSim'
import { distanceAlongPolylineKm, haversineKm } from '../utils/distance'
import { interpolateRoute } from '../utils/route'
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
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function RidePage() {
  const t = strings()
  const { id } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
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
    const totalSegments = routeCoordinates.length - 1
    const step = async (now: number) => {
      if (cancelled) return
      if (!lastTs) {
        lastTs = now
      }
      const delta = Math.max(0, now - lastTs)
      lastTs = now
      const progressDelta = (delta / baseDuration) * speedRef.current
      progress = Math.min(1, progress + progressDelta)
      const scaled = progress * totalSegments
      const segIdx = Math.min(totalSegments - 1, Math.floor(scaled))
      const segT = scaled - segIdx
      const a = routeCoordinates[segIdx]!
      const b = routeCoordinates[segIdx + 1]!
      const lat = a.lat + (b.lat - a.lat) * segT
      const lng = a.lng + (b.lng - a.lng) * segT
      setDriverPosSim({ lat, lng })
      if (now - persistStamp >= 450 && rideId) {
        persistStamp = now
        void updateDriverSimPosition(rideId, lat, lng)
      }
      if (progress >= 1) {
        if (rideId) void updateDriverSimPosition(rideId, lat, lng)
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
      const approach =
        road.routePoints.length > 1 ? road.routePoints : interpolateRoute(start, r.pickup, 64)
      const approachKm =
        road.distanceKm > 0 ? road.distanceKm : haversineKm(start, r.pickup)
      if (cancelled || simRunIdRef.current !== runId) return
      if (rideRef.current?.status !== 'vozac_na_putu') return
      animCancelRef.current = animateMarkerAlongRoute(
        approach,
        () => {
          void (async () => {
            if (simRunIdRef.current !== runId) return
            const cur = rideRef.current
            if (!cur || cur.status !== 'vozac_na_putu') return
            setDriverPosSim({ lat: cur.pickup.lat, lng: cur.pickup.lng })
            await updateDriverSimPosition(rideId, cur.pickup.lat, cur.pickup.lng)
            const ok = await setRideStatusSafe('stigao')
            if (ok) {
              simStatusRef.current = 'driver_arrived'
              setShowArrivalPopup(true)
            }
          })()
        },
        approachKm,
      )
    })()

    return () => {
      cancelled = true
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
    const path = r.routePoints.length > 1 ? r.routePoints : interpolateRoute(r.pickup, r.destination, 72)
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
      r.distanceKm > 0 ? r.distanceKm : undefined,
    )
    const measuredKm = r.distanceKm > 0 ? r.distanceKm : distanceAlongPolylineKm(path)
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

  return (
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
            followDriver={followTaxi}
            showArrivalPopup={showArrivalPopup}
            arrivalPopupText={t.ride.driverArrived}
          />
        </Suspense>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">{t.ride.etaLabel}</CardTitle>
          <span className="text-sm font-semibold text-brand-teal">
            {ride.status === 'vozac_na_putu'
              ? `~${Math.max(1, Math.ceil(distPickup * 2))} ${t.order.min}`
              : ride.status === 'u_toku'
                ? `~${ride.estimatedDurationMin} ${t.order.min}`
                : '—'}
          </span>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.driver.rideRoute}</p>
            <p className="font-medium text-brand-navy">
              {ride.pickup.label} → {ride.destination.label}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <p>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.order.distance}</span>
              <br />
              <span className="font-medium text-brand-navy">{ride.distanceKm.toFixed(1)} {t.order.km}</span>
            </p>
            <p>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.order.eta}</span>
              <br />
              <span className="font-medium text-brand-navy">{ride.estimatedDurationMin} {t.order.min}</span>
            </p>
            <p>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.order.estimate}</span>
              <br />
              <span className="font-medium text-brand-navy">{ride.estimatedPrice.toFixed(2)} {t.order.bam}</span>
            </p>
            <p>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.order.payment}</span>
              <br />
              <span className="font-medium text-brand-navy">{ride.paymentMethod}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Timeline status={ride.status} statusLabels={t.ride.status} />

      {driver && vehicle ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ride.driverVehicleTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-center gap-3">
              {driver.avatarUrl ? (
                <img
                  src={driver.avatarUrl}
                  alt={`${driver.firstName} ${driver.lastName}`}
                  className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-extrabold text-white">
                  {driverInitials(driver.firstName, driver.lastName)}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold text-brand-navy">
                  {driver.firstName} {driver.lastName} · ⭐ {driver.rating.toFixed(1)}
                </p>
                <p className="truncate text-slate-600">
                  {vehicle.brand} {vehicle.model} · {vehicle.registration}
                </p>
                <p className="text-slate-500">
                  {t.ride.distanceToYou} ~
                  {distPickup < 0.1
                    ? (distPickup * 1000).toFixed(0) + ' ' + t.ride.metersUnit
                    : distPickup.toFixed(2) + ' ' + t.ride.kmUnit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="ride-mobile-action-dock flex flex-col gap-2 sm:flex-row">
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
          className="ride-problem-btn flex-1 border border-white/70 text-slate-600 hover:bg-transparent hover:text-slate-800"
          size="lg"
          onClick={() => navigate(`/app/problem/${ride.id}`)}
        >
          {t.ride.problem}
        </Button>
      </div>

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

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onClick={() => setCancelOpen(false)}>
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
    </div>
  )
}

function driverInitials(firstName: string, lastName: string): string {
  const first = (firstName || '').trim().charAt(0)
  const rawLast = (lastName || '').trim()
  const last = rawLast.charAt(0)
  return `${first}${first && last ? '.' : ''}${last}`.toUpperCase() || '?'
}

function Timeline({
  status,
  statusLabels,
}: {
  status: RideStatus
  statusLabels: Record<RideStatus, string>
}) {
  const steps: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'zavrsena']
  const idx = steps.indexOf(status)
  return (
    <ol className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
      {steps.map((s, i) => (
        <li
          key={s}
          className={`rounded-full px-3 py-1 ${i <= idx ? 'bg-brand-teal/15 text-brand-navy' : 'bg-slate-100 text-slate-400'}`}
        >
          {statusLabels[s]}
        </li>
      ))}
    </ol>
  )
}
