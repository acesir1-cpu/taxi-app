import { DISPATCH_UPDATED_EVENT } from './dispatcherApi'
import { getDb, persist } from './mockDb'
import type {
  DriverActiveRide,
  DriverAvailability,
  DriverRideFlowStatus,
  DriverUiState,
  DriverVehicleUiStatus,
  Ride,
  RideStatus,
  VehicleStatus,
} from '../types/domain'

const ACTIVE_FLEET_RIDE_STATUSES: RideStatus[] = ['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna']

const FLOW_TO_RIDE_STATUS: Partial<Record<DriverRideFlowStatus, RideStatus>> = {
  prihvacena: 'dodijeljena',
  vozac_na_putu: 'vozac_na_putu',
  stigao: 'stigao',
  u_toku: 'u_toku',
  zavrsena: 'zavrsena',
  otkazana: 'otkazana',
  problem: 'problematicna',
}

export function notifyFleetAndDispatchSync(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(DISPATCH_UPDATED_EVENT))
}

function vehicleUiToFleet(status: DriverVehicleUiStatus, availability: DriverAvailability): VehicleStatus {
  if (status === 'van_funkcije' || availability === 'van_funkcije') return 'nedostupno'
  if (status === 'zauzeto' || availability === 'zauzet') return 'nedostupno'
  if (status === 'neaktivno' || availability === 'van_smjene') return 'u_servisu'
  return 'dostupno'
}

function fleetVehicleToUi(fleetStatus: VehicleStatus, availability: DriverAvailability): DriverVehicleUiStatus {
  if (availability === 'van_funkcije') return 'van_funkcije'
  if (availability === 'zauzet') return 'zauzeto'
  if (fleetStatus === 'nedostupno' && availability === 'dostupan') return 'dostupno'
  if (fleetStatus === 'u_servisu' || fleetStatus === 'nedostupno') return 'neaktivno'
  return 'dostupno'
}

function applyRidePatchToFleetRide(ride: Ride, active: DriverActiveRide): boolean {
  let changed = false
  const mapped = FLOW_TO_RIDE_STATUS[active.flowStatus]
  if (mapped && ride.status !== mapped) {
    ride.status = mapped
    changed = true
  }
  if (active.driverLat != null && active.driverLng != null) {
    if (ride.driverLat !== active.driverLat || ride.driverLng !== active.driverLng) {
      ride.driverLat = active.driverLat
      ride.driverLng = active.driverLng
      changed = true
    }
  }
  if (active.routePoints.length > 1 && ride.routePoints !== active.routePoints) {
    ride.routePoints = active.routePoints
    changed = true
  }
  return changed
}

function upsertFleetRideFromDriverUi(linkedDriverId: string, ui: DriverUiState): boolean {
  const active = ui.activeRide
  if (!active) return false
  const db = getDb()
  const driver = db.drivers.find((d) => d.id === linkedDriverId)
  if (!driver) return false

  let ride =
    db.rides.find((r) => r.id === active.id) ??
    db.rides.find(
      (r) =>
        r.driverId === linkedDriverId &&
        r.requestId === active.requestId &&
        ACTIVE_FLEET_RIDE_STATUSES.includes(r.status),
    )

  const rideStatus = FLOW_TO_RIDE_STATUS[active.flowStatus]
  if (!rideStatus) return false

  if (!ride) {
    ride = {
      id: active.id,
      requestId: active.requestId,
      passengerId: db.rideRequests.find((r) => r.id === active.requestId)?.passengerId ?? 'unknown-passenger',
      driverId: linkedDriverId,
      vehicleId: driver.vehicleId,
      status: rideStatus,
      pickup: active.pickup,
      destination: active.destination,
      routePoints: active.routePoints,
      estimatedPrice: active.estimatedPrice,
      distanceKm: active.routeDistanceKm,
      estimatedDurationMin: active.estimatedDurationMin,
      paymentMethod: active.paymentMethod,
      orderType: active.type,
      createdAt: active.createdAt,
      assignedAt: active.acceptedAt ?? active.createdAt,
      driverLat: active.driverLat,
      driverLng: active.driverLng,
    }
    db.rides.push(ride)
    const req = db.rideRequests.find((r) => r.id === active.requestId)
    if (req) {
      req.rideId = ride.id
      req.status = 'dodijeljen'
    }
    return true
  }

  return applyRidePatchToFleetRide(ride, active)
}

