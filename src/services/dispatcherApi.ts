import { strings } from '../i18n/strings'
import { MOCK_LOCATIONS, simpleRoute } from '../data/seed'
import { haversineKm } from '../utils/distance'
import type {
  Complaint,
  ComplaintStatus,
  DispatchLog,
  DispatchLogKind,
  DispatcherProfile,
  DispatcherRoleLevel,
  Driver,
  DriverAvailability,
  Location,
  OrderType,
  Ride,
  RideRequest,
  RideStatus,
  UserAccount,
  Vehicle,
} from '../types/domain'
import { delay } from './delay'
import { calculateRoute } from './locationApi'
import { getDb, persist } from './mockDb'
import { complaintStatusLabel } from '../lib/passengerStatusLabels'
import { appendNotification } from './notificationApi'
import { syncAllLinkedFleetDriversFromUi, syncFleetDriverToLinkedUi } from './driverFleetSync'

export const DISPATCH_UPDATED_EVENT = 'urbanflow:dispatch-updated'

export type DispatchPermission =
  | 'view_reports'
  | 'force_driver_status'
  | 'cancel_or_resolve_ride'
  | 'role_admin'

export interface DispatchDriverRow {
  driver: Driver
  vehicle: Vehicle | null
  activeRide: Ride | null
  lastGpsAt: string
  zoneLabel: string
  statusLabel: string
  warning?: string
}

export interface DispatchRideRow {
  id: string
  request: RideRequest
  ride: Ride | null
  passengerName: string
  passengerPhone: string
  driverName?: string
  vehicleLabel?: string
  status: RideStatus | RideRequest['status']
  statusLabel: string
  pickupLabel: string
  destinationLabel: string
  createdAt: string
  scheduledAt?: string
  estimatedPrice: number
  distanceKm: number
}

export interface DispatchAnomaly {
  id: string
  type: 'driver_rejected' | 'no_response' | 'stale_gps' | 'failed_assignment' | 'problem_ride' | 'complaint'
  severity: 'warning' | 'danger'
  title: string
  body: string
  createdAt: string
  rideId?: string
  requestId?: string
  driverId?: string
  complaintId?: string
  acknowledged: boolean
}

export interface DispatchKpis {
  activeRides: number
  availableDrivers: number
  problemItems: number
  openComplaints: number
  todayRevenueBam: number
  failedRides: number
}

export interface DispatchSnapshot {
  dispatcher: DispatcherProfile
  roleLevel: DispatcherRoleLevel
  generatedAt: string
  drivers: DispatchDriverRow[]
  rides: DispatchRideRow[]
  complaints: Complaint[]
  anomalies: DispatchAnomaly[]
  logs: DispatchLog[]
  kpis: DispatchKpis
}

export interface ManualRideInput {
  dispatcherAccountId: string
  passengerName: string
  passengerPhone: string
  pickup: Location
  destination: Location
  orderType: OrderType
  scheduledAt?: string
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function dispatchUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISPATCH_UPDATED_EVENT))
  }
}

function profileFor(accountId: string): DispatcherProfile | null {
  return getDb().dispatcherProfiles.find((p) => p.accountId === accountId) ?? null
}

function roleRank(role: DispatcherRoleLevel): number {
  if (role === 'sef_smjene') return 3
  if (role === 'senior_dispecer') return 2
  return 1
}

function hasPermission(role: DispatcherRoleLevel, permission: DispatchPermission): boolean {
  if (permission === 'view_reports') return roleRank(role) >= 3
  if (permission === 'role_admin') return roleRank(role) >= 3
  return roleRank(role) >= 2
}

export function dispatcherRoleLabel(role: DispatcherRoleLevel): string {
  return strings().dispatcher.roles[role]
}

export function dispatcherCan(role: DispatcherRoleLevel, permission: DispatchPermission): boolean {
  return hasPermission(role, permission)
}

