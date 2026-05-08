import { cloneLocation, createDefaultDriverUi, simpleRoute } from '../data/seed'
import { strings } from '../i18n/strings'
import { addNotificationRaw } from './notificationApi'
import { generateDriverStartNearPickup } from '../utils/driverSim'
import { fetchRoadRoute } from './routingApi'
import type {
  DriverActivityKind,
  DriverAvailability,
  DriverIncomingRequest,
  DriverRideFlowStatus,
  DriverUiState,
  PaymentMethod,
} from '../types/domain'
import { delay } from './delay'
import { getDb, persist } from './mockDb'
import { clearDriverSettingsLocalStorage } from '../lib/driverSettingsLocal'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultVehicleUi(): DriverUiState['vehicleUi'] {
  const t0 = Date.now()
  return {
    status: 'dostupno',
    brandModel: 'Toyota Corolla',
    color: 'Siva',
    plate: 'K12-M-458',
    year: 2021,
    seatCount: 4,
    vehicleType: 'Standard',
    lastInspectionIso: new Date(t0 - 86400000 * 45).toISOString(),
    nextInspectionIso: new Date(t0 + 86400000 * 320).toISOString(),
    insuranceUntilIso: new Date(t0 + 86400000 * 200).toISOString(),
  }
}

function migrateDriverUi(ui: DriverUiState): void {
  if (!ui.shiftClock) {
    ui.shiftClock = {
      totalActiveSecondsToday: 0,
      pausesToday: 0,
      hasStartedToday: false,
    }
  }
  if (!ui.vehicleUi) {
    ui.vehicleUi = defaultVehicleUi()
  }
  if (ui.settings.shareLocationDuringShift === undefined) ui.settings.shareLocationDuringShift = true
  if (ui.settings.shareLocationWithDispatcher === undefined) ui.settings.shareLocationWithDispatcher = true
  const raw = ui.settings as Record<string, unknown>
  if (raw.lastKnownLocationLabel === undefined) {
    if (typeof raw.demoLastKnownLocationLabel === 'string') {
      ui.settings.lastKnownLocationLabel = raw.demoLastKnownLocationLabel
    } else {
      ui.settings.lastKnownLocationLabel = 'Sarajevo (Centar)'
    }
  }
  delete raw.demoLastKnownLocationLabel
  if (!ui.settings.lastGpsReadAt) ui.settings.lastGpsReadAt = new Date().toISOString()
}

function uiFor(accountId: string): DriverUiState {
  const db = getDb()
  const ui = db.driverUiByAccountId[accountId]
  if (!ui) {
    db.driverUiByAccountId[accountId] = createDefaultDriverUi()
    persist()
    migrateDriverUi(db.driverUiByAccountId[accountId])
    return db.driverUiByAccountId[accountId]
  }
  migrateDriverUi(ui)
  return ui
}

function accumulateActiveSession(ui: DriverUiState): void {
  const start = ui.shiftClock.currentSessionStartedAt
  if (!start) return
  ui.shiftClock.totalActiveSecondsToday += Math.floor((Date.now() - new Date(start).getTime()) / 1000)
  ui.shiftClock.currentSessionStartedAt = undefined
}

export function driverShiftSessionLabel(ui: DriverUiState): string {
  if (ui.availabilityStatus === 'van_funkcije') return 'Prekinuta'
  if (['dostupan', 'zauzet', 'na_pauzi'].includes(ui.availabilityStatus)) return 'Aktivna'
  if (ui.availabilityStatus === 'van_smjene') {
    if (!ui.shiftClock.hasStartedToday) return 'Planirana'
    return ui.shiftClock.lastStopKind === 'gps_off' ? 'Prekinuta' : 'Završena'
  }
  return 'Planirana'
}