/** Vozački UI → zapis u floti (drivers/vehicles/rides) koji vidi dispečer. */
export function syncLinkedFleetDriverFromUi(accountId: string): boolean {
  const db = getDb()
  const profile = db.driverProfiles.find((p) => p.accountId === accountId)
  if (!profile) return false
  const ui = db.driverUiByAccountId[accountId]
  if (!ui) return false
  const driver = db.drivers.find((d) => d.id === profile.linkedDriverId)
  if (!driver) return false

  let changed = false

  if (driver.availabilityStatus !== ui.availabilityStatus) {
    driver.availabilityStatus = ui.availabilityStatus
    changed = true
  }

  const vehicle = db.vehicles.find((v) => v.id === driver.vehicleId)
  if (vehicle) {
    const fleetVehicleStatus = vehicleUiToFleet(ui.vehicleUi.status, ui.availabilityStatus)
    if (vehicle.status !== fleetVehicleStatus) {
      vehicle.status = fleetVehicleStatus
      changed = true
    }
  }

  const active = ui.activeRide
  if (active?.driverLat != null && active.driverLng != null) {
    if (driver.currentLocation.lat !== active.driverLat || driver.currentLocation.lng !== active.driverLng) {
      driver.currentLocation = { lat: active.driverLat, lng: active.driverLng }
      changed = true
    }
  }

  if (active) {
    changed = upsertFleetRideFromDriverUi(profile.linkedDriverId, ui) || changed
  }

  return changed
}

/** Flota → vozački UI (npr. dispečerska dodjela ili prisilna promjena statusa). */
export function syncFleetDriverToLinkedUi(driverId: string): boolean {
  const db = getDb()
  const driver = db.drivers.find((d) => d.id === driverId)
  const profile = db.driverProfiles.find((p) => p.linkedDriverId === driverId)
  if (!driver || !profile) return false
  const ui = db.driverUiByAccountId[profile.accountId]
  if (!ui) return false

  let changed = false

  if (ui.availabilityStatus !== driver.availabilityStatus) {
    ui.availabilityStatus = driver.availabilityStatus
    changed = true
  }

  const vehicle = db.vehicles.find((v) => v.id === driver.vehicleId)
  if (vehicle) {
    const uiVehicleStatus = fleetVehicleToUi(vehicle.status, driver.availabilityStatus)
    if (ui.vehicleUi.status !== uiVehicleStatus) {
      ui.vehicleUi.status = uiVehicleStatus
      changed = true
    }
  }

  if (driver.availabilityStatus === 'zauzet') {
    const fleetRide = db.rides.find(
      (r) => r.driverId === driverId && ACTIVE_FLEET_RIDE_STATUSES.includes(r.status),
    )
    if (fleetRide && !ui.activeRide) {
      ui.pendingRequest = null
      changed = true
    }
  }

  if (driver.availabilityStatus === 'dostupan' && !ui.activeRide) {
    if (ui.vehicleUi.status === 'zauzeto') {
      ui.vehicleUi.status = 'dostupno'
      changed = true
    }
  }

  return changed
}

export function syncAllLinkedFleetDriversFromUi(): boolean {
  const db = getDb()
  let changed = false
  for (const profile of db.driverProfiles) {
    if (syncLinkedFleetDriverFromUi(profile.accountId)) changed = true
  }
  return changed
}

export function commitDriverUi(accountId: string): void {
  syncLinkedFleetDriverFromUi(accountId)
  persist()
  notifyFleetAndDispatchSync()
}
