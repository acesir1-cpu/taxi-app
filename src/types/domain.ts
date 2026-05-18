export type AccountStatus = 'aktivan' | 'neaktivan' | 'blokiran' | 'suspendovan'

export type RideRequestStatus =
  | 'kreiran'
  | 'u_obradi'
  | 'dodijeljen'
  | 'prihvacen'
  | 'otkazan'
  | 'neuspjesan'

export type RideStatus =
  | 'dodijeljena'
  | 'vozac_na_putu'
  | 'stigao'
  | 'u_toku'
  | 'zavrsena'
  | 'otkazana'
  | 'neuspjesna'
  | 'problematicna'

export type ComplaintStatus = 'zaprimljena' | 'u_obradi' | 'rijesena' | 'odbijena' | 'nepotpuna'

export type PaymentMethod = 'gotovina'

export type DriverAvailability =
  | 'dostupan'
  | 'zauzet'
  | 'na_pauzi'
  | 'van_smjene'
  | 'van_funkcije'

export type VehicleStatus = 'dostupno' | 'u_servisu' | 'nedostupno'

export type OrderType = 'odmah' | 'zakazano'

export type ComplaintCategory =
  | 'kasnjenje'
  | 'neprofesionalno_ponasanje'
  | 'pogresna_ruta'
  | 'problem_s_vozilom'
  | 'naplata'
  | 'drugo'

export type UserRole = 'putnik' | 'vozac' | 'dispecer'

export type DispatcherRoleLevel = 'obicni_dispecer' | 'senior_dispecer' | 'sef_smjene'

export interface UserAccount {
  id: string
  role: UserRole
  email: string
  phone: string
  passwordPlain: string
  status: AccountStatus
  createdAt: string
  lastLoginAt?: string
  verifiedAt?: string
}

export interface PassengerProfile {
  id: string
  accountId: string
  firstName: string
  lastName: string
  registeredAt: string
}

export type DriverLicenseStatus = 'validna' | 'istekla'

export interface DriverUserProfile {
  id: string
  accountId: string
  /** Povezivanje sa zapisom u `drivers` nizu (dodjela putnicima) */
  linkedDriverId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  licenseNumber: string
  licenseStatus: DriverLicenseStatus
  rating: number
  totalRides: number
  vehicle: {
    model: string
    color: string
    plate: string
    status: VehicleStatus
  }
  registeredAt: string
}

/** Zahtjev za vožnju prikazan vozaču */
export interface DispatcherProfile {
  id: string
  accountId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  roleLevel: DispatcherRoleLevel
  shiftName: string
  registeredAt: string
}

export interface DriverIncomingRequest {
  id: string
  pickup: Location
  destination: Location
  passengerName: string
  distanceToPassengerKm: number
  routeDistanceKm: number
  etaToPickupMin: number
  estimatedDurationMin: number
  estimatedPrice: number
  paymentMethod: PaymentMethod
  type: OrderType
  status: 'ponudjen'
  createdAt: string
}

export type DriverRideFlowStatus =
  | 'prihvacena'
  | 'vozac_na_putu'
  | 'stigao'
  | 'u_toku'
  | 'zavrsena'
  | 'otkazana'
  | 'neuspjesna'
  | 'problem'

export interface DriverActiveRide {
  id: string
  requestId: string
  passengerName: string
  paymentMethod: PaymentMethod
  pickup: Location
  destination: Location
  routePoints: Array<{ lat: number; lng: number }>
  distanceToPassengerKm: number
  routeDistanceKm: number
  etaToPickupMin: number
  estimatedDurationMin: number
  estimatedPrice: number
  flowStatus: DriverRideFlowStatus
  type: OrderType
  createdAt: string
  acceptedAt?: string
  arrivedAt?: string
  startedAt?: string
  finishedAt?: string
  cancelledAt?: string
  cancellationReason?: string
  problemType?: string
  problemDescription?: string
  driverLat?: number
  driverLng?: number
}

export type DriverHistoryFilterKind = 'zavrsena' | 'otkazana' | 'problem' | 'neuspjesna'

