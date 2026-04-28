import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { RideStatus } from '../types/domain'
import { haversineKm } from '../utils/distance'
import { interpolateRoute } from '../utils/route'
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
import { setForceNoDrivers } from '../services/demoFlags'
import { resetDb } from '../services/mockDb'
import { useToastStore } from '../store/notificationStore'
import { MapChunkFallback } from '../components/map/MapChunkFallback'

const ActiveRideMap = lazy(() => import('../components/map/ActiveRideMap'))
import { RideStatusBadge } from '../components/common/StatusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type SimSpeed = 1 | 2 | 4 | 10

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function generateDriverStartNearPickup(pickup: { lat: number; lng: number }): { lat: number; lng: number } {
  // Keep driver realistically near pickup: 0.2km to 3km.
  for (let i = 0; i < 24; i++) {
    const latOffset = randomInRange(-0.02, 0.02)
    const lngOffset = randomInRange(-0.02, 0.02)
    const candidate = {
      lat: pickup.lat + latOffset,
      lng: pickup.lng + lngOffset,
    }
    const dKm = haversineKm(candidate, pickup)
    if (dKm >= 0.2 && dKm <= 3) return candidate
  }
  // Fallback should still be visibly away from pickup.
  return {
    lat: pickup.lat + 0.012,
    lng: pickup.lng - 0.01,
  }
}

