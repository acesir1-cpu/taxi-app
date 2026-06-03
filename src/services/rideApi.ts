import type { Driver, Location, OrderType, Rating, Ride, RideRequest, RideStatus, Vehicle } from '../types/domain'
import type { NotificationType } from '../types/notifications'
import { SHOW_DEMO } from '../lib/showDemo'
import { haversineKm } from '../utils/distance'
import { delay } from './delay'
import { calculateRoute } from './locationApi'
import { appendNotification } from './notificationApi'
import { getDb, persist } from './mockDb'
import { getHistoryPrivacyPrefs } from '../lib/historyPrivacy'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatTimeBs(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const PASSENGER_PURGE_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  'RIDE_REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'RIDE_STARTED',
  'RIDE_COMPLETED',
  'RIDE_CANCELLED_BY_DRIVER',
  'RIDE_CANCELLED_BY_USER',
  'PAYMENT_PROCESSED',
  'SCHEDULED_RIDE_REMINDER',
  'SCHEDULED_RIDE_CONFIRMED',
  'SCHEDULED_RIDE_CANCELLED',
])

async function notifyPassengerDriverAssignedPair(
  accountId: string,
  ride: Ride,
  driver: Driver,
  vehicle: Vehicle,
  distKm: number
): Promise<void> {
  const driverName = `${driver.firstName} ${driver.lastName}`
  const vehicleLabel = `${vehicle.brand} ${vehicle.model}`
  const plate = vehicle.registration
  const etaMin = Math.max(1, Math.round(distKm * 2))
  await appendNotification({
    accountId,
    type: 'DRIVER_ASSIGNED',
    title: 'Vozač pronađen',
    body: `${driverName} · ${vehicleLabel} · ${plate} je na putu do vas`,
    rideId: ride.id,
    targetApp: 'passenger',
    /** Banner deferred until passenger confirms match (see SearchingPage). */
    showBanner: false,
  })
  await appendNotification({
    accountId,
    type: 'DRIVER_EN_ROUTE',
    title: 'Vozač dolazi',
    body: `${driverName} je ~${etaMin} min od vas · ${distKm.toFixed(1)} km`,
    rideId: ride.id,
    targetApp: 'passenger',
  })
}

const ACTIVE_RIDE_STATUSES: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']

/** Abandoned match (passenger never confirmed); frees drivers stuck as zauzet without spamming new orders. */
const STALE_UNCONFIRMED_MATCH_MS = 4 * 60 * 1000

export function isRideActive(status: RideStatus): boolean {
  return ACTIVE_RIDE_STATUSES.includes(status)
}

function normalizeDriverAvailabilityFromActiveRides(): void {
  const db = getDb()
  let changed = false
  const nowMs = Date.now()

  for (const ride of db.rides) {
    if (ride.status !== 'dodijeljena') continue
    const assignedMs = new Date(ride.assignedAt ?? ride.createdAt).getTime()
    if (Number.isNaN(assignedMs) || nowMs - assignedMs <= STALE_UNCONFIRMED_MATCH_MS) continue
    ride.status = 'otkazana'
    ride.cancelledAt = ride.cancelledAt ?? new Date().toISOString()
    ride.cancellationReason = ride.cancellationReason ?? 'Vrijeme za potvrdu vožnje je isteklo'
    const staleDriver = db.drivers.find((d) => d.id === ride.driverId)
    if (staleDriver?.availabilityStatus === 'zauzet') {
      staleDriver.availabilityStatus = 'dostupan'
    }
    const staleReq = db.rideRequests.find((r) => r.id === ride.requestId)
    if (staleReq && staleReq.status !== 'otkazan' && staleReq.status !== 'neuspjesan') {
      staleReq.status = 'otkazan'
    }
    changed = true
  }

  /** Stale rows: ride still “active” while the request was already cancelled/failed (e.g. interrupted flow). */
  for (const ride of db.rides) {
    if (!isRideActive(ride.status)) continue
    const req = db.rideRequests.find((r) => r.id === ride.requestId)
    if (req && (req.status === 'otkazan' || req.status === 'neuspjesan')) {
      ride.status = 'otkazana'
      ride.cancelledAt = ride.cancelledAt ?? new Date().toISOString()
      ride.cancellationReason = ride.cancellationReason ?? 'Zahtjev otkazan ili neuspješan'
      const driver = db.drivers.find((d) => d.id === ride.driverId)
      if (driver?.availabilityStatus === 'zauzet') {
        driver.availabilityStatus = 'dostupan'
      }
      changed = true
    }
  }

  const activeDriverIds = new Set(
    db.rides.filter((ride) => isRideActive(ride.status)).map((ride) => ride.driverId)
  )
  for (const driver of db.drivers) {
    if (driver.availabilityStatus === 'zauzet' && !activeDriverIds.has(driver.id)) {
      driver.availabilityStatus = 'dostupan'
      changed = true
    }
  }
  if (changed) persist()
}