export interface DriverHistoryItem {
  id: string
  date: string
  pickupLabel: string
  destinationLabel: string
  passengerName: string
  status: DriverRideFlowStatus
  earningsBam: number
  paymentMethod: PaymentMethod
  rating?: number
  cancellationReason?: string
  problemType?: string
  routeDistanceKm: number
  durationMin?: number
}

export type DriverActivityKind =
  | 'smjena'
  | 'status_vozaca'
  | 'zahtjev'
  | 'vožnja'
  | 'problem'
  | 'gps'
  | 'sistem'

export interface DriverActivityLogItem {
  id: string
  createdAt: string
  kind: DriverActivityKind
  message: string
  meta?: Record<string, string | undefined>
}

export interface DriverUiFlags {
  accountSuspended?: boolean
  licenseExpired?: boolean
  debtOwed?: boolean
  gpsUnavailableSim?: boolean
  /** Demo: licenca na provjeri (prikaz „U provjeri”) */
  licenseInReview?: boolean
}

/** Primjer licence na profilu (statika + flagovi u aplikaciji) */
export const DRIVER_LICENSE_SAMPLE = {
  number: 'LIC-2026-001',
  issuedIso: '2024-03-12T10:00:00.000Z',
  expiresIso: '2027-03-12T10:00:00.000Z',
  debtWhenOwedBam: 132.45,
} as const

/** @deprecated Koristite DRIVER_LICENSE_SAMPLE */
export const DRIVER_LICENSE_DEMO = DRIVER_LICENSE_SAMPLE

export type DriverVehicleUiStatus = 'dostupno' | 'zauzeto' | 'van_funkcije' | 'neaktivno'

export type DriverShiftStopKind = 'normal' | 'gps_off'

/** Prikaz statusa smjene u postavkama / kartici */
export interface DriverShiftClockState {
  /** Početak trenutne aktivne smjene (ako postoji) */
  currentSessionStartedAt?: string
  /** Početak zadnje završene smjene u danu (demo prikaz) */
  lastSessionStartedAt?: string
  /** Zadnje vrijeme završetka smjene u danu */
  lastSessionEndedAt?: string
  /** Akumulirano aktivno vrijeme u sekundama (unutar dana, demo) */
  totalActiveSecondsToday: number
  /** Broj pauza u tekućem danu */
  pausesToday: number
  /** Je li danas smjena ikad započeta */
  hasStartedToday: boolean
  /** Kako je zadnja smjena završena (van smjene) */
  lastStopKind?: DriverShiftStopKind
}

export interface DriverVehicleUiState {
  status: DriverVehicleUiStatus
  brandModel: string
  color: string
  plate: string
  year: number
  seatCount: number
  vehicleType: string
  lastInspectionIso: string
  nextInspectionIso: string
  insuranceUntilIso: string
}

export interface DriverUiState {
  availabilityStatus: DriverAvailability
  gpsPermissionSimulated: boolean
  pendingRequest: DriverIncomingRequest | null
  activeRide: DriverActiveRide | null
  history: DriverHistoryItem[]
  activityLog: DriverActivityLogItem[]
  ridesToday: number
  earningsTodayBam: number
  fuelPercent: number
  acceptanceRatePercent: number
  totalUnjustifiedCancels: number
  adminWarningSent: boolean
  flags: DriverUiFlags
  shiftClock: DriverShiftClockState
  vehicleUi: DriverVehicleUiState
  settings: {
    notificationsEnabled: boolean
    gpsConsent: boolean
    shareLocationDuringShift: boolean
    shareLocationWithDispatcher: boolean
    lastGpsReadAt?: string
    lastKnownLocationLabel: string
  }
}

export type AuthSession =
  | { kind: 'passenger'; account: UserAccount; profile: PassengerProfile }
  | { kind: 'driver'; account: UserAccount; driverProfile: DriverUserProfile }
  | { kind: 'dispatcher'; account: UserAccount; dispatcherProfile: DispatcherProfile }

export interface Location {
  id: string
  address: string
  lat: number
  lng: number
  label: string
  zoneId: string
}

export interface Driver {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  phone: string
  licenseNumber: string
  availabilityStatus: DriverAvailability
  rating: number
  totalRatings: number
  currentLocation: { lat: number; lng: number }
  vehicleId: string
}

