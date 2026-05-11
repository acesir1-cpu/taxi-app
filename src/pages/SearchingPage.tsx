import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { NavigateFunction } from 'react-router-dom'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { strings, type AppMessages } from '../i18n/strings'
import type { AppOutletContext, PassengerMe } from '../types/appContext'
import {
  assignDriver,
  cancelRide,
  cancelRideRequest,
  getDriverById,
  getPassengerRideRequestIfSearchable,
  getVehicleById,
  requestNewDriverForRide,
  setRideStatus,
} from '../services/rideApi'
import { LoadingState } from '../components/common/LoadingState'
import { getDb } from '../services/mockDb'
import { useNotificationBannerStore } from '../store/notificationBannerStore'
import { useToastStore } from '../store/notificationStore'
import { cn } from '../lib/utils'
import { RideDriverCard } from '../components/ride/RideDriverCard'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { haversineKm } from '../utils/distance'
import type { Driver, Ride, Vehicle } from '../types/domain'

const SEARCH_REQUEST_KEY = 'urbanflow_search_request_id'
const MATCH_CONFIRM_MS = 30_000

type RideSearchPhase = 'IDLE' | 'SEARCHING' | 'DRIVER_NOT_FOUND'

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

/** Bottom sheet below 768px; centered desktop modal at 768px and up. */
function useMatchSheetMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

function MatchSuccessCheck({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.45, 0.64, 1] }}
      className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md', className)}
    >
      <Check className="h-8 w-8" strokeWidth={2.75} aria-hidden />
    </motion.div>
  )
}

function DriverMatchModalBody({
  t,
  routeSummaryLine,
  countdownSeconds,
  progressPct,
  foundDriver,
  foundVehicle,
  foundRide,
  distPickup,
  actionBusy,
  push,
  qc,
  me,
  navigate,
  setActionBusy,
  setFoundRide,
  setFoundDriver,
  setFoundVehicle,
  contentPtClass,
}: {
  t: AppMessages
  routeSummaryLine: string
  countdownSeconds: number
  progressPct: number
  foundDriver: Driver
  foundVehicle: Vehicle
  foundRide: Ride
  distPickup: number
  actionBusy: 'confirm' | 'new_driver' | null
  push: (message: string, type?: 'success' | 'error' | 'info') => void
  qc: QueryClient
  me: PassengerMe
  navigate: NavigateFunction
  setActionBusy: (v: 'confirm' | 'new_driver' | null) => void
  setFoundRide: (r: Ride) => void
  setFoundDriver: (d: Driver) => void
  setFoundVehicle: (v: Vehicle) => void
  contentPtClass: string
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-6', contentPtClass)}>
      <div className="flex flex-col items-center gap-1">
        <MatchSuccessCheck />
        <h3 id="driver-match-title" className="text-center text-lg font-semibold text-brand-navy">
          {t.ride.matchFoundTitle}
        </h3>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-center text-sm font-semibold text-brand-navy">
          {t.ride.confirmDriverCountdown.replace('{seconds}', String(countdownSeconds))}
        </p>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#F5A623] transition-[width] duration-75 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-full rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-600">
        {routeSummaryLine}
      </p>

      <div className="mt-4">
        <RideDriverCard
          driver={foundDriver}
          vehicle={foundVehicle}
          t={t}
          distPickup={distPickup}
          variant="matchSheet"
        />
      </div>

      <button
        type="button"
        className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#F5A623] text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
        disabled={actionBusy !== null}
        onClick={async () => {
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
          const driverName = `${foundDriver.firstName} ${foundDriver.lastName}`
          const vehicleLine = `${foundVehicle.brand} ${foundVehicle.model}`
          useNotificationBannerStore.getState().show({
            id: `defer-assign-${foundRide.id}-${Date.now()}`,
            accountId: me.account.id,
            title: t.ride.matchFoundTitle,
            body: t.ride.assignedBannerBody
              .replace('{driverName}', driverName)
              .replace('{vehicle}', vehicleLine)
              .replace('{plate}', foundVehicle.registration),
            path: `/app/ride/${foundRide.id}`,
            notificationType: 'DRIVER_ASSIGNED',
          })
          navigate(`/app/ride/${foundRide.id}`, { replace: true })
        }}
      >
        {actionBusy === 'confirm' ? t.common.loading : t.ride.confirmDriver}
      </button>

      <button
        type="button"
        className="mt-3 w-full text-center text-sm font-semibold text-[#6B7280] transition hover:text-slate-800 disabled:opacity-50"
        disabled={actionBusy !== null}
        onClick={async () => {
          setActionBusy('new_driver')
          const res = await requestNewDriverForRide(foundRide.id, me.account.id)
          if ('error' in res) {
            push(res.error === 'no_drivers' ? t.order.noDrivers : t.common.error, 'error')
            setActionBusy(null)
            return
          }
          const [driver, vehicle] = await Promise.all([getDriverById(res.ride.driverId), getVehicleById(res.ride.vehicleId)])
          if (!driver || !vehicle) {
            setActionBusy(null)
            push(t.common.error, 'error')
            return
          }
          setFoundRide(res.ride)
          setFoundDriver(driver)
          setFoundVehicle(vehicle)
          setActionBusy(null)
          push(t.ride.newDriverAssigned, 'success')
        }}
      >
        {actionBusy === 'new_driver' ? t.common.loading : t.ride.requestAnotherDriverLink}
      </button>
    </div>
  )
}

