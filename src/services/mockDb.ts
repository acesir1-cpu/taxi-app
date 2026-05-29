import { createFreshSeed, ensureDispatchData, ensureDriverData } from '../data/seed'
import { syncAllLinkedFleetDriversFromUi } from './driverFleetSync'
import type { DriverAvailability, MockDatabase, RideRequestStatus, RideStatus, VehicleStatus } from '../types/domain'
import { loadRaw, saveRaw } from '../utils/storage'

let memory: MockDatabase | null = null

const DRIVER_STATUS_MAP: Record<string, DriverAvailability> = {
  dostupan: 'dostupan',
  available: 'dostupan',
  zauzet: 'zauzet',
  busy: 'zauzet',
  na_pauzi: 'na_pauzi',
  on_break: 'na_pauzi',
  van_smjene: 'van_smjene',
  off_duty: 'van_smjene',
  van_funkcije: 'van_funkcije',
  offline: 'van_funkcije',
}

const VEHICLE_STATUS_MAP: Record<string, VehicleStatus> = {
  dostupno: 'dostupno',
  available: 'dostupno',
  u_servisu: 'u_servisu',
  in_service: 'u_servisu',
  nedostupno: 'nedostupno',
  unavailable: 'nedostupno',
}

const RIDE_REQUEST_STATUS_MAP: Record<string, RideRequestStatus> = {
  kreiran: 'kreiran',
  created: 'kreiran',
  u_obradi: 'u_obradi',
  processing: 'u_obradi',
  dodijeljen: 'dodijeljen',
  assigned: 'dodijeljen',
  otkazan: 'otkazan',
  cancelled: 'otkazan',
  neuspjesan: 'neuspjesan',
  failed: 'neuspjesan',
}

const RIDE_STATUS_MAP: Record<string, RideStatus> = {
  dodijeljena: 'dodijeljena',
  assigned: 'dodijeljena',
  vozac_na_putu: 'vozac_na_putu',
  driver_on_the_way: 'vozac_na_putu',
  stigao: 'stigao',
  arrived: 'stigao',
  u_toku: 'u_toku',
  in_progress: 'u_toku',
  zavrsena: 'zavrsena',
  completed: 'zavrsena',
  otkazana: 'otkazana',
  cancelled: 'otkazana',
  neuspjesna: 'neuspjesna',
  failed: 'neuspjesna',
}

function normalizeDb(db: MockDatabase): boolean {
  let changed = false
  if (ensureDriverData(db)) changed = true
  if (ensureDispatchData(db)) changed = true
  if (syncAllLinkedFleetDriversFromUi()) changed = true
  for (const u of db.users) {
    const r = u as { role?: string }
    if (r.role !== 'putnik' && r.role !== 'vozac' && r.role !== 'dispecer') {
      r.role = 'putnik'
      changed = true
    }
  }
  for (const d of db.drivers) {
    const mapped = DRIVER_STATUS_MAP[d.availabilityStatus as string]
    if (mapped && mapped !== d.availabilityStatus) {
      d.availabilityStatus = mapped
      changed = true
    }
  }
  const validAvail: DriverAvailability[] = ['dostupan', 'zauzet', 'na_pauzi', 'van_smjene', 'van_funkcije']
  for (const d of db.drivers) {
    if (!validAvail.includes(d.availabilityStatus)) {
      d.availabilityStatus = 'dostupan'
      changed = true
    }
  }
  for (const v of db.vehicles) {
    const normalized = VEHICLE_STATUS_MAP[v.status]
    if (normalized && normalized !== v.status) {
      v.status = normalized
      changed = true
    }
  }
  const validVeh: VehicleStatus[] = ['dostupno', 'u_servisu', 'nedostupno']
  for (const v of db.vehicles) {
    if (!validVeh.includes(v.status)) {
      v.status = 'dostupno'
      changed = true
    }
  }
  for (const req of db.rideRequests) {
    const normalized = RIDE_REQUEST_STATUS_MAP[req.status]
    if (normalized && normalized !== req.status) {
      req.status = normalized
      changed = true
    }
  }
  for (const ride of db.rides) {
    const normalized = RIDE_STATUS_MAP[ride.status]
    if (normalized && normalized !== ride.status) {
      ride.status = normalized
      changed = true
    }
  }
  return changed
}

export function getDb(): MockDatabase {
  if (memory) {
    if (normalizeDb(memory)) persist()
    return memory
  }
  const raw = loadRaw()
  if (raw) {
    try {
      memory = JSON.parse(raw) as MockDatabase
      if (normalizeDb(memory)) persist()
      return memory
    } catch {
      memory = createFreshSeed()
      persist()
      return memory
    }
  }
  memory = createFreshSeed()
  persist()
  return memory
}

export function persist(): void {
  if (!memory) return
  saveRaw(JSON.stringify(memory))
}

export function resetDb(): void {
  memory = createFreshSeed()
  persist()
}

export function replaceDb(next: MockDatabase): void {
  memory = next
  persist()
}