export interface Vehicle {
  id: string
  registration: string
  brand: string
  model: string
  year: number
  color: string
  seatCount: number
  type: string
  status: VehicleStatus
}

export interface RideRequest {
  id: string
  passengerId: string
  pickup: Location
  destination: Location
  createdAt: string
  orderType: OrderType
  scheduledAt?: string
  estimatedPrice: number
  estimatedDurationMin: number
  estimatedEtaMin: number
  distanceKm: number
  status: RideRequestStatus
  cancellationReason?: string
  cancelledByAccountId?: string
  rideId?: string
}

export interface Ride {
  id: string
  requestId: string
  passengerId: string
  driverId: string
  vehicleId: string
  status: RideStatus
  pickup: Location
  destination: Location
  routePoints: Array<{ lat: number; lng: number }>
  estimatedPrice: number
  finalPrice?: number
  distanceKm: number
  estimatedDurationMin: number
  paymentMethod: PaymentMethod
  /** Tip narudžbe iz zahtjeva (za historiju / filter „Zakazano“) */
  orderType?: OrderType
  /** Zakazano vrijeme polaska (samo za orderType zakazano) */
  scheduledAt?: string
  createdAt: string
  assignedAt?: string
  driverArrivedAt?: string
  startedAt?: string
  finishedAt?: string
  cancelledAt?: string
  cancellationReason?: string
  /** Simulated driver position for map */
  driverLat?: number
  driverLng?: number
}

export interface Rating {
  id: string
  rideId: string
  driverId: string
  passengerId: string
  stars: number
  comment?: string
  createdAt: string
}

export interface Complaint {
  id: string
  rideId: string
  submittedByAccountId: string
  category: ComplaintCategory
  description: string
  status: ComplaintStatus
  createdAt: string
  resolvedAt?: string
  outcome?: string
}

export type ActivityLogType =
  | 'auth'
  | 'ride'
  | 'rating'
  | 'complaint'
  | 'profile'
  | 'dispatch'
  | 'system'

export interface ActivityLog {
  id: string
  accountId: string
  type: ActivityLogType
  description: string
  createdAt: string
  oldValue?: string
  newValue?: string
}

export type DispatchLogKind =
  | 'auth'
  | 'ride'
  | 'driver'
  | 'complaint'
  | 'anomaly'
  | 'rbac'
  | 'note'
  | 'system'

export interface DispatchLog {
  id: string
  createdAt: string
  dispatcherAccountId?: string
  kind: DispatchLogKind
  message: string
  rideId?: string
  requestId?: string
  driverId?: string
  complaintId?: string
  meta?: Record<string, string | number | boolean | undefined>
}

export type { AppNotification } from './notifications'

export interface RouteEstimate {
  distanceKm: number
  durationMin: number
  routePoints: Array<{ lat: number; lng: number }>
  estimatedPrice: number
  estimatedEtaToPickupMin?: number
}

/** Zahtjev za promjenu profilne fotografije vozača — vidljiva slika tek nakon odobrenja administratora. */
export interface DriverAvatarPendingRequest {
  id: string
  driverId: string
  driverAccountId: string
  proposedDataUrl: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  adminNote?: string
}

export interface MockDatabase {
  version: number
  users: UserAccount[]
  profiles: PassengerProfile[]
  driverProfiles: DriverUserProfile[]
  dispatcherProfiles: DispatcherProfile[]
  /** Po accountId vozača */
  driverUiByAccountId: Record<string, DriverUiState>
  drivers: Driver[]
  /** Red čekanja za odobrenje nove profilne slike (mock / demo). */
  driverAvatarPendingRequests: DriverAvatarPendingRequest[]
  vehicles: Vehicle[]
  rideRequests: RideRequest[]
  rides: Ride[]
  passengerDemoHistoryCleared?: boolean
  ratings: Rating[]
  complaints: Complaint[]
  activityLogs: ActivityLog[]
  dispatchLogs: DispatchLog[]
  dispatchAcknowledgedAnomalyIds: string[]
  notifications: import('./notifications').AppNotification[]
  currentUserId: string | null
  /** Emails/phones pending verification */
  pendingVerificationAccountIds: string[]
}
