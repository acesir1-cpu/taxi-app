import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import type { RideStatus } from '../types/domain'
import { haversineKm } from '../utils/distance'
import { pointAlongPolyline } from '../utils/route'
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

export function RidePage() {
  const t = strings()
  const { id } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)

  const rideQuery = useQuery({
    queryKey: ['ride', id],
    queryFn: () => getRideById(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s && ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku'].includes(s) ? 1200 : false
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
    if (!ride) return { lat: 43.856, lng: 18.41 }
    return {
      lat: ride.driverLat ?? ride.pickup.lat,
      lng: ride.driverLng ?? ride.pickup.lng,
    }
  }, [ride])

  const distPickup = ride ? haversineKm(driverPos, ride.pickup) : 0

  const advance = useMemo(
    () => async (next: RideStatus) => {
      if (!rideId) return
      const res = await setRideStatus(rideId, next, me.account.id)
      if ('error' in res) return
      await qc.invalidateQueries({ queryKey: ['ride', rideId] })
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
    },
    [me.account.id, me.profile.id, qc, rideId]
  )

  useEffect(() => {
    if (!rideId || status !== 'dodijeljena') return
    const t = window.setTimeout(() => {
      void advance('vozac_na_putu')
    }, 1000)
    return () => clearTimeout(t)
  }, [advance, rideId, status])

  useEffect(() => {
    if (!rideId || status !== 'vozac_na_putu') return
    let cancelled = false
    ;(async () => {
      const r = await qc.ensureQueryData({ queryKey: ['ride', rideId], queryFn: () => getRideById(rideId) })
      if (!r || cancelled) return
      const from = { lat: r.driverLat ?? r.pickup.lat, lng: r.driverLng ?? r.pickup.lng }
      const to = r.pickup
      const steps = 36
      for (let i = 1; i <= steps; i++) {
        if (cancelled) return
        const t = i / steps
        const lat = from.lat + (to.lat - from.lat) * t
        const lng = from.lng + (to.lng - from.lng) * t
        await updateDriverSimPosition(r.id, lat, lng)
        await qc.invalidateQueries({ queryKey: ['ride', r.id] })
        await new Promise((res) => setTimeout(res, 160))
      }
      if (cancelled) return
      await advance('stigao')
    })()
    return () => {
      cancelled = true
    }
  }, [advance, qc, rideId, status])

  useEffect(() => {
    if (!rideId || status !== 'u_toku') return
    let cancelled = false
    ;(async () => {
      const r = await qc.ensureQueryData({ queryKey: ['ride', rideId], queryFn: () => getRideById(rideId) })
      if (!r || cancelled) return
      const pts = r.routePoints
      const steps = 40
      for (let i = 1; i <= steps; i++) {
        if (cancelled) return
        const t = i / steps
        const p = pointAlongPolyline(pts, t)
        await updateDriverSimPosition(r.id, p.lat, p.lng)
        await qc.invalidateQueries({ queryKey: ['ride', r.id] })
        await new Promise((res) => setTimeout(res, 180))
      }
      if (cancelled) return
      await advance('zavrsena')
      await qc.invalidateQueries({ queryKey: ['ride', r.id] })
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      navigate(`/app/rate/${r.id}`, { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [advance, me.profile.id, navigate, qc, rideId, status])

  useEffect(() => {
    if (status === 'zavrsena' && rideId) {
      navigate(`/app/rate/${rideId}`, { replace: true })
    }
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
      <Suspense fallback={<MapChunkFallback className="min-h-72 sm:min-h-96" />}>
        <ActiveRideMap ride={ride} driverPos={driverPos} />
      </Suspense>

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

      <motion.div layout className="rounded-2xl border border-dashed border-brand-border bg-white/80 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-semibold text-brand-navy"
          onClick={() => setDemoOpen((v) => !v)}
        >
          {t.common.demoControls}
          <span>{demoOpen ? '−' : '+'}</span>
        </button>
        {demoOpen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => void advance('stigao')}>
              {t.common.forceArrived}
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => void advance('zavrsena')}>
              {t.common.forceComplete}
            </Button>
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
                void resetAllDriversAvailable()
                resetDb()
                setForceNoDrivers(false)
                void qc.invalidateQueries()
                navigate('/welcome', { replace: true })
                push(strings().common.demoResetOk, 'success')
              }}
            >
              {t.common.resetDemo}
            </Button>
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