export function SearchingPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { requestId?: string } }
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const requestId = location.state?.requestId ?? getStoredSearchRequestId()
  const [checked, setChecked] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [rideSearchPhase, setRideSearchPhase] = useState<RideSearchPhase>('IDLE')
  const [secondsWaiting, setSecondsWaiting] = useState(0)
  const [foundRide, setFoundRide] = useState<Ride | null>(null)
  const [foundDriver, setFoundDriver] = useState<Driver | null>(null)
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null)
  const [actionBusy, setActionBusy] = useState<'confirm' | 'new_driver' | null>(null)
  const [confirmMsLeft, setConfirmMsLeft] = useState(MATCH_CONFIRM_MS)
  const isMatchSheetMobile = useMatchSheetMobile()

  const candidates = useMemo(() => getDb().drivers.slice(0, 4), [])

  const foundRideRef = useRef<Ride | null>(null)
  foundRideRef.current = foundRide

  const actionBusyRef = useRef(false)
  actionBusyRef.current = actionBusy !== null

  const expireStartedForRideId = useRef<string | null>(null)
  const expireFiredRef = useRef(false)
  const matchDismissLockRef = useRef(false)

  const dismissMatchWithoutConfirm = useCallback(async () => {
    const ride = foundRideRef.current
    if (!ride || matchDismissLockRef.current) return
    matchDismissLockRef.current = true
    try {
      await cancelRide(ride.id, me.account.id, t.ride.cancelByPassengerDefault)
      clearStoredSearchRequestId()
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['history', me.profile.id] })
    } finally {
      navigate('/app/order', { replace: true })
    }
  }, [me.account.id, me.profile.id, navigate, qc, t.ride.cancelByPassengerDefault])

  useEffect(() => {
    if (!requestId) {
      clearStoredSearchRequestId()
      navigate('/app/order', { replace: true })
      return
    }
    let alive = true
    setRideSearchPhase('IDLE')
    setLoading(true)
    ;(async () => {
      const pending = await getPassengerRideRequestIfSearchable(requestId, me.profile.id)
      if (!alive) return
      if (!pending) {
        clearStoredSearchRequestId()
        navigate('/app/order', { replace: true })
        return
      }
      setStoredSearchRequestId(requestId)
      setRideSearchPhase('SEARCHING')
      const res = await assignDriver(requestId, me.account.id, { forceNoDrivers: false })
      if (!alive) return
      if ('error' in res) {
        clearStoredSearchRequestId()
        if (res.error === 'not_found') {
          setLoading(false)
          push(strings().common.error, 'error')
          navigate('/app/order', { replace: true })
          return
        }
        await cancelRideRequest(requestId, me.account.id)
        setRideSearchPhase('DRIVER_NOT_FOUND')
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
  }, [me.account.id, me.profile.id, navigate, push, requestId])

  useEffect(() => {
    if (!loading || rideSearchPhase !== 'SEARCHING') return
    let i = 0
    const tick = window.setInterval(() => {
      const id = candidates[i % candidates.length]?.id
      if (id) setChecked((c) => (c.includes(id) ? c : [...c, id]))
      i++
    }, 600)
    return () => clearInterval(tick)
  }, [loading, rideSearchPhase, candidates])

  useEffect(() => {
    if (!loading || rideSearchPhase !== 'SEARCHING') return
    setSecondsWaiting(0)
    const timer = window.setInterval(() => {
      setSecondsWaiting((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, rideSearchPhase])

  const showFoundModal =
    !!foundRide && !loading && rideSearchPhase === 'SEARCHING' && !!foundDriver && !!foundVehicle

  const distPickup = useMemo(() => {
    if (!foundRide || !foundDriver) return 0
    const pos =
      foundRide.driverLat != null && foundRide.driverLng != null
        ? { lat: foundRide.driverLat, lng: foundRide.driverLng }
        : foundDriver.currentLocation
    return haversineKm(pos, foundRide.pickup)
  }, [foundRide, foundDriver])

  useEffect(() => {
    if (!showFoundModal || !foundRide) return
    const rideId = foundRide.id
    expireStartedForRideId.current = rideId
    expireFiredRef.current = false
    matchDismissLockRef.current = false
    setConfirmMsLeft(MATCH_CONFIRM_MS)
    const started = Date.now()
    let cancelled = false

    const tick = () => {
      if (cancelled || expireStartedForRideId.current !== rideId) return
      const elapsed = Date.now() - started
      const left = Math.max(0, MATCH_CONFIRM_MS - elapsed)
      setConfirmMsLeft(left)
      if (left <= 0 && !actionBusyRef.current && !expireFiredRef.current) {
        expireFiredRef.current = true
        cancelled = true
        void dismissMatchWithoutConfirm()
      }
    }
    const id = window.setInterval(tick, 50)
    tick()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [showFoundModal, foundRide?.id, foundDriver?.id, dismissMatchWithoutConfirm])

  if (!requestId || rideSearchPhase === 'IDLE') {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <LoadingState />
      </div>
    )
  }

  const countdownSeconds = Math.max(0, Math.ceil(confirmMsLeft / 1000))
  const progressPct = (confirmMsLeft / MATCH_CONFIRM_MS) * 100

  const routeSummaryLine =
    foundRide && foundDriver && foundVehicle
      ? `${foundRide.pickup.label} → ${foundRide.destination.label} · ${foundRide.distanceKm.toFixed(1)} ${t.order.km} · ~${foundRide.estimatedDurationMin} ${t.order.min} · ${foundRide.estimatedPrice.toFixed(2)} ${t.order.bam}`
      : ''

  return (
    <>
    <div
      className={cn(
        'mx-auto max-w-lg space-y-6 px-4 py-10',
        /* Desktop: hide only the page card while modal is open — modal must stay outside this div or md:hidden hides it too. */
        showFoundModal && 'md:hidden'
      )}
    >
      <Card>
        <CardContent className="space-y-6 py-8 text-center">
          <motion.div
            animate={
              showFoundModal || rideSearchPhase === 'DRIVER_NOT_FOUND'
                ? { y: 0 }
                : { y: [0, -4, 0] }
            }
            transition={
              showFoundModal || rideSearchPhase === 'DRIVER_NOT_FOUND'
                ? { duration: 0.2 }
                : { repeat: Infinity, duration: 1.2 }
            }
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-md',
              showFoundModal
                ? 'bg-transparent shadow-none'
                : rideSearchPhase === 'DRIVER_NOT_FOUND'
                  ? 'bg-red-50 text-brand-danger'
                  : 'bg-brand-yellow text-brand-navy'
            )}
          >
            {showFoundModal ? (
              <MatchSuccessCheck />
            ) : rideSearchPhase === 'DRIVER_NOT_FOUND' ? (
              <X className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" />
            )}
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">
              {showFoundModal
                ? t.ride.matchFoundTitle
                : rideSearchPhase === 'SEARCHING'
                  ? t.order.searching
                  : t.order.noDrivers}
            </h2>
            {rideSearchPhase === 'SEARCHING' && !showFoundModal ? (
              <p className="mt-2 text-sm text-slate-600">{t.order.searchingSubtitle}</p>
            ) : null}
            {rideSearchPhase === 'SEARCHING' && !showFoundModal ? (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {t.order.waitingTime.replace('{seconds}', String(secondsWaiting).padStart(2, '0'))}
              </p>
            ) : null}
          </div>
          {rideSearchPhase === 'SEARCHING' && !showFoundModal ? (
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
          ) : null}
          {rideSearchPhase === 'DRIVER_NOT_FOUND' ? (
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
    </div>

      <AnimatePresence>
        {showFoundModal && foundRide && foundDriver && foundVehicle ? (
          <>
            <motion.div
              key="match-backdrop"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={
                isMatchSheetMobile
                  ? 'fixed inset-0 z-[120] bg-black/40'
                  : 'pointer-events-none fixed inset-0 z-[120] bg-[rgba(0,0,0,0.3)] backdrop-blur-[4px]'
              }
            />
            {isMatchSheetMobile ? (
              <motion.div
                key="match-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="driver-match-title"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                className="fixed bottom-0 left-0 right-0 z-[130] flex max-h-[70vh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)]"
              >
                <div className="flex shrink-0 justify-center pt-3 pb-2">
                  <span className="block h-1 w-9 shrink-0 rounded-full bg-[#D1D5DB]" aria-hidden />
                </div>
                <DriverMatchModalBody
                  t={t}
                  routeSummaryLine={routeSummaryLine}
                  countdownSeconds={countdownSeconds}
                  progressPct={progressPct}
                  foundDriver={foundDriver}
                  foundVehicle={foundVehicle}
                  distPickup={distPickup}
                  actionBusy={actionBusy}
                  foundRide={foundRide}
                  push={push}
                  qc={qc}
                  me={me}
                  navigate={navigate}
                  setActionBusy={setActionBusy}
                  setFoundRide={setFoundRide}
                  setFoundDriver={setFoundDriver}
                  setFoundVehicle={setFoundVehicle}
                  contentPtClass="pt-1"
                />
              </motion.div>
            ) : (
              <div
                key="match-desktop-center"
                className="pointer-events-none fixed inset-0 z-[130] flex items-center justify-center p-4"
              >
                <motion.div
                  key="match-desktop-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="driver-match-title"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                  className="pointer-events-auto relative flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
                >
                  <button
                    type="button"
                    className="absolute right-3 top-3 z-10 rounded-lg p-1 text-[#9CA3AF] transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={t.common.close}
                    disabled={actionBusy !== null}
                    onClick={() => void dismissMatchWithoutConfirm()}
                  >
                    <X className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </button>
                  <DriverMatchModalBody
                    t={t}
                    routeSummaryLine={routeSummaryLine}
                    countdownSeconds={countdownSeconds}
                    progressPct={progressPct}
                    foundDriver={foundDriver}
                    foundVehicle={foundVehicle}
                    distPickup={distPickup}
                    actionBusy={actionBusy}
                    foundRide={foundRide}
                    push={push}
                    qc={qc}
                    me={me}
                    navigate={navigate}
                    setActionBusy={setActionBusy}
                    setFoundRide={setFoundRide}
                    setFoundDriver={setFoundDriver}
                    setFoundVehicle={setFoundVehicle}
                    contentPtClass="pt-2"
                  />
                </motion.div>
              </div>
            )}
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