export function RidePage() {
  const t = strings()
  const { id } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [demoOpen, setDemoOpen] = useState(true)
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(1)
  const [forcePending, setForcePending] = useState(false)
  const [followTaxi, setFollowTaxi] = useState(true)
  const [showArrivalPopup, setShowArrivalPopup] = useState(false)
  const [driverPosSim, setDriverPosSim] = useState<{ lat: number; lng: number } | null>(null)
  const [driverStartDistanceKm, setDriverStartDistanceKm] = useState<number | null>(null)
  const rideMarkerRef = useRef<string | null>(null)
  const driverOriginRef = useRef<{ lat: number; lng: number } | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const animCancelRef = useRef<(() => void) | null>(null)
  const speedRef = useRef<SimSpeed>(1)
  const speedCooldownUntilRef = useRef(0)
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

  function setSpeedSafe(next: SimSpeed) {
    if (next === simSpeed) return
    const now = Date.now()
    if (now < speedCooldownUntilRef.current) return
    speedCooldownUntilRef.current = now + 180
    setSimSpeed(next)
  }

  function cancelActiveAnimation() {
    animCancelRef.current?.()
    animCancelRef.current = null
    if (animationFrameIdRef.current !== null) {
      window.cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
  }

  async function setRideStatusSafe(next: RideStatus) {
    if (!rideId) return false
    const res = await setRideStatus(rideId, next, me.account.id)
    if ('error' in res) {
      push(`${strings().common.error} (${res.error})`, 'error')
      return false
    }
    await qc.invalidateQueries({ queryKey: ['ride', rideId] })
    await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
    return true
  }

  function animateMarkerAlongRoute(
    routeCoordinates: Array<{ lat: number; lng: number }>,
    onDone: () => void
  ) {
    if (routeCoordinates.length < 2) {
      onDone()
      return () => undefined
    }
    let cancelled = false
    let persistStamp = 0
    const baseDuration = 30_000
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
  }

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
          cancelActiveAnimation()
          setDriverPosSim({ lat: ride.pickup.lat, lng: ride.pickup.lng })
          await updateDriverSimPosition(rideId, ride.pickup.lat, ride.pickup.lng)
          const ok = await setRideStatusSafe('stigao')
          if (ok) setShowArrivalPopup(true)
          return
        }
        if (next === 'u_toku') {
          cancelActiveAnimation()
          setDriverPosSim({ lat: ride.pickup.lat, lng: ride.pickup.lng })
          await updateDriverSimPosition(rideId, ride.pickup.lat, ride.pickup.lng)
          await setRideStatusSafe('u_toku')
          return
        }
        if (next === 'zavrsena') {
          cancelActiveAnimation()
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
    if (!rideId || !ride || status !== 'dodijeljena') return
    simStatusRef.current = 'assigned'
    const timer = window.setTimeout(() => {
      void setRideStatusSafe('vozac_na_putu')
    }, scaledDelay(1000))
    return () => clearTimeout(timer)
  }, [ride, rideId, scaledDelay, status])

  useEffect(() => {
    if (!rideId || !ride || status !== 'vozac_na_putu') return
    setShowArrivalPopup(false)
    simStatusRef.current = 'driver_on_way'
    cancelActiveAnimation()
    const start = driverPosSim ?? driverOriginRef.current ?? { lat: ride.pickup.lat, lng: ride.pickup.lng }
    const approach = interpolateRoute(start, ride.pickup, 64)
    animCancelRef.current = animateMarkerAlongRoute(approach, () => {
      void (async () => {
        setDriverPosSim({ lat: ride.pickup.lat, lng: ride.pickup.lng })
        await updateDriverSimPosition(rideId, ride.pickup.lat, ride.pickup.lng)
        const ok = await setRideStatusSafe('stigao')
        if (ok) {
          simStatusRef.current = 'driver_arrived'
          setShowArrivalPopup(true)
        }
      })()
    })
    return cancelActiveAnimation
  }, [ride, rideId, status])

  useEffect(() => {
    if (status !== 'stigao') setShowArrivalPopup(false)
  }, [status])

  useEffect(() => {
    if (!rideId || !ride || status !== 'u_toku') return
    simStatusRef.current = 'ride_in_progress'
    cancelActiveAnimation()
    const path = ride.routePoints.length > 1 ? ride.routePoints : interpolateRoute(ride.pickup, ride.destination, 72)
    animCancelRef.current = animateMarkerAlongRoute(path, () => {
      void (async () => {
        setDriverPosSim({ lat: ride.destination.lat, lng: ride.destination.lng })
        await updateDriverSimPosition(rideId, ride.destination.lat, ride.destination.lng)
        const ok = await setRideStatusSafe('zavrsena')
        if (ok) simStatusRef.current = 'completed'
      })()
    })
    return cancelActiveAnimation
  }, [ride, rideId, status])

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
      setCancelOpen(false)
      push(strings().notifications.rideCancelled, 'success')
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
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
    <div className="space-y-4">
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
            driverOrigin={driverOriginRef.current}
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
        <CardContent className="text-sm text-slate-600">
          <p>
            {ride.pickup.label} → {ride.destination.label}
          </p>
        </CardContent>
      </Card>

      <Timeline status={ride.status} statusLabels={t.ride.status} />

      {driver && vehicle ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.ride.driverVehicleTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">{driver.firstName}</span> {driver.lastName} · ⭐ {driver.rating.toFixed(1)}
            </p>
            <p className="text-slate-600">
              {vehicle.brand} {vehicle.model} · {vehicle.color} · {vehicle.registration}
            </p>
            <p className="text-slate-500">
              {t.ride.distanceToYou} ~
              {distPickup < 0.1
                ? (distPickup * 1000).toFixed(0) + ' ' + t.ride.metersUnit
                : distPickup.toFixed(2) + ' ' + t.ride.kmUnit}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {ride.status === 'stigao' ? (
          <Button className="flex-1" size="lg" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
            {t.ride.confirmEntry}
          </Button>
        ) : null}
        {['dodijeljena', 'vozac_na_putu', 'stigao'].includes(ride.status) ? (
          <Button variant="danger" className="flex-1" size="lg" onClick={() => setCancelOpen(true)}>
            {t.ride.cancel}
          </Button>
        ) : null}
        <Button variant="secondary" className="flex-1" size="lg" onClick={() => navigate(`/app/problem/${ride.id}`)}>
          {t.ride.problem}
        </Button>
      </div>

      <motion.div layout className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-semibold text-brand-navy"
          onClick={() => setDemoOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-amber-900">
              DEMO
            </span>
            {t.common.demoControls}
          </span>
          <span>{demoOpen ? '−' : '+'}</span>
        </button>
        {demoOpen ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-medium text-amber-900/90">
              {t.common.demoSpeedLabel}: <span className="font-extrabold">{simSpeed}x</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={simSpeed === 1 ? 'secondary' : 'outline'}
                type="button"
                disabled={simSpeed === 1}
                onClick={() => setSpeedSafe(1)}
              >
                1x
              </Button>
              <Button
                size="sm"
                variant={simSpeed === 2 ? 'secondary' : 'outline'}
                type="button"
                disabled={simSpeed === 2}
                onClick={() => setSpeedSafe(2)}
              >
                2x
              </Button>
              <Button
                size="sm"
                variant={simSpeed === 4 ? 'secondary' : 'outline'}
                type="button"
                disabled={simSpeed === 4}
                onClick={() => setSpeedSafe(4)}
              >
                4x
              </Button>
              <Button
                size="sm"
                variant={simSpeed === 10 ? 'secondary' : 'outline'}
                type="button"
                disabled={simSpeed === 10}
                onClick={() => setSpeedSafe(10)}
              >
                10x
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" type="button" disabled={!rideId || forcePending} onClick={() => runDemoStatus('vozac_na_putu')}>
                {t.common.forceDriverWay}
              </Button>
              <Button size="sm" variant="secondary" type="button" disabled={!rideId || forcePending} onClick={() => runDemoStatus('stigao')}>
                {t.common.forceArrived}
              </Button>
              <Button size="sm" variant="secondary" type="button" disabled={!rideId || forcePending} onClick={() => runDemoStatus('u_toku')}>
                {t.common.forceStartRide}
              </Button>
              <Button size="sm" variant="secondary" type="button" disabled={!rideId || forcePending} onClick={() => runDemoStatus('zavrsena')}>
                {t.common.forceComplete}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => {
                  setForceNoDrivers(true)
                  push(strings().order.noDrivers, 'info')
                }}
              >
                {t.common.simNoDrivers}
              </Button>
              <Button
                size="sm"
                variant="danger"
                type="button"
                onClick={() => {
                  void (async () => {
                    cancelActiveAnimation()
                    setShowArrivalPopup(false)
                    setSimSpeed(1)
                    if (rideId && driverOriginRef.current) {
                      const newStart = ride ? generateDriverStartNearPickup(ride.pickup) : driverOriginRef.current
                      driverOriginRef.current = newStart
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
                    setForceNoDrivers(false)
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation" onClick={() => setCancelOpen(false)}>
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