export function formatDurationHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${sec}s`
  return `${sec}s`
}

function pushLog(
  accountId: string,
  kind: DriverActivityKind,
  message: string,
  meta?: Record<string, string | undefined>
): void {
  const ui = uiFor(accountId)
  ui.activityLog.unshift({
    id: uid('dlog'),
    createdAt: new Date().toISOString(),
    kind,
    message,
    meta,
  })
  if (ui.activityLog.length > 220) ui.activityLog.length = 220
}

export function buildTemplateRideRequest(): DriverIncomingRequest {
  return {
    id: `req-driver-${Date.now()}`,
    pickup: cloneLocation('loc-bascarsija'),
    destination: cloneLocation('loc-airport'),
    passengerName: 'Lejla H.',
    distanceToPassengerKm: 1.2,
    routeDistanceKm: 12.6,
    etaToPickupMin: 4,
    estimatedDurationMin: 22,
    estimatedPrice: 18.5,
    paymentMethod: 'gotovina',
    type: 'odmah',
    status: 'ponudjen',
    createdAt: new Date().toISOString(),
  }
}

export async function fetchDriverUi(accountId: string): Promise<DriverUiState> {
  await delay(80)
  return structuredClone(uiFor(accountId))
}

function blockers(ui: DriverUiState): string | null {
  if (ui.flags.accountSuspended) return 'Račun je suspendovan. Kontaktirajte dispečera.'
  if (ui.flags.licenseExpired) return 'Licenca je istekla. Nije moguće započeti smjenu.'
  if (ui.flags.debtOwed) return 'Imate dug prema firmi. Riješite saldo prije smjene.'
  return null
}

export async function driverStartShift(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.availabilityStatus === 'van_funkcije') {
    return { error: 'Van funkcije — potrebna intervencija dispečera ili administratora.' }
  }
  const b = blockers(ui)
  if (b) return { error: b }
  if (ui.flags.gpsUnavailableSim) {
    return { error: 'GPS nije dostupan. Omogućite lokaciju u postavkama uređaja.' }
  }
  if (!ui.settings.gpsConsent) {
    return { error: 'Uključite pristup lokaciji u postavkama da biste započeli smjenu.' }
  }
  if (ui.availabilityStatus === 'zauzet' && ui.activeRide) {
    return { error: 'Ne možete mijenjati smjenu dok je vožnja aktivna.' }
  }
  ui.gpsPermissionSimulated = true
  ui.availabilityStatus = 'dostupan'
  ui.shiftClock.currentSessionStartedAt = new Date().toISOString()
  ui.shiftClock.hasStartedToday = true
  ui.shiftClock.lastStopKind = undefined
  ui.settings.lastGpsReadAt = new Date().toISOString()
  pushLog(accountId, 'smjena', 'Smjena započeta. GPS lokacija evidentirana.')
  if (!ui.pendingRequest && !ui.activeRide) {
    ui.pendingRequest = buildTemplateRideRequest()
    pushLog(accountId, 'zahtjev', 'Novi zahtjev za vožnju primljen.', { zahtjevId: ui.pendingRequest.id })
  }
  persist()
  return { ok: true }
}

export async function driverPause(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.availabilityStatus !== 'dostupan') {
    return { error: 'Pauzu možete uključiti samo kada ste dostupni.' }
  }
  ui.availabilityStatus = 'na_pauzi'
  ui.shiftClock.pausesToday += 1
  if (ui.pendingRequest) {
    pushLog(accountId, 'zahtjev', 'Zahtjev vraćen sistemu (pauza vozača).', { zahtjevId: ui.pendingRequest.id })
    ui.pendingRequest = null
  }
  pushLog(accountId, 'status_vozaca', 'Status promijenjen: Pauza.')
  persist()
  return { ok: true }
}

export async function driverResume(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.availabilityStatus !== 'na_pauzi') {
    return { error: 'Nastavak je dostupan samo sa pauze.' }
  }
  const b = blockers(ui)
  if (b) return { error: b }
  if (ui.flags.gpsUnavailableSim) {
    return { error: 'GPS nije dostupan.' }
  }
  ui.availabilityStatus = 'dostupan'
  ui.settings.lastGpsReadAt = new Date().toISOString()
  pushLog(accountId, 'status_vozaca', 'Status promijenjen: Dostupan (nastavak smjene).')
  if (!ui.pendingRequest && !ui.activeRide) {
    ui.pendingRequest = buildTemplateRideRequest()
    pushLog(accountId, 'zahtjev', 'Novi zahtjev za vožnju primljen.', { zahtjevId: ui.pendingRequest.id })
  }
  persist()
  return { ok: true }
}

export async function driverEndShift(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.activeRide && ui.activeRide.flowStatus !== 'zavrsena') {
    return { error: 'Ne možete završiti smjenu dok imate aktivnu vožnju.' }
  }
  if (ui.availabilityStatus === 'zauzet') {
    return { error: 'Ne možete završiti smjenu dok ste zauzeti vožnjom.' }
  }
  const endedStart = ui.shiftClock.currentSessionStartedAt
  accumulateActiveSession(ui)
  if (endedStart) ui.shiftClock.lastSessionStartedAt = endedStart
  ui.shiftClock.lastSessionEndedAt = new Date().toISOString()
  ui.shiftClock.lastStopKind = 'normal'
  ui.availabilityStatus = 'van_smjene'
  ui.gpsPermissionSimulated = false
  ui.pendingRequest = null
  if (ui.vehicleUi.status !== 'van_funkcije') ui.vehicleUi.status = 'dostupno'
  pushLog(accountId, 'smjena', 'Smjena završena.')
  persist()
  return { ok: true }
}

export async function driverAcceptRequest(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.availabilityStatus !== 'dostupan') {
    return { error: 'Ne možete prihvatiti vožnju dok niste dostupni.' }
  }
  if (!ui.pendingRequest) {
    return { error: 'Nema aktivnog zahtjeva.' }
  }
  if (ui.activeRide) {
    return { error: 'Već imate aktivnu vožnju.' }
  }
  const req = ui.pendingRequest
  const route = await fetchRoadRoute(req.pickup, req.destination)
  const routePoints = route.routePoints.length > 1
    ? route.routePoints
    : simpleRoute(req.pickup, req.destination)
  const routeDistanceKm = route.distanceKm > 0 ? route.distanceKm : req.routeDistanceKm
  const estimatedDurationMin = route.durationMin > 0 ? route.durationMin : req.estimatedDurationMin
  const startPos = generateDriverStartNearPickup(req.pickup)
  ui.activeRide = {
    id: uid('dride'),
    requestId: req.id,
    passengerName: req.passengerName,
    paymentMethod: req.paymentMethod,
    pickup: { ...req.pickup },
    destination: { ...req.destination },
    routePoints,
    distanceToPassengerKm: req.distanceToPassengerKm,
    routeDistanceKm,
    etaToPickupMin: req.etaToPickupMin,
    estimatedDurationMin,
    estimatedPrice: req.estimatedPrice,
    flowStatus: 'vozac_na_putu',
    type: req.type,
    createdAt: req.createdAt,
    acceptedAt: new Date().toISOString(),
    driverLat: startPos.lat,
    driverLng: startPos.lng,
  }
  ui.pendingRequest = null
  ui.availabilityStatus = 'zauzet'
  ui.vehicleUi.status = 'zauzeto'
  pushLog(accountId, 'vožnja', 'Vožnja prihvaćena.', { vožnjaId: ui.activeRide.id })
  persist()
  return { ok: true }
}

export type RejectReasonCode = 'predaleko' | 'pauza' | 'guzva' | 'tehnicki' | 'drugo'

export async function driverRejectRequest(
  accountId: string,
  reason: RejectReasonCode,
  note?: string
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (!ui.pendingRequest) return { error: 'Nema zahtjeva za odbijanje.' }
  const rid = ui.pendingRequest.id
  ui.pendingRequest = null
  pushLog(accountId, 'zahtjev', `Zahtjev odbijen (${reason}).`, { zahtjevId: rid, napomena: note })
  persist()
  return { ok: true }
}

export async function scheduleNewRequestAfterReject(accountId: string, ms = 3200): Promise<void> {
  await delay(ms)
  const ui = uiFor(accountId)
  if (ui.availabilityStatus === 'dostupan' && !ui.activeRide && !ui.pendingRequest) {
    ui.pendingRequest = buildTemplateRideRequest()
    pushLog(accountId, 'zahtjev', 'Novi zahtjev dodijeljen nakon odbijanja.', { zahtjevId: ui.pendingRequest.id })
    persist()
  }
}

export async function driverPatchActiveRidePosition(accountId: string, lat: number, lng: number): Promise<void> {
  await delay(0)
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return
  ride.driverLat = lat
  ride.driverLng = lng
  persist()
}

export async function driverMarkArrived(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return { error: 'Nema aktivne vožnje.' }
  if (ride.flowStatus !== 'prihvacena' && ride.flowStatus !== 'vozac_na_putu') {
    return { error: 'Ova akcija nije dostupna u trenutnom koraku.' }
  }
  ride.flowStatus = 'stigao'
  ride.arrivedAt = new Date().toISOString()
  ride.driverLat = ride.pickup.lat
  ride.driverLng = ride.pickup.lng
  pushLog(accountId, 'vožnja', 'Stigli ste na lokaciju preuzimanja.', { vožnjaId: ride.id })
  persist()
  return { ok: true }
}

export type DriverDemoForcePhase = 'vozac_na_putu' | 'stigao' | 'u_toku' | 'zavrsena'

/** Samo za demo: skok faze kao na putničkom ekranu (prisilni statusi). */
export async function driverDemoForcePhase(
  accountId: string,
  phase: DriverDemoForcePhase
): Promise<
  | { ok: true }
  | {
      ok: true
      summary: {
        routeLabel: string
        price: number
        durationMin: number
        payment: PaymentMethod
      }
    }
  | { error: string }
> {
  await delay(80)
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return { error: 'Nema aktivne vožnje.' }

  if (phase === 'vozac_na_putu') {
    ride.flowStatus = 'vozac_na_putu'
    ride.arrivedAt = undefined
    const start = generateDriverStartNearPickup(ride.pickup)
    ride.driverLat = start.lat
    ride.driverLng = start.lng
    pushLog(accountId, 'vožnja', 'Faza: vozač na putu.', { vožnjaId: ride.id })
    persist()
    return { ok: true }
  }
  if (phase === 'stigao') {
    ride.flowStatus = 'stigao'
    ride.arrivedAt = new Date().toISOString()
    ride.driverLat = ride.pickup.lat
    ride.driverLng = ride.pickup.lng
    pushLog(accountId, 'vožnja', 'Faza: stigao.', { vožnjaId: ride.id })
    persist()
    return { ok: true }
  }
  if (phase === 'u_toku') {
    ride.flowStatus = 'u_toku'
    ride.startedAt = ride.startedAt ?? new Date().toISOString()
    ride.driverLat = ride.pickup.lat
    ride.driverLng = ride.pickup.lng
    pushLog(accountId, 'vožnja', 'Faza: u toku.', { vožnjaId: ride.id })
    persist()
    return { ok: true }
  }
  ride.flowStatus = 'u_toku'
  ride.driverLat = ride.destination.lat
  ride.driverLng = ride.destination.lng
  ride.startedAt = ride.startedAt ?? new Date().toISOString()
  persist()
  return driverCompleteRide(accountId)
}

export async function driverStartRideLeg(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return { error: 'Nema aktivne vožnje.' }
  if (ride.flowStatus !== 'stigao') {
    return { error: 'Prvo označite dolazak na lokaciju.' }
  }
  ride.flowStatus = 'u_toku'
  ride.startedAt = new Date().toISOString()
  pushLog(accountId, 'vožnja', 'Vožnja je pokrenuta.', { vožnjaId: ride.id })
  persist()
  return { ok: true }
}

export async function driverCompleteRide(accountId: string): Promise<
  | {
      ok: true
      summary: {
        routeLabel: string
        price: number
        durationMin: number
        payment: PaymentMethod
      }
    }
  | { error: string }
> {
  await delay()
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return { error: 'Nema aktivne vožnje.' }
  if (ride.flowStatus !== 'u_toku') {
    return { error: 'Vožnja još nije u toku.' }
  }
  const finishedAt = new Date().toISOString()
  ride.finishedAt = finishedAt
  ride.flowStatus = 'zavrsena'
  const started = ride.startedAt ? new Date(ride.startedAt).getTime() : Date.now()
  const durationMin = Math.max(1, Math.round((new Date(finishedAt).getTime() - started) / 60000))
  const routeLabel = `${ride.pickup.label} → ${ride.destination.label}`
  ui.history.unshift({
    id: ride.id,
    date: finishedAt,
    pickupLabel: ride.pickup.label,
    destinationLabel: ride.destination.label,
    passengerName: ride.passengerName,
    status: 'zavrsena',
    earningsBam: ride.estimatedPrice,
    paymentMethod: ride.paymentMethod,
    rating: undefined,
    routeDistanceKm: ride.routeDistanceKm,
    durationMin,
  })
  ui.ridesToday += 1
  ui.earningsTodayBam = Math.round((ui.earningsTodayBam + ride.estimatedPrice) * 100) / 100
  ui.fuelPercent = Math.max(8, ui.fuelPercent - 3)
  ui.activeRide = null
  ui.availabilityStatus = 'dostupan'
  if (ui.vehicleUi.status !== 'van_funkcije') ui.vehicleUi.status = 'dostupno'
  pushLog(accountId, 'vožnja', 'Vožnja završena.', { vožnjaId: ride.id })
  if (!ui.pendingRequest) {
    ui.pendingRequest = buildTemplateRideRequest()
    pushLog(accountId, 'zahtjev', 'Novi zahtjev za vožnju primljen.', { zahtjevId: ui.pendingRequest.id })
  }
  persist()

  const msg = strings()
  const d = msg.driver
  const nTitle = msg.notifications.driverRideSummaryTitle
  const nBody = [
    `${d.rideSummaryRoute}: ${routeLabel}`,
    `${d.rideSummaryPrice}: ${ride.estimatedPrice.toFixed(2)} BAM`,
    `${d.rideSummaryDuration}: ${durationMin} min`,
    `${d.rideSummaryPayment}: ${ride.paymentMethod}`,
  ].join('\n')
  await addNotificationRaw(accountId, nTitle, nBody, 'driverRideSummary')

  return {
    ok: true,
    summary: {
      routeLabel,
      price: ride.estimatedPrice,
      durationMin,
      payment: ride.paymentMethod,
    },
  }
}

export async function driverCancelActiveRide(
  accountId: string,
  reason: string,
  unjustified?: boolean
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  const ride = ui.activeRide
  if (!ride) return { error: 'Nema aktivne vožnje.' }
  if (ride.flowStatus === 'zavrsena') return { error: 'Vožnja je već završena.' }
  ride.cancelledAt = new Date().toISOString()
  ride.cancellationReason = reason
  ride.flowStatus = 'otkazana'
  ui.history.unshift({
    id: ride.id,
    date: ride.cancelledAt,
    pickupLabel: ride.pickup.label,
    destinationLabel: ride.destination.label,
    passengerName: ride.passengerName,
    status: 'otkazana',
    earningsBam: 0,
    paymentMethod: ride.paymentMethod,
    routeDistanceKm: ride.routeDistanceKm,
    cancellationReason: reason,
  })
  if (unjustified) {
    ui.totalUnjustifiedCancels += 1
    if (ui.totalUnjustifiedCancels >= 3 && !ui.adminWarningSent) {
      ui.adminWarningSent = true
      pushLog(accountId, 'sistem', 'Upozorenje: učestala neopravdana otkazivanja — obaviještena administracija.')
    }
  }
  ui.activeRide = null
  ui.availabilityStatus = 'dostupan'
  if (ui.vehicleUi.status !== 'van_funkcije') ui.vehicleUi.status = 'dostupno'
  pushLog(accountId, 'vožnja', `Vožnja otkazana: ${reason}`, { vožnjaId: ride.id })
  persist()
  return { ok: true }
}

export type ProblemTypeCode =
  | 'kvar_vozila'
  | 'gps_problem'
  | 'putnik_otkaz'
  | 'adresa'
  | 'guzva'
  | 'drugo'

const PROBLEM_LABELS: Record<ProblemTypeCode, string> = {
  kvar_vozila: 'Kvar vozila',
  gps_problem: 'GPS problem',
  putnik_otkaz: 'Putnik se ne pojavljuje',
  adresa: 'Neispravna adresa',
  guzva: 'Saobraćajna gužva',
  drugo: 'Drugo',
}

export async function driverReportProblem(
  accountId: string,
  type: ProblemTypeCode,
  description: string
): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  const label = PROBLEM_LABELS[type]
  const ride = ui.activeRide
  if (ride) {
    ride.flowStatus = 'problem'
    ride.problemType = label
    ride.problemDescription = description
    ui.history.unshift({
      id: ride.id,
      date: new Date().toISOString(),
      pickupLabel: ride.pickup.label,
      destinationLabel: ride.destination.label,
      passengerName: ride.passengerName,
      status: 'problem',
      earningsBam: 0,
      paymentMethod: ride.paymentMethod,
      routeDistanceKm: ride.routeDistanceKm,
      problemType: label,
    })
    ui.activeRide = null
  }
  if (type === 'kvar_vozila') {
    ui.availabilityStatus = 'van_funkcije'
    ui.vehicleUi.status = 'van_funkcije'
    pushLog(accountId, 'problem', `Kvar vozila prijavljen: ${description}`, { tip: label })
    pushLog(accountId, 'status_vozaca', 'Status vozača: Van funkcije (kvar vozila).')
  } else {
    if (ride) {
      ui.availabilityStatus = 'dostupan'
    }
    pushLog(accountId, 'problem', `Problem poslan dispečeru (${label}): ${description}`)
  }
  persist()
  return { ok: true }
}

export async function driverSimulateNewRequest(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.pendingRequest || ui.activeRide) {
    return { error: 'Već postoji zahtjev ili aktivna vožnja.' }
  }
  ui.pendingRequest = buildTemplateRideRequest()
  pushLog(accountId, 'zahtjev', 'Novi zahtjev za vožnju primljen.', { zahtjevId: ui.pendingRequest.id })
  persist()
  return { ok: true }
}

export async function driverSetGpsUnavailableDemo(accountId: string, value: boolean): Promise<void> {
  await delay(120)
  const ui = uiFor(accountId)
  ui.flags.gpsUnavailableSim = value
  persist()
}

export async function driverSetSuspendedDemo(accountId: string, value: boolean): Promise<void> {
  await delay(120)
  const ui = uiFor(accountId)
  ui.flags.accountSuspended = value
  if (value) {
    ui.availabilityStatus = 'van_funkcije'
    ui.pendingRequest = null
  }
  persist()
}

export async function driverSetLicenseExpiredDemo(accountId: string, value: boolean): Promise<void> {
  await delay(120)
  const ui = uiFor(accountId)
  ui.flags.licenseExpired = value
  const db = getDb()
  const prof = db.driverProfiles.find((p) => p.accountId === accountId)
  if (prof) prof.licenseStatus = value ? 'istekla' : 'validna'
  persist()
}

export async function driverSetDebtDemo(accountId: string, value: boolean): Promise<void> {
  await delay(120)
  const ui = uiFor(accountId)
  ui.flags.debtOwed = value
  persist()
}

export async function driverUpdateSettings(
  accountId: string,
  patch: Partial<{
    notificationsEnabled: boolean
    gpsConsent: boolean
    shareLocationDuringShift: boolean
    shareLocationWithDispatcher: boolean
    lastGpsReadAt: string
    lastKnownLocationLabel: string
  }>
): Promise<void> {
  await delay(100)
  const ui = uiFor(accountId)
  if (patch.notificationsEnabled !== undefined) ui.settings.notificationsEnabled = patch.notificationsEnabled
  if (patch.gpsConsent !== undefined) {
    ui.settings.gpsConsent = patch.gpsConsent
    if (patch.gpsConsent) ui.settings.lastGpsReadAt = new Date().toISOString()
  }
  if (patch.shareLocationDuringShift !== undefined) ui.settings.shareLocationDuringShift = patch.shareLocationDuringShift
  if (patch.shareLocationWithDispatcher !== undefined) ui.settings.shareLocationWithDispatcher = patch.shareLocationWithDispatcher
  if (patch.lastGpsReadAt !== undefined) ui.settings.lastGpsReadAt = patch.lastGpsReadAt
  if (patch.lastKnownLocationLabel !== undefined) ui.settings.lastKnownLocationLabel = patch.lastKnownLocationLabel
  persist()
}

/** Potvrđeno gašenje GPS-a tokom aktivne smjene (bez aktivne vožnje). */
export async function driverConfirmGpsOffDuringShift(accountId: string): Promise<{ ok: true } | { error: string }> {
  await delay()
  const ui = uiFor(accountId)
  if (ui.activeRide && ui.activeRide.flowStatus !== 'zavrsena' && ui.activeRide.flowStatus !== 'otkazana') {
    return { error: 'Ne možete isključiti GPS dok je vožnja aktivna.' }
  }
  const onDuty = ['dostupan', 'zauzet', 'na_pauzi'].includes(ui.availabilityStatus)
  if (!onDuty) {
    return { error: 'GPS nije vezan uz aktivnu smjenu u ovom trenutku.' }
  }
  const endedStart = ui.shiftClock.currentSessionStartedAt
  accumulateActiveSession(ui)
  if (endedStart) ui.shiftClock.lastSessionStartedAt = endedStart
  ui.shiftClock.lastSessionEndedAt = new Date().toISOString()
  ui.shiftClock.lastStopKind = 'gps_off'
  ui.settings.gpsConsent = false
  ui.availabilityStatus = 'van_smjene'
  ui.gpsPermissionSimulated = false
  ui.pendingRequest = null
  if (ui.vehicleUi.status !== 'van_funkcije') ui.vehicleUi.status = 'dostupno'
  pushLog(accountId, 'gps', 'GPS isključen tokom smjene. Smjena prekinuta; vozač van smjene.')
  persist()
  return { ok: true }
}

export async function resetDriverDemo(accountId: string): Promise<void> {
  await delay(150)
  const db = getDb()
  db.driverUiByAccountId[accountId] = createDefaultDriverUi()
  migrateDriverUi(db.driverUiByAccountId[accountId])
  clearDriverSettingsLocalStorage(accountId)
  const prof = db.driverProfiles.find((p) => p.accountId === accountId)
  if (prof) {
    prof.licenseStatus = 'validna'
  }
  db.driverAvatarPendingRequests = db.driverAvatarPendingRequests.filter((r) => r.driverAccountId !== accountId)
  persist()
}

export function driverAvailabilityLabel(s: DriverAvailability): string {
  const m: Record<DriverAvailability, string> = {
    dostupan: 'Dostupan',
    zauzet: 'Zauzet',
    na_pauzi: 'Na pauzi',
    van_smjene: 'Van smjene',
    van_funkcije: 'Van funkcije',
  }
  return m[s]
}

export function rideFlowStepIndex(flow: DriverRideFlowStatus): number {
  switch (flow) {
    case 'prihvacena':
      return 0
    case 'vozac_na_putu':
      return 1
    case 'stigao':
      return 2
    case 'u_toku':
      return 3
    case 'zavrsena':
      return 4
    default:
      return 0
  }
}

/** Korak steppera 0–4 za prikaz napretka */
export const DRIVER_RIDE_STEP_LABELS = [
  'Prihvaćena',
  'Vozač stiže',
  'Stigao na lokaciju',
  'U toku',
  'Završena',
] as const
