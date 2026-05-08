import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import {
  assignDriver,
  cancelRide,
  cancelRideRequest,
  getDriverById,
  getVehicleById,
  requestNewDriverForRide,
  setRideStatus,
} from '../services/rideApi'
import { getDb } from '../services/mockDb'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Driver, Ride, Vehicle } from '../types/domain'

const SEARCH_REQUEST_KEY = 'urbanflow_search_request_id'

function getStoredSearchRequestId(): string | null {
  try {
    return sessionStorage.getItem(SEARCH_REQUEST_KEY)
  } catch {
    return null
  }
}

function setStoredSearchRequestId(id: string): void {
  try {
    sessionStorage.setItem(SEARCH_REQUEST_KEY, id)
  } catch {
    // ignore
  }
}

function clearStoredSearchRequestId(): void {
  try {
    sessionStorage.removeItem(SEARCH_REQUEST_KEY)
  } catch {
    // ignore
  }
}

export function SearchingPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { requestId?: string; forceNoDriversDemo?: boolean } }
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const requestId = location.state?.requestId ?? getStoredSearchRequestId()
  const forceNoDriversDemo = location.state?.forceNoDriversDemo === true
  const [checked, setChecked] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<'searching' | 'no_driver'>('searching')
  const [secondsWaiting, setSecondsWaiting] = useState(0)
  const [foundRide, setFoundRide] = useState<Ride | null>(null)
  const [foundDriver, setFoundDriver] = useState<Driver | null>(null)
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null)
  const [actionBusy, setActionBusy] = useState<'confirm' | 'new_driver' | 'cancel' | null>(null)
  const demoTimeoutSec = 9

  const candidates = useMemo(() => getDb().drivers.slice(0, 4), [])

  useEffect(() => {
    if (!requestId) {
      navigate('/app/order', { replace: true })
      return
    }
    setStoredSearchRequestId(requestId)
    let alive = true
    ;(async () => {
      const res = forceNoDriversDemo
        ? await Promise.race([
            assignDriver(requestId, me.account.id, { forceNoDrivers: true }),
            new Promise<{ error: 'no_drivers' }>((resolve) =>
              window.setTimeout(() => resolve({ error: 'no_drivers' }), demoTimeoutSec * 1000)
            ),
          ])
        : await assignDriver(requestId, me.account.id, { forceNoDrivers: false })
      if (!alive) return
      if ('error' in res) {
        await cancelRideRequest(requestId, me.account.id)
        clearStoredSearchRequestId()
        setFailed(true)
        setState('no_driver')
        setLoading(false)
        push(strings().order.noDrivers, 'error')
        navigate('/app/no-driver', { state: { requestId }, replace: true })
        return
      }
      setLoading(false)
      setFoundRide(res.ride)
      const [driver, vehicle] = await Promise.all([getDriverById(res.ride.driverId), getVehicleById(res.ride.vehicleId)])
      if (!alive) return
      setFoundDriver(driver)
      setFoundVehicle(vehicle)
    })()
    return () => {
      alive = false
    }
  }, [demoTimeoutSec, forceNoDriversDemo, me.account.id, me.profile.id, navigate, push, qc, requestId])

  useEffect(() => {
    if (!loading || failed) return
    let i = 0
    const t = window.setInterval(() => {
      const id = candidates[i % candidates.length]?.id
      if (id) setChecked((c) => (c.includes(id) ? c : [...c, id]))
      i++
    }, 600)
    return () => clearInterval(t)
  }, [loading, failed, candidates])

  useEffect(() => {
    if (!loading || failed) return
    setSecondsWaiting(0)
    const timer = window.setInterval(() => {
      setSecondsWaiting((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, failed])

  if (!requestId) return null

  const showFoundModal = !!foundRide && !loading && state === 'searching'

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Card>
        <CardContent className="space-y-6 py-8 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-yellow text-brand-navy shadow-md"
          >
            <Loader2 className="h-8 w-8 animate-spin" />
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">
              {state === 'searching' ? t.order.searching : t.order.noDrivers}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t.order.searchingSubtitle}</p>
            {state === 'searching' ? (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {forceNoDriversDemo
                  ? t.order.demoCountdown.replace('{seconds}', String(Math.max(0, demoTimeoutSec - secondsWaiting)).padStart(2, '0'))
                  : t.order.waitingTime.replace('{seconds}', String(secondsWaiting).padStart(2, '0'))}
              </p>
            ) : null}
          </div>
          <ul className="space-y-2 text-left text-sm">
            {candidates.map((d) => (
              <li
                key={d.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  checked.includes(d.id) ? 'border-brand-teal bg-teal-50' : 'border-brand-border bg-white'
                }`}
              >
                <span className="font-medium">
                  {d.firstName} {d.lastName}
                </span>
                <span className="text-xs text-slate-500">
                  {checked.includes(d.id) ? t.order.driverCheckActive : t.order.driverCheckPending}
                </span>
              </li>
            ))}
          </ul>
          {failed ? (
            <div className="space-y-3">
              <p className="font-semibold text-brand-danger">{t.order.noDrivers}</p>
              <Button className="w-full" onClick={() => navigate('/app/order', { replace: true })}>
                {t.order.retry}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={async () => {
                  await cancelRideRequest(requestId, me.account.id)
                  navigate('/app/order', { replace: true })
                }}
              >
                {t.ride.cancel}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {showFoundModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-brand-navy">{t.ride.matchFoundTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{t.ride.matchFoundHint}</p>
            <div className="mt-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-brand-navy">
                {foundRide?.pickup.label} → {foundRide?.destination.label}
              </p>
              <p className="text-slate-600">
                {t.order.eta}: ~{foundRide?.estimatedDurationMin} {t.order.min} · {t.order.distance}:{' '}
                {foundRide?.distanceKm.toFixed(1)} {t.order.km}
              </p>
              <p className="text-slate-600">
                {t.order.estimate}: {foundRide?.estimatedPrice.toFixed(2)} {t.order.bam} · {t.order.payment}:{' '}
                {foundRide?.paymentMethod === 'gotovina' ? t.order.cash : foundRide?.paymentMethod}
              </p>
              <p className="text-slate-700">
                {foundDriver ? `${foundDriver.firstName} ${foundDriver.lastName}` : t.order.notAvailable}
                {foundDriver ? ` · ⭐ ${foundDriver.rating.toFixed(1)}` : ''}
              </p>
              <p className="text-slate-500">
                {foundVehicle
                  ? `${foundVehicle.brand} ${foundVehicle.model} · ${foundVehicle.color} · ${foundVehicle.registration}`
                  : t.order.notAvailable}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                disabled={actionBusy !== null}
                onClick={async () => {
                  if (!foundRide) return
                  setActionBusy('new_driver')
                  const res = await requestNewDriverForRide(foundRide.id, me.account.id)
                  if ('error' in res) {
                    push(res.error === 'no_drivers' ? t.order.noDrivers : t.common.error, 'error')
                    setActionBusy(null)
                    return
                  }
                  const [driver, vehicle] = await Promise.all([getDriverById(res.ride.driverId), getVehicleById(res.ride.vehicleId)])
                  setFoundRide(res.ride)
                  setFoundDriver(driver)
                  setFoundVehicle(vehicle)
                  setActionBusy(null)
                  push(t.ride.newDriverAssigned, 'success')
                }}
              >
                {actionBusy === 'new_driver' ? t.common.loading : t.ride.requestNewDriver}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={actionBusy !== null}
                onClick={async () => {
                  if (!foundRide) return
                  setActionBusy('cancel')
                  await cancelRide(foundRide.id, me.account.id, t.ride.cancelByPassengerDefault)
                  clearStoredSearchRequestId()
                  await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
                  await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
                  push(t.notifications.rideCancelled, 'success')
                  navigate('/app/order', { replace: true })
                }}
              >
                {actionBusy === 'cancel' ? t.common.loading : t.ride.cancel}
              </Button>
              <Button
                className="flex-1"
                disabled={actionBusy !== null}
                onClick={async () => {
                  if (!foundRide) return
                  setActionBusy('confirm')
                  const confirmRes = await setRideStatus(foundRide.id, 'vozac_na_putu', me.account.id)
                  if ('error' in confirmRes) {
                    setActionBusy(null)
                    push(t.common.error, 'error')
                    return
                  }
                  await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
                  await qc.invalidateQueries({ queryKey: ['ride', foundRide.id] })
                  clearStoredSearchRequestId()
                  navigate(`/app/ride/${foundRide.id}`, { replace: true })
                }}
              >
                {actionBusy === 'confirm' ? t.common.loading : t.ride.confirmDriver}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