function passengerDisplay(passengerId: string): { name: string; phone: string; accountId?: string } {
  const db = getDb()
  const profile = db.profiles.find((p) => p.id === passengerId)
  if (!profile) return { name: 'Nepoznat putnik', phone: 'N/A' }
  const account = db.users.find((u) => u.id === profile.accountId)
  return {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    phone: account?.phone ?? 'N/A',
    accountId: account?.id,
  }
}

function driverDisplay(driverId: string): string | undefined {
  const driver = getDb().drivers.find((d) => d.id === driverId)
  return driver ? `${driver.firstName} ${driver.lastName}` : undefined
}

function vehicleDisplay(vehicleId: string): string | undefined {
  const vehicle = getDb().vehicles.find((v) => v.id === vehicleId)
  return vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}` : undefined
}

export function dispatchDriverStatusLabel(status: DriverAvailability): string {
  const labels: Record<DriverAvailability, string> = {
    dostupan: 'Dostupan',
    zauzet: 'Zauzet',
    na_pauzi: 'Na pauzi',
    van_smjene: 'Van smjene',
    van_funkcije: 'Van funkcije',
  }
  return labels[status]
}

const AWAITING_ASSIGNMENT_REQUEST_STATUSES: RideRequest['status'][] = ['kreiran', 'u_obradi']

const REASSIGNABLE_RIDE_STATUSES: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'problematicna']

export function isDispatchRideAwaitingAssignment(
  row: Pick<DispatchRideRow, 'ride' | 'request'>
): boolean {
  if (row.ride) return false
  return AWAITING_ASSIGNMENT_REQUEST_STATUSES.includes(row.request.status)
}

export function canReassignDispatchRide(ride: Ride | null | undefined): boolean {
  if (!ride) return false
  return REASSIGNABLE_RIDE_STATUSES.includes(ride.status)
}

export function dispatchRideStatusLabel(status: RideStatus | RideRequest['status']): string {
  const labels: Record<RideStatus | RideRequest['status'], string> = {
    kreiran: 'Kreiran',
    u_obradi: 'U obradi',
    dodijeljen: 'Dodijeljen',
    prihvacen: 'Prihvaćen',
    dodijeljena: 'Dodijeljena',
    vozac_na_putu: 'Vozač na putu',
    stigao: 'Stigao',
    u_toku: 'U toku',
    zavrsena: 'Završena',
    otkazana: 'Otkazana',
    otkazan: 'Otkazan',
    neuspjesna: 'Neuspješna',
    neuspjesan: 'Neuspješan',
    problematicna: 'Problematična',
  }
  return labels[status]
}

function pushDispatchLog(input: {
  dispatcherAccountId?: string
  kind: DispatchLogKind
  message: string
  rideId?: string
  requestId?: string
  driverId?: string
  complaintId?: string
  meta?: DispatchLog['meta']
}): DispatchLog {
  const db = getDb()
  const log: DispatchLog = {
    id: uid('dsp-log'),
    createdAt: new Date().toISOString(),
    ...input,
  }
  db.dispatchLogs.unshift(log)
  if (db.dispatchLogs.length > 500) db.dispatchLogs.length = 500
  persist()
  dispatchUpdated()
  return log
}

async function deny(dispatcherAccountId: string, permission: DispatchPermission): Promise<{ error: 'forbidden' }> {
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'rbac',
    message: `Odbijen pokušaj akcije izvan ovlasti: ${permission}`,
  })
  await appendNotification({
    accountId: dispatcherAccountId,
    type: 'DISPATCH_RBAC_DENIED',
    title: 'Akcija odbijena',
    body: 'Nemate ovlasti za ovu dispečersku akciju.',
    targetApp: 'dispatcher',
    showBanner: false,
  })
  return { error: 'forbidden' }
}

async function requirePermission(
  dispatcherAccountId: string,
  permission: DispatchPermission
): Promise<true | { error: 'forbidden' | 'not_dispatcher' }> {
  const profile = profileFor(dispatcherAccountId)
  if (!profile) return { error: 'not_dispatcher' }
  if (!hasPermission(profile.roleLevel, permission)) return deny(dispatcherAccountId, permission)
  return true
}

function buildRideRows(): DispatchRideRow[] {
  const db = getDb()
  return db.rideRequests
    .map((request) => {
      const ride = request.rideId ? db.rides.find((r) => r.id === request.rideId) ?? null : null
      const passenger = passengerDisplay(request.passengerId)
      const status = ride?.status ?? request.status
      return {
        id: ride?.id ?? request.id,
        request,
        ride,
        passengerName: passenger.name,
        passengerPhone: passenger.phone,
        driverName: ride ? driverDisplay(ride.driverId) : undefined,
        vehicleLabel: ride ? vehicleDisplay(ride.vehicleId) : undefined,
        status,
        statusLabel: dispatchRideStatusLabel(status),
        pickupLabel: request.pickup.label,
        destinationLabel: request.destination.label,
        createdAt: request.createdAt,
        scheduledAt: request.scheduledAt,
        estimatedPrice: ride?.estimatedPrice ?? request.estimatedPrice,
        distanceKm: ride?.distanceKm ?? request.distanceKm,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function activeRideForDriver(driverId: string): Ride | null {
  const active: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna']
  return getDb().rides.find((ride) => ride.driverId === driverId && active.includes(ride.status)) ?? null
}

const SHIFT_GPS_STATUSES: DriverAvailability[] = ['dostupan', 'zauzet', 'na_pauzi']
const GPS_STALE_MS = 1000 * 60 * 10

function buildDriverRows(): DispatchDriverRow[] {
  const db = getDb()
  const now = Date.now()
  return db.drivers.map((driver) => {
    const vehicle = db.vehicles.find((v) => v.id === driver.vehicleId) ?? null
    const activeRide = activeRideForDriver(driver.id)
    const linked = db.driverProfiles.find((p) => p.linkedDriverId === driver.id)
    const ui = linked ? db.driverUiByAccountId[linked.accountId] : undefined
    const gpsFromApp = ui?.settings.lastGpsReadAt
    const onShift = SHIFT_GPS_STATUSES.includes(driver.availabilityStatus)
    const lastGpsAt =
      gpsFromApp ?? (onShift ? new Date(now).toISOString() : new Date(now - GPS_STALE_MS - 60_000).toISOString())
    const gpsStale = gpsFromApp != null && now - new Date(gpsFromApp).getTime() > GPS_STALE_MS
    const warning =
      driver.availabilityStatus === 'van_funkcije'
        ? 'Vozilo/vozač van funkcije'
        : onShift && gpsStale
          ? 'GPS nije osvježen duže od 10 min'
          : undefined
    return {
      driver,
      vehicle,
      activeRide,
      lastGpsAt,
      zoneLabel: driver.currentLocation.lat > 43.86 ? 'Centar / Stari Grad' : 'Novo Sarajevo / Ilidža',
      statusLabel: dispatchDriverStatusLabel(driver.availabilityStatus),
      warning,
    }
  })
}

function buildAnomalies(rows: DispatchRideRow[], drivers: DispatchDriverRow[], complaints: Complaint[]): DispatchAnomaly[] {
  const db = getDb()
  const acknowledged = new Set(db.dispatchAcknowledgedAnomalyIds)
  const now = Date.now()
  const anomalies: DispatchAnomaly[] = []

  for (const row of rows) {
    if (row.status === 'problematicna' || row.status === 'neuspjesna' || row.status === 'neuspjesan') {
      anomalies.push({
        id: `ride-${row.id}-${row.status}`,
        type: row.status === 'problematicna' ? 'problem_ride' : 'failed_assignment',
        severity: 'danger',
        title: row.status === 'problematicna' ? 'Problematična vožnja' : 'Neuspješna dodjela',
        body: `${row.pickupLabel} → ${row.destinationLabel} · ${row.passengerName}`,
        createdAt: row.ride?.cancelledAt ?? row.ride?.createdAt ?? row.request.createdAt,
        rideId: row.ride?.id,
        requestId: row.request.id,
        acknowledged: acknowledged.has(`ride-${row.id}-${row.status}`),
      })
    }
    if (!row.ride && row.request.status === 'kreiran' && now - new Date(row.request.createdAt).getTime() > 1000 * 60 * 8) {
      anomalies.push({
        id: `request-${row.request.id}-no-response`,
        type: 'no_response',
        severity: 'warning',
        title: 'Zahtjev čeka dodjelu',
        body: `${row.pickupLabel} → ${row.destinationLabel} je bez vozača duže od 8 min`,
        createdAt: row.request.createdAt,
        requestId: row.request.id,
        acknowledged: acknowledged.has(`request-${row.request.id}-no-response`),
      })
    }
  }

  for (const driver of drivers) {
    if (driver.warning) {
      anomalies.push({
        id: `driver-${driver.driver.id}-${driver.driver.availabilityStatus}`,
        type: driver.driver.availabilityStatus === 'van_funkcije' ? 'problem_ride' : 'stale_gps',
        severity: driver.driver.availabilityStatus === 'van_funkcije' ? 'danger' : 'warning',
        title: driver.driver.availabilityStatus === 'van_funkcije' ? 'Vozač van funkcije' : 'Stari GPS signal',
        body: `${driver.driver.firstName} ${driver.driver.lastName} · ${driver.warning}`,
        createdAt: driver.lastGpsAt,
        driverId: driver.driver.id,
        acknowledged: acknowledged.has(`driver-${driver.driver.id}-${driver.driver.availabilityStatus}`),
      })
    }
  }

  for (const complaint of complaints.filter((c) => c.status === 'zaprimljena' || c.status === 'u_obradi')) {
    anomalies.push({
      id: `complaint-${complaint.id}`,
      type: 'complaint',
      severity: complaint.status === 'zaprimljena' ? 'warning' : 'danger',
      title: complaint.status === 'zaprimljena' ? 'Nova reklamacija' : 'Reklamacija u obradi',
      body: `${complaint.category} · ${complaint.description.slice(0, 80)}`,
      createdAt: complaint.createdAt,
      rideId: complaint.rideId,
      complaintId: complaint.id,
      acknowledged: acknowledged.has(`complaint-${complaint.id}`),
    })
  }

  return anomalies.sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged) || b.createdAt.localeCompare(a.createdAt))
}

export async function getDispatchSnapshot(dispatcherAccountId: string): Promise<DispatchSnapshot> {
  await delay(16)
  if (syncAllLinkedFleetDriversFromUi()) persist()
  const dispatcher = profileFor(dispatcherAccountId)
  if (!dispatcher) throw new Error('not_dispatcher')
  const db = getDb()
  const drivers = buildDriverRows()
  const rides = buildRideRows()
  const complaints = [...db.complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const anomalies = buildAnomalies(rides, drivers, complaints)
  const activeStatuses: Array<RideStatus | RideRequest['status']> = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku']
  const kpis: DispatchKpis = {
    activeRides: rides.filter((r) => activeStatuses.includes(r.status)).length,
    availableDrivers: drivers.filter((d) => d.driver.availabilityStatus === 'dostupan').length,
    problemItems: anomalies.filter((a) => !a.acknowledged).length,
    openComplaints: complaints.filter((c) => c.status === 'zaprimljena' || c.status === 'u_obradi').length,
    todayRevenueBam: rides
      .filter((r) => r.ride?.status === 'zavrsena')
      .reduce((sum, row) => sum + (row.ride?.finalPrice ?? row.ride?.estimatedPrice ?? 0), 0),
    failedRides: rides.filter((r) => r.status === 'neuspjesna' || r.status === 'neuspjesan').length,
  }
  return {
    dispatcher,
    roleLevel: dispatcher.roleLevel,
    generatedAt: new Date().toISOString(),
    drivers,
    rides,
    complaints,
    anomalies,
    logs: [...db.dispatchLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    kpis,
  }
}

export async function appendDispatchLog(input: {
  dispatcherAccountId?: string
  kind: DispatchLogKind
  message: string
  rideId?: string
  requestId?: string
  driverId?: string
  complaintId?: string
  meta?: DispatchLog['meta']
}): Promise<DispatchLog> {
  await delay(60)
  return pushDispatchLog(input)
}

function createPhonePassenger(name: string, phone: string): { account: UserAccount; profileId: string } {
  const db = getDb()
  const existingAccount = db.users.find((u) => u.phone.replace(/\s/g, '') === phone.replace(/\s/g, ''))
  if (existingAccount) {
    const profile = db.profiles.find((p) => p.accountId === existingAccount.id)
    if (profile) return { account: existingAccount, profileId: profile.id }
  }
  const [firstNameRaw, ...rest] = name.trim().split(/\s+/)
  const firstName = firstNameRaw || 'Telefon'
  const lastName = rest.join(' ') || 'Poziv'
  const account: UserAccount = {
    id: uid('acc-phone'),
    role: 'putnik',
    email: `telefon.${Date.now()}@urbanflow.ba`,
    phone,
    passwordPlain: '',
    status: 'aktivan',
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  }
  const profileId = uid('prof-phone')
  db.users.push(account)
  db.profiles.push({
    id: profileId,
    accountId: account.id,
    firstName,
    lastName,
    registeredAt: account.createdAt,
  })
  return { account, profileId }
}

export async function createManualRideRequest(
  input: ManualRideInput
): Promise<{ ok: true; request: RideRequest } | { error: string }> {
  await delay(160)
  const db = getDb()
  const dispatcher = profileFor(input.dispatcherAccountId)
  if (!dispatcher) return { error: 'not_dispatcher' }
  if (haversineKm(input.pickup, input.destination) < 0.05) return { error: 'same_location' }
  const route = await calculateRoute(input.pickup, input.destination)
  if ('error' in route) return { error: route.error }
  const passenger = createPhonePassenger(input.passengerName, input.passengerPhone)
  const request: RideRequest = {
    id: uid('req-phone'),
    passengerId: passenger.profileId,
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
  db.rideRequests.push(request)
  pushDispatchLog({
    dispatcherAccountId: input.dispatcherAccountId,
    kind: 'ride',
    message: `Ručno kreiran zahtjev za vožnju (${input.passengerName}).`,
    requestId: request.id,
    meta: { pickup: input.pickup.label, destination: input.destination.label, role: dispatcher.roleLevel },
  })
  persist()
  dispatchUpdated()
  return { ok: true, request }
}

export async function suggestDriversForRequest(requestId: string): Promise<DispatchDriverRow[]> {
  await delay(80)
  const db = getDb()
  const request = db.rideRequests.find((r) => r.id === requestId)
  if (!request) return []
  return buildDriverRows()
    .filter((row) => row.driver.availabilityStatus === 'dostupan' && row.vehicle?.status === 'dostupno')
    .sort((a, b) => haversineKm(a.driver.currentLocation, request.pickup) - haversineKm(b.driver.currentLocation, request.pickup))
}

export async function assignRideToDriver(
  dispatcherAccountId: string,
  requestId: string,
  driverId: string,
  options?: { allowReassign?: boolean }
): Promise<{ ok: true; ride: Ride } | { error: string }> {
  await delay(180)
  const db = getDb()
  if (!profileFor(dispatcherAccountId)) return { error: 'not_dispatcher' }
  const request = db.rideRequests.find((r) => r.id === requestId)
  const driver = db.drivers.find((d) => d.id === driverId)
  if (!request || !driver) return { error: 'not_found' }
  const vehicle = db.vehicles.find((v) => v.id === driver.vehicleId)
  if (!vehicle || vehicle.status !== 'dostupno') return { error: 'vehicle_unavailable' }
  if (driver.availabilityStatus !== 'dostupan' && !request.rideId) return { error: 'driver_unavailable' }
  const route = await calculateRoute(request.pickup, request.destination)
  if ('error' in route) return { error: route.error }

  let ride = request.rideId ? db.rides.find((r) => r.id === request.rideId) : undefined
  if (ride?.driverId && !options?.allowReassign) return { error: 'already_assigned' }
  const previousDriverId = ride?.driverId
  const isReassign = Boolean(ride && previousDriverId && previousDriverId !== driver.id)
  if (ride) {
    const oldDriver = db.drivers.find((d) => d.id === ride!.driverId)
    if (oldDriver && oldDriver.id !== driver.id) oldDriver.availabilityStatus = 'dostupan'
    ride.driverId = driver.id
    ride.vehicleId = vehicle.id
    ride.status = 'dodijeljena'
    ride.assignedAt = new Date().toISOString()
    ride.driverLat = driver.currentLocation.lat
    ride.driverLng = driver.currentLocation.lng
  } else {
    ride = {
      id: uid('ride-dsp'),
      requestId: request.id,
      passengerId: request.passengerId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      status: 'dodijeljena',
      pickup: request.pickup,
      destination: request.destination,
      routePoints: route.routePoints.length > 1 ? route.routePoints : simpleRoute(request.pickup, request.destination),
      estimatedPrice: route.estimatedPrice,
      distanceKm: route.distanceKm,
      estimatedDurationMin: route.durationMin,
      paymentMethod: 'gotovina',
      orderType: request.orderType,
      scheduledAt: request.scheduledAt,
      createdAt: new Date().toISOString(),
      assignedAt: new Date().toISOString(),
      driverLat: driver.currentLocation.lat,
      driverLng: driver.currentLocation.lng,
    }
    db.rides.push(ride)
    request.rideId = ride.id
  }
  request.status = 'dodijeljen'
  driver.availabilityStatus = 'zauzet'
  vehicle.status = 'nedostupno'
  if (previousDriverId && previousDriverId !== driver.id) {
    const prev = db.drivers.find((d) => d.id === previousDriverId)
    if (prev) {
      const prevVehicle = db.vehicles.find((v) => v.id === prev.vehicleId)
      const prevActive = db.rides.some(
        (r) =>
          r.driverId === previousDriverId &&
          ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna'].includes(r.status),
      )
      if (!prevActive) {
        prev.availabilityStatus = 'dostupan'
        if (prevVehicle && prevVehicle.status !== 'dostupno') prevVehicle.status = 'dostupno'
      }
    }
    syncFleetDriverToLinkedUi(previousDriverId)
  }
  syncFleetDriverToLinkedUi(driver.id)
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'ride',
    message: isReassign
      ? `Preraspodjela vožnje na vozača ${driver.firstName} ${driver.lastName}.`
      : `Vožnja dodijeljena vozaču ${driver.firstName} ${driver.lastName}.`,
    requestId,
    rideId: ride.id,
    driverId: driver.id,
    meta: isReassign
      ? { action: 'reassign', previousDriverId, newDriverId: driver.id }
      : undefined,
  })
  persist()
  dispatchUpdated()
  return { ok: true, ride }
}

export async function reassignRide(
  dispatcherAccountId: string,
  rideId: string,
  driverId: string
): Promise<{ ok: true; ride: Ride } | { error: string }> {
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  return assignRideToDriver(dispatcherAccountId, ride.requestId, driverId, { allowReassign: true })
}

export async function forceDriverStatus(
  dispatcherAccountId: string,
  driverId: string,
  status: DriverAvailability
): Promise<{ ok: true } | { error: string }> {
  const allowed = await requirePermission(dispatcherAccountId, 'force_driver_status')
  if (allowed !== true) return allowed
  await delay(120)
  const db = getDb()
  const driver = db.drivers.find((d) => d.id === driverId)
  if (!driver) return { error: 'not_found' }
  driver.availabilityStatus = status
  const linkedVehicle = db.vehicles.find((v) => v.id === driver.vehicleId)
  if (linkedVehicle) {
    if (status === 'van_funkcije' || status === 'zauzet') linkedVehicle.status = 'nedostupno'
    else if (status === 'dostupan') linkedVehicle.status = 'dostupno'
    else if (status === 'van_smjene' || status === 'na_pauzi') linkedVehicle.status = 'u_servisu'
  }
  syncFleetDriverToLinkedUi(driver.id)
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'driver',
    message: `Prisilno promijenjen status vozača ${driver.firstName} ${driver.lastName}: ${dispatchDriverStatusLabel(status)}.`,
    driverId,
  })
  persist()
  dispatchUpdated()
  return { ok: true }
}

export async function updateComplaintStatus(
  dispatcherAccountId: string,
  complaintId: string,
  status: ComplaintStatus,
  outcome?: string
): Promise<{ ok: true; complaint: Complaint } | { error: string }> {
  await delay(120)
  const db = getDb()
  if (!profileFor(dispatcherAccountId)) return { error: 'not_dispatcher' }
  const complaint = db.complaints.find((c) => c.id === complaintId)
  if (!complaint) return { error: 'not_found' }
  complaint.status = status
  complaint.outcome = outcome?.trim() || complaint.outcome
  if (status === 'rijesena' || status === 'odbijena') complaint.resolvedAt = new Date().toISOString()
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'complaint',
    message: `Status reklamacije promijenjen: ${status}.`,
    rideId: complaint.rideId,
    complaintId,
  })
  persist()
  const t = strings()
  const statusText = complaintStatusLabel(status, t.history.complaintStatuses)
  await appendNotification({
    accountId: complaint.submittedByAccountId,
    type: 'SYSTEM_MESSAGE',
    title: 'Reklamacija ažurirana',
    body: outcome?.trim() || t.history.complaintStatusNotify.replace('{status}', statusText),
    rideId: complaint.rideId,
    targetApp: 'passenger',
    showBanner: false,
  })
  dispatchUpdated()
  return { ok: true, complaint }
}

export async function cancelRideByDispatcher(
  dispatcherAccountId: string,
  rideId: string,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  const allowed = await requirePermission(dispatcherAccountId, 'cancel_or_resolve_ride')
  if (allowed !== true) return allowed
  await delay(120)
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  ride.status = 'otkazana'
  ride.cancelledAt = new Date().toISOString()
  ride.cancellationReason = reason.trim() || 'Otkazao dispečer'
  const request = db.rideRequests.find((r) => r.id === ride.requestId)
  if (request) request.status = 'otkazan'
  const driver = db.drivers.find((d) => d.id === ride.driverId)
  if (driver) driver.availabilityStatus = 'dostupan'
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'ride',
    message: `Vožnja otkazana iz dispečerskog panela: ${ride.cancellationReason}`,
    rideId,
    requestId: ride.requestId,
    driverId: ride.driverId,
  })
  persist()
  dispatchUpdated()
  return { ok: true }
}

export async function markRideProblematic(
  dispatcherAccountId: string,
  rideId: string,
  note: string
): Promise<{ ok: true } | { error: string }> {
  const allowed = await requirePermission(dispatcherAccountId, 'cancel_or_resolve_ride')
  if (allowed !== true) return allowed
  await delay(120)
  const db = getDb()
  const ride = db.rides.find((r) => r.id === rideId)
  if (!ride) return { error: 'not_found' }
  ride.status = 'problematicna'
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'anomaly',
    message: `Vožnja označena kao problematična: ${note.trim() || 'bez napomene'}`,
    rideId,
    requestId: ride.requestId,
    driverId: ride.driverId,
  })
  persist()
  dispatchUpdated()
  return { ok: true }
}

export async function acknowledgeAnomaly(
  dispatcherAccountId: string,
  anomalyId: string
): Promise<{ ok: true } | { error: string }> {
  await delay(80)
  if (!profileFor(dispatcherAccountId)) return { error: 'not_dispatcher' }
  const db = getDb()
  if (!db.dispatchAcknowledgedAnomalyIds.includes(anomalyId)) {
    db.dispatchAcknowledgedAnomalyIds.push(anomalyId)
  }
  pushDispatchLog({
    dispatcherAccountId,
    kind: 'anomaly',
    message: `Anomalija potvrđena: ${anomalyId}`,
    meta: { anomalyId },
  })
  persist()
  dispatchUpdated()
  return { ok: true }
}

export function getDispatchLocations(): Location[] {
  return MOCK_LOCATIONS.map((location) => ({ ...location }))
}
