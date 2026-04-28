import type { Driver, Location, OrderType, Rating, Ride, RideRequest, RideStatus, Vehicle } from '../types/domain'
import { haversineKm } from '../utils/distance'
import { delay } from './delay'
import { calculateRoute } from './locationApi'
import { strings } from '../i18n/strings'
import { addNotification } from './notificationApi'
import { getDb, persist } from './mockDb'
import { getHistoryPrivacyPrefs } from '../lib/historyPrivacy'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const ACTIVE_RIDE_STATUSES: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']

export function isRideActive(status: RideStatus): boolean {
  return ACTIVE_RIDE_STATUSES.includes(status)
}

function normalizeDriverAvailabilityFromActiveRides(): void {
  const db = getDb()
  const activeDriverIds = new Set(
    db.rides.filter((ride) => isRideActive(ride.status)).map((ride) => ride.driverId)
  )
  let changed = false
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
  const db = getDb()
  return (
    db.rides.find(
      (r) => r.passengerId === passengerProfileId && isRideActive(r.status)
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
    .filter((r) => r.passengerId === passengerProfileId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function purgePassengerHistory(
  accountId: string,
  passengerProfileId: string
): Promise<{ ok: true }> {
  await delay(180)
  const db = getDb()
  const rideIds = new Set(
    db.rides.filter((r) => r.passengerId === passengerProfileId).map((r) => r.id)
  )
  db.rides = db.rides.filter((r) => r.passengerId !== passengerProfileId)
  db.rideRequests = db.rideRequests.filter((r) => r.passengerId !== passengerProfileId)
  db.ratings = db.ratings.filter((r) => !rideIds.has(r.rideId))
  db.complaints = db.complaints.filter((c) => !rideIds.has(c.rideId))
  db.notifications = db.notifications.filter(
    (n) => !(n.accountId === accountId && n.type === 'ride')
  )
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'system',
    description: 'Historija voznji trajno obrisana iz aplikacije',
    createdAt: new Date().toISOString(),
  })
  persist()
  const n0 = strings().notifications
  await addNotification(accountId, n0.inboxRide, n0.historyCleared, 'ride')
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
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'ride',
    description: `Voznja obrisana iz historije ${rideId}`,
    createdAt: new Date().toISOString(),
  })
  persist()
  const n1 = strings().notifications
  await addNotification(accountId, n1.inboxRide, n1.historyRideDeleted, 'ride')
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
  const n = strings().notifications
  await addNotification(input.accountId, n.inboxRide, n.rideCreated, 'ride')
  return { ok: true, request: req }
}

export async function assignDriver(
  requestId: string,
  accountId: string,
  options?: { forceNoDrivers?: boolean }
): Promise<{ ok: true; ride: Ride } | { error: 'no_drivers' | 'not_found' }> {
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
    const n = strings().notifications
    await addNotification(accountId, n.inboxRide, n.noDrivers, 'ride')
    return { error: 'no_drivers' }
  }
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request) return { error: 'not_found' }
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
    const n2 = strings().notifications
    await addNotification(accountId, n2.inboxRide, n2.noDrivers, 'ride')
    return { error: 'no_drivers' }
  }

  const best = candidates[0]!
  best.driver.availabilityStatus = 'zauzet'
  request.status = 'dodijeljen'
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
  const n3 = strings().notifications
  await addNotification(accountId, n3.inboxDriver, n3.driverAssigned, 'ride')
  await addNotification(accountId, n3.inboxDriver, n3.driverWay, 'ride')
  return { ok: true, ride }
}

export async function cancelRideRequest(
  requestId: string,
  accountId: string
): Promise<{ ok: true } | { error: 'not_found' }> {
  await delay(120)
  const db = getDb()
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request) return { error: 'not_found' }
  request.status = 'otkazan'
  db.activityLogs.unshift({
    id: uid('log'),
    accountId,
    type: 'ride',
    description: `Zahtjev otkazan ${requestId}`,
    createdAt: new Date().toISOString(),
  })
  persist()
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

  ride.status = status
  const now = new Date().toISOString()
  if (status === 'stigao') {
    ride.driverArrivedAt = now
    const n4 = strings().notifications
    await addNotification(accountId, n4.inboxDriver, strings().ride.driverArrived, 'ride')
  }
  if (status === 'u_toku') {
    ride.startedAt = now
    const n5 = strings().notifications
    await addNotification(accountId, n5.inboxRide, n5.rideStarted, 'ride')
  }
  if (status === 'zavrsena') {
    ride.finishedAt = now
    ride.finalPrice = ride.estimatedPrice
    const driver = db.drivers.find((d) => d.id === ride.driverId)
    if (driver) {
      driver.availabilityStatus = 'dostupan'
    }
    const n6 = strings().notifications
    await addNotification(accountId, n6.inboxRide, n6.rideDone, 'ride')
  }
  if (status === 'otkazana') {
    ride.cancelledAt = now
    ride.cancellationReason = extras?.cancellationReason ?? 'Otkazano'
    const driver = db.drivers.find((d) => d.id === ride.driverId)
    if (driver) driver.availabilityStatus = 'dostupan'
    const req = db.rideRequests.find((r) => r.id === ride.requestId)
    if (req) req.status = 'otkazan'
    const n7 = strings().notifications
    await addNotification(accountId, n7.inboxRide, n7.rideCancelled, 'ride')
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
  const n8 = strings().notifications
  await addNotification(accountId, n8.inboxRating, n8.thanksRating, 'rating')
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