export async function getActiveRide(passengerProfileId: string): Promise<Ride | null> {
  await delay(200)
  normalizeDriverAvailabilityFromActiveRides()
  const db = getDb()
  const passengerVisibleActiveStatuses: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']
  return (
    db.rides.find(
      (r) => r.passengerId === passengerProfileId && passengerVisibleActiveStatuses.includes(r.status)
    ) ?? null
  )
}

export async function getRideById(rideId: string): Promise<Ride | null> {
  await delay(150)
  const db = getDb()
  return db.rides.find((r) => r.id === rideId) ?? null
}

export async function getRideHistory(passengerProfileId: string): Promise<Ride[]> {
  await delay()
  const db = getDb()
  const profile = db.profiles.find((p) => p.id === passengerProfileId)
  if (profile && !getHistoryPrivacyPrefs(profile.accountId).saveHistory) {
    return []
  }

  let normalized = false
  for (const ride of db.rides) {
    if (ride.status === 'zavrsena' && (!ride.startedAt || !ride.finishedAt)) {
      ride.status = 'neuspjesna'
      ride.cancellationReason = ride.cancellationReason ?? 'Voznja nije odrzana'
      normalized = true
    }
  }
  if (normalized) persist()

  return db.rides
    .filter((r) => r.passengerId === passengerProfileId && ['zavrsena', 'otkazana', 'neuspjesna'].includes(r.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const PASSENGER_HISTORY_STATUSES: RideStatus[] = ['zavrsena', 'otkazana', 'neuspjesna']

function passengerHasHistoryRides(db: ReturnType<typeof getDb>, passengerProfileId: string): boolean {
  return db.rides.some(
    (r) => r.passengerId === passengerProfileId && PASSENGER_HISTORY_STATUSES.includes(r.status)
  )
}

export async function purgePassengerHistory(
  accountId: string,
  passengerProfileId: string
): Promise<{ ok: true }> {
  await delay(180)
  const db = getDb()
  const removedRideIds = new Set(
    db.rides.filter((r) => r.passengerId === passengerProfileId).map((r) => r.id)
  )
  db.rides = db.rides.filter((r) => r.passengerId !== passengerProfileId)
  db.rideRequests = db.rideRequests.filter((r) => r.passengerId !== passengerProfileId)
  db.passengerDemoHistoryCleared = true
  db.ratings = db.ratings.filter((r) => r.passengerId !== passengerProfileId)
  db.complaints = db.complaints.filter(
    (c) => c.submittedByAccountId !== accountId || !c.rideId || !removedRideIds.has(c.rideId)
  )
  db.notifications = db.notifications.filter((n) => {
    if (n.accountId !== accountId) return true
    if (String(n.type) === 'ride') return false
    return !PASSENGER_PURGE_NOTIFICATION_TYPES.has(n.type as NotificationType)
  })
  for (const driver of db.drivers) {
    if (driver.availabilityStatus === 'zauzet') {
      driver.availabilityStatus = 'dostupan'
    }
  }
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'system',
    description: 'Historija voznji trajno obrisana iz aplikacije',
    createdAt: new Date().toISOString(),
  })
  persist()
  await appendNotification({
    accountId,
    type: 'SYSTEM_MESSAGE',
    title: 'Historija obrisana',
    body: 'Cijela historija vožnji je uklonjena iz aplikacije.',
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true }
}

export async function deleteRideFromHistory(
  rideId: string,
  accountId: string,
  passengerProfileId: string
): Promise<{ ok: true } | { error: 'not_found' | 'forbidden' }> {
  await delay(140)
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  if (ride.passengerId !== passengerProfileId) return { error: 'forbidden' }
  db.rides = db.rides.filter((r) => r.id !== rideId)
  db.rideRequests = db.rideRequests.filter((r) => r.id !== ride.requestId)
  db.ratings = db.ratings.filter((r) => r.rideId !== rideId)
  db.complaints = db.complaints.filter((c) => c.rideId !== rideId)
  if (!passengerHasHistoryRides(db, passengerProfileId)) {
    db.passengerDemoHistoryCleared = true
  }
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'ride',
    description: `Voznja obrisana iz historije ${rideId}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  await appendNotification({
    accountId,
    type: 'SYSTEM_MESSAGE',
    title: 'Historija',
    body: 'Vožnja je uklonjena iz historije.',
    rideId,
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true }
}

export interface CreateRideRequestInput {
  passengerProfileId: string
  accountId: string
  pickup: Location
  destination: Location
  orderType: OrderType
  scheduledAt?: string
}

export async function createRideRequest(
  input: CreateRideRequestInput
): Promise<{ ok: true; request: RideRequest } | { error: string }> {
  await delay()
  const db = getDb()
  const active = await getActiveRide(input.passengerProfileId)
  if (active) return { error: 'active_exists' }

  if (
    (input.pickup.id === input.destination.id && input.pickup.lat === input.destination.lat) ||
    haversineKm(input.pickup, input.destination) < 0.05
  ) {
    return { error: 'same_location' }
  }
  if (input.orderType === 'zakazano' && input.scheduledAt) {
    if (new Date(input.scheduledAt) <= new Date()) {
      return { error: 'past_schedule' }
    }
  }

  const route = await calculateRoute(input.pickup, input.destination)
  if ('error' in route) {
    if (route.error === 'same') return { error: 'same_location' }
    return { error: 'outside_zone' }
  }

  const req: RideRequest = {
    id: uid('req'),
    passengerId: input.passengerProfileId,
    pickup: input.pickup,
    destination: input.destination,
    createdAt: new Date().toISOString(),
    orderType: input.orderType,
    scheduledAt: input.orderType === 'zakazano' ? input.scheduledAt : undefined,
    estimatedPrice: route.estimatedPrice,
    estimatedDurationMin: route.durationMin,
    estimatedEtaMin: route.durationMin,
    distanceKm: route.distanceKm,
    status: 'kreiran',
  }
  db.rideRequests.push(req)
  db.activityLogs.unshift({
    id: uid('log'),
    accountId: input.accountId,
    type: 'ride',
    description: `Kreiran zahtjev za vožnju ${req.id}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  if (input.orderType === 'zakazano' && input.scheduledAt) {
    await appendNotification({
      accountId: input.accountId,
      type: 'SCHEDULED_RIDE_CONFIRMED',
      title: 'Zakazana vožnja potvrđena',
      body: `Vožnja ${input.pickup.label} → ${input.destination.label} · ${formatTimeBs(input.scheduledAt)}`,
      rideId: req.id,
      targetApp: 'passenger',
      showBanner: false,
    })
    if (SHOW_DEMO) {
      const at = new Date(input.scheduledAt).getTime()
      const fireAt = at - 30 * 60 * 1000
      const delayMs = fireAt - Date.now()
      if (delayMs > 3000) {
        window.setTimeout(() => {
          void appendNotification({
            accountId: input.accountId,
            type: 'SCHEDULED_RIDE_REMINDER',
            title: 'Zakazana vožnja za 30 min',
            body: `Vožnja ${input.pickup.label} → ${input.destination.label} kreće u ${formatTimeBs(input.scheduledAt!)}`,
            rideId: req.id,
            targetApp: 'passenger',
            showBanner: false,
          })
        }, delayMs)
      }
    }
  } else {
    await appendNotification({
      accountId: input.accountId,
      type: 'RIDE_REQUESTED',
      title: 'Zahtjev poslan',
      body: `Tražimo vozila za relaciju ${input.pickup.label} → ${input.destination.label}`,
      rideId: req.id,
      targetApp: 'passenger',
      showBanner: false,
    })
  }
  return { ok: true, request: req }
}

export async function getScheduledRideRequests(passengerProfileId: string): Promise<RideRequest[]> {
  await delay(120)
  const db = getDb()
  return db.rideRequests
    .filter(
      (request) =>
        request.passengerId === passengerProfileId &&
        request.orderType === 'zakazano' &&
        ['kreiran', 'u_obradi', 'dodijeljen'].includes(request.status)
    )
    .sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
}

export interface UpdateScheduledRideRequestInput {
  requestId: string
  accountId: string
  passengerProfileId: string
  pickup: Location
  destination: Location
  scheduledAt: string
}

export async function updateScheduledRideRequest(
  input: UpdateScheduledRideRequestInput
): Promise<{ ok: true; request: RideRequest } | { error: string }> {
  await delay(160)
  const db = getDb()
  const request = db.rideRequests.find((item) => item.id === input.requestId)
  if (!request) return { error: 'not_found' }
  if (request.passengerId !== input.passengerProfileId) return { error: 'forbidden' }
  if (request.orderType !== 'zakazano') return { error: 'invalid_type' }
  if (!['kreiran', 'u_obradi', 'dodijeljen'].includes(request.status)) return { error: 'invalid_state' }

  if (
    (input.pickup.id === input.destination.id && input.pickup.lat === input.destination.lat) ||
    haversineKm(input.pickup, input.destination) < 0.05
  ) {
    return { error: 'same_location' }
  }

  const nextScheduled = new Date(input.scheduledAt)
  if (Number.isNaN(nextScheduled.getTime()) || nextScheduled <= new Date()) {
    return { error: 'past_schedule' }
  }

  const route = await calculateRoute(input.pickup, input.destination)
  if ('error' in route) {
    if (route.error === 'same') return { error: 'same_location' }
    return { error: 'outside_zone' }
  }

  request.pickup = input.pickup
  request.destination = input.destination
  request.scheduledAt = nextScheduled.toISOString()
  request.estimatedPrice = route.estimatedPrice
  request.estimatedDurationMin = route.durationMin
  request.estimatedEtaMin = route.durationMin
  request.distanceKm = route.distanceKm
  db.activityLogs.unshift({
    id: uid('log'),
    accountId: input.accountId,
    type: 'ride',
    description: `Uređena zakazana vožnja ${request.id}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  await appendNotification({
    accountId: input.accountId,
    type: 'SCHEDULED_RIDE_CONFIRMED',
    title: 'Zakazana vožnja ažurirana',
    body: `Vožnja ${input.pickup.label} → ${input.destination.label} · ${formatTimeBs(input.scheduledAt)}`,
    rideId: request.id,
    targetApp: 'passenger',
    showBanner: false,
  })
  return { ok: true, request }
}

type AssignDriverResult = { ok: true; ride: Ride } | { error: 'no_drivers' | 'not_found' }
const assignmentLocks = new Map<string, Promise<AssignDriverResult>>()

/** Eligible for starting or continuing driver search (not cancelled / failed). */
export async function getPassengerRideRequestIfSearchable(
  requestId: string,
  passengerProfileId: string
): Promise<RideRequest | null> {
  await delay(50)
  const db = getDb()
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request || request.passengerId !== passengerProfileId) return null
  if (request.status === 'otkazan' || request.status === 'neuspjesan') return null
  return request
}

export async function assignDriver(
  requestId: string,
  accountId: string,
  options?: { forceNoDrivers?: boolean }
): Promise<AssignDriverResult> {
  const lockKey = `${requestId}:${options?.forceNoDrivers === true ? 'force' : 'normal'}`
  const locked = assignmentLocks.get(lockKey)
  if (locked) return locked

  const run = assignDriverUnlocked(requestId, accountId, options)
  assignmentLocks.set(lockKey, run)
  try {
    return await run
  } finally {
    assignmentLocks.delete(lockKey)
  }
}

async function assignDriverUnlocked(
  requestId: string,
  accountId: string,
  options?: { forceNoDrivers?: boolean }
): Promise<AssignDriverResult> {
  await delay(2000 + Math.floor(Math.random() * 2000))
  normalizeDriverAvailabilityFromActiveRides()
  const db = getDb()
  const forceNoDrivers = options?.forceNoDrivers === true
  if (forceNoDrivers) {
    const req = db.rideRequests.find((r) => r.id === requestId)
    if (req) {
      req.status = 'neuspjesan'
      persist()
    }
    await appendNotification({
      accountId,
      type: 'SYSTEM_MESSAGE',
      title: 'Nema dostupnih vozila',
      body: 'Trenutno nema slobodnih vozila u vašoj zoni. Pokušajte ponovo kasnije.',
      targetApp: 'passenger',
      showBanner: false,
    })
    return { error: 'no_drivers' }
  }
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request) return { error: 'not_found' }
  if (request.status === 'otkazan' || request.status === 'neuspjesan') {
    return { error: 'not_found' }
  }
  if (request.rideId) {
    const existing = db.rides.find((r) => r.id === request.rideId)
    if (existing) return { ok: true, ride: existing }
  }
  request.status = 'u_obradi'

  const candidates = db.drivers
    .filter((d) => d.availabilityStatus === 'dostupan')
    .map((d) => {
      const veh = db.vehicles.find((v) => v.id === d.vehicleId)
      return { driver: d, vehicle: veh }
    })
    .filter((x) => x.vehicle && x.vehicle.status === 'dostupno')
    .map((x) => ({
      driver: x.driver,
      vehicle: x.vehicle!,
      dist: haversineKm(x.driver.currentLocation, request.pickup),
    }))
    .sort((a, b) => a.dist - b.dist)

  if (candidates.length === 0) {
    request.status = 'neuspjesan'
    persist()
    await appendNotification({
      accountId,
      type: 'SYSTEM_MESSAGE',
      title: 'Nema dostupnih vozila',
      body: 'Trenutno nema slobodnih vozila u vašoj zoni. Pokušajte ponovo kasnije.',
      targetApp: 'passenger',
      showBanner: false,
    })
    return { error: 'no_drivers' }
  }

  const best = candidates[0]!
  best.driver.availabilityStatus = 'zauzet'
  request.status = 'dodijeljen'
  try {
    const route = await calculateRoute(request.pickup, request.destination)
    if ('error' in route) {
      request.status = 'neuspjesan'
      best.driver.availabilityStatus = 'dostupan'
      persist()
      return { error: 'no_drivers' }
    }

    const ride: Ride = {
      id: uid('ride'),
      requestId: request.id,
      passengerId: request.passengerId,
      driverId: best.driver.id,
      vehicleId: best.vehicle.id,
      status: 'dodijeljena',
      pickup: request.pickup,
      destination: request.destination,
      routePoints: route.routePoints,
      estimatedPrice: route.estimatedPrice,
      distanceKm: route.distanceKm,
      estimatedDurationMin: route.durationMin,
      paymentMethod: 'gotovina',
      orderType: request.orderType,
      scheduledAt: request.orderType === 'zakazano' ? request.scheduledAt : undefined,
      createdAt: new Date().toISOString(),
      assignedAt: new Date().toISOString(),
      driverLat: best.driver.currentLocation.lat,
      driverLng: best.driver.currentLocation.lng,
    }
    request.rideId = ride.id
    db.rides.push(ride)
    persist()
    await notifyPassengerDriverAssignedPair(accountId, ride, best.driver, best.vehicle, best.dist)
    return { ok: true, ride }
  } catch {
    request.status = 'neuspjesan'
    best.driver.availabilityStatus = 'dostupan'
    persist()
    return { error: 'no_drivers' }
  }
}

export async function cancelRideRequest(
  requestId: string,
  accountId: string
): Promise<{ ok: true } | { error: 'not_found' }> {
  await delay(120)
  const db = getDb()
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request) return { error: 'not_found' }
  const wasScheduled = request.orderType === 'zakazano'
  request.status = 'otkazan'
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'ride',
    description: `Zahtjev otkazan ${requestId}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  if (wasScheduled) {
    await appendNotification({
      accountId,
      type: 'SCHEDULED_RIDE_CANCELLED',
      title: 'Zakazana vožnja otkazana',
      body: `Otkazali ste vožnju ${request.pickup.label} → ${request.destination.label}`,
      rideId: requestId,
      targetApp: 'passenger',
      showBanner: false,
    })
  }
  return { ok: true }
}

export async function setRideStatus(
  rideId: string,
  status: RideStatus,
  accountId: string,
  extras?: { cancellationReason?: string }
): Promise<{ ok: true; ride: Ride } | { error: string }> {
  await delay(200)
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  const accProfile = db.profiles.find((p) => p.accountId === accountId)
  if (!accProfile || ride.passengerId !== accProfile.id) return { error: 'forbidden' }
  if (['otkazana', 'zavrsena', 'neuspjesna'].includes(ride.status) && ride.status !== status) {
    return { error: 'invalid_transition' }
  }

  ride.status = status
  const now = new Date().toISOString()
  const driverRow = db.drivers.find((d) => d.id === ride.driverId)
  const driverName = driverRow ? `${driverRow.firstName} ${driverRow.lastName}` : 'Vozač'
  if (status === 'stigao') {
    ride.driverArrivedAt = now
    await appendNotification({
      accountId,
      type: 'DRIVER_ARRIVED',
      title: 'Vozač je stigao',
      body: `${driverName} čeka vas na ${ride.pickup.label}`,
      rideId: ride.id,
      targetApp: 'passenger',
    })
  }
  if (status === 'u_toku') {
    ride.startedAt = now
    await appendNotification({
      accountId,
      type: 'RIDE_STARTED',
      title: 'Vožnja počela',
      body: `Uživajte u vožnji do ${ride.destination.label}`,
      rideId: ride.id,
      targetApp: 'passenger',
      showBanner: false,
    })
  }
  if (status === 'zavrsena') {
    // Force-complete can skip the regular "u_toku" transition.
    // Ensure completed rides always have a valid start timestamp so
    // history normalization does not downgrade them to "neuspjesna".
    if (!ride.startedAt) {
      ride.startedAt = now
    }
    ride.finishedAt = now
    ride.finalPrice = ride.estimatedPrice
    const driver = db.drivers.find((d) => d.id === ride.driverId)
    if (driver) {
      driver.availabilityStatus = 'dostupan'
    }
    const priceStr = (ride.finalPrice ?? ride.estimatedPrice).toFixed(2)
    await appendNotification({
      accountId,
      type: 'RIDE_COMPLETED',
      title: 'Vožnja završena',
      body: `Stigli ste na ${ride.destination.label} · Cijena: ${priceStr} BAM. Ocijenite vožnju!`,
      rideId: ride.id,
      targetApp: 'passenger',
    })
    await appendNotification({
      accountId,
      type: 'PAYMENT_PROCESSED',
      title: 'Plaćanje uspješno',
      body: `${priceStr} BAM naplaćeno za vožnju ${ride.pickup.label} → ${ride.destination.label}`,
      rideId: ride.id,
      targetApp: 'passenger',
      showBanner: false,
    })
  }
  if (status === 'otkazana') {
    ride.cancelledAt = now
    ride.cancellationReason = extras?.cancellationReason ?? 'Otkazano'
    const driver = db.drivers.find((d) => d.id === ride.driverId)
    if (driver) driver.availabilityStatus = 'dostupan'
    const req = db.rideRequests.find((r) => r.id === ride.requestId)
    if (req) req.status = 'otkazan'
    await appendNotification({
      accountId,
      type: 'RIDE_CANCELLED_BY_USER',
      title: 'Vožnja otkazana',
      body: `Otkazali ste vožnju ${ride.pickup.label} → ${ride.destination.label}`,
      rideId: ride.id,
      targetApp: 'passenger',
      showBanner: false,
    })
    const driverProfile = db.driverProfiles.find((p) => p.linkedDriverId === ride.driverId)
    if (driverProfile) {
      const passengerProf = db.profiles.find((p) => p.id === ride.passengerId)
      const pname = passengerProf ? `${passengerProf.firstName} ${passengerProf.lastName}` : 'Putnik'
      await appendNotification({
        accountId: driverProfile.accountId,
        type: 'PASSENGER_CANCELLED',
        title: 'Putnik otkazao',
        body: `${pname} je otkazao vožnju do ${ride.destination.label}`,
        rideId: ride.id,
        targetApp: 'driver',
      })
    }
  }
  if ((status === 'zavrsena' || status === 'otkazana') && !getHistoryPrivacyPrefs(accountId).saveHistory) {
    db.rides = db.rides.filter((r) => r.id !== ride.id)
    db.ratings = db.ratings.filter((r) => r.rideId !== ride.id)
    db.complaints = db.complaints.filter((c) => c.rideId !== ride.id)
  }
  persist()
  return { ok: true, ride }
}

export async function updateDriverSimPosition(
  rideId: string,
  lat: number,
  lng: number
): Promise<void> {
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return
  ride.driverLat = lat
  ride.driverLng = lng
  const driver = db.drivers.find((d) => d.id === ride.driverId)
  if (driver) {
    driver.currentLocation = { lat, lng }
  }
  persist()
}

export async function cancelRide(
  rideId: string,
  accountId: string,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (ride.status === 'u_toku' || ride.status === 'zavrsena') {
    return { error: 'cannot_cancel' }
  }
  if (!isRideActive(ride.status) && ride.status !== 'dodijeljena') {
    return { error: 'cannot_cancel' }
  }
  await setRideStatus(rideId, 'otkazana', accountId, { cancellationReason: reason })
  return { ok: true }
}

export async function confirmPassengerEnteredVehicle(
  rideId: string,
  accountId: string
): Promise<{ ok: true; ride: Ride } | { error: string }> {
  await delay()
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (ride.status !== 'stigao') return { error: 'bad_state' }
  return setRideStatus(rideId, 'u_toku', accountId)
}

export async function requestNewDriverForRide(
  rideId: string,
  accountId: string
): Promise<{ ok: true; ride: Ride } | { error: 'not_found' | 'forbidden' | 'bad_state' | 'no_drivers' }> {
  await delay(300)
  normalizeDriverAvailabilityFromActiveRides()
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (ride.status === 'u_toku' || ride.status === 'zavrsena' || ride.status === 'otkazana' || ride.status === 'neuspjesna') {
    return { error: 'bad_state' }
  }

  const currentDriverId = ride.driverId
  const candidates = db.drivers
    .filter((d) => d.id !== currentDriverId && d.availabilityStatus === 'dostupan')
    .map((d) => {
      const veh = db.vehicles.find((v) => v.id === d.vehicleId)
      return { driver: d, vehicle: veh }
    })
    .filter((x) => x.vehicle && x.vehicle.status === 'dostupno')
    .map((x) => ({
      driver: x.driver,
      vehicle: x.vehicle!,
      dist: haversineKm(x.driver.currentLocation, ride.pickup),
    }))
    .sort((a, b) => a.dist - b.dist)

  if (candidates.length === 0) return { error: 'no_drivers' }

  const next = candidates[0]!
  const previousDriver = db.drivers.find((d) => d.id === currentDriverId)
  if (previousDriver) previousDriver.availabilityStatus = 'dostupan'
  next.driver.availabilityStatus = 'zauzet'

  ride.driverId = next.driver.id
  ride.vehicleId = next.vehicle.id
  ride.status = 'dodijeljena'
  ride.assignedAt = new Date().toISOString()
  ride.driverArrivedAt = undefined
  ride.startedAt = undefined
  ride.driverLat = next.driver.currentLocation.lat
  ride.driverLng = next.driver.currentLocation.lng

  persist()
  await notifyPassengerDriverAssignedPair(accountId, ride, next.driver, next.vehicle, next.dist)
  return { ok: true, ride }
}

export async function repeatRide(
  rideId: string,
  accountId: string
): Promise<{ pickup: Location; destination: Location } | { error: string }> {
  await delay()
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  return {
    pickup: { ...ride.pickup },
    destination: { ...ride.destination },
  }
}

export async function rateRide(
  rideId: string,
  accountId: string,
  passengerProfileId: string,
  stars: number,
  comment?: string
): Promise<{ ok: true } | { error: string }> {
  await delay()
  if (stars < 1 || stars > 5) return { error: 'stars' }
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride || ride.status !== 'zavrsena') return { error: 'not_ratable' }
  const profile = db.profiles.find((p) => p.accountId === accountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (db.ratings.some((x) => x.rideId === rideId)) return { error: 'already' }

  const driver = db.drivers.find((d) => d.id === ride.driverId)
  const driverAvgBefore = driver?.rating ?? 5
  const rating = {
    id: uid('rat'),
    rideId,
    driverId: ride.driverId,
    passengerId: passengerProfileId,
    stars,
    comment: comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  db.ratings.push(rating)
  if (driver) {
    const total = driver.totalRatings + 1
    driver.rating = Math.round(((driver.rating * driver.totalRatings + stars) / total) * 10) / 10
    driver.totalRatings = total
  }
  persist()
  await appendNotification({
    accountId,
    type: 'SYSTEM_MESSAGE',
    title: 'Hvala vam',
    body: 'Vaša ocjena je sačuvana.',
    rideId,
    targetApp: 'passenger',
    showBanner: false,
  })
  const driverProfile = db.driverProfiles.find((p) => p.linkedDriverId === ride.driverId)
  if (driverProfile && driver && driverAvgBefore >= 4 && driver.rating < 4) {
    await appendNotification({
      accountId: driverProfile.accountId,
      type: 'LOW_RATING_ALERT',
      title: 'Upozorenje o ocjeni',
      body: 'Vaša prosječna ocjena je pala ispod 4.0. Pokušajte poboljšati uslugu.',
      targetApp: 'driver',
      showBanner: false,
    })
  }
  return { ok: true }
}

export async function getRatingForRide(rideId: string): Promise<Rating | null> {
  await delay(100)
  const db = getDb()
  return db.ratings.find((r) => r.rideId === rideId) ?? null
}

export async function getRequestById(id: string): Promise<RideRequest | null> {
  await delay(80)
  return getDb().rideRequests.find((r) => r.id === id) ?? null
}

/** Dev: release all drivers */
export async function resetAllDriversAvailable(): Promise<void> {
  const db = getDb()
  for (const d of db.drivers) {
    if (d.availabilityStatus === 'zauzet') d.availabilityStatus = 'dostupan'
  }
  persist()
}

export async function getDriverById(id: string): Promise<Driver | null> {
  await delay(80)
  return getDb().drivers.find((d) => d.id === id) ?? null
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  await delay(80)
  return getDb().vehicles.find((v) => v.id === id) ?? null
}
