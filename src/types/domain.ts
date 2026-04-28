export type AccountStatus = 'aktivan' | 'neaktivan' | 'blokiran' | 'suspendovan'

export type RideRequestStatus =
  | 'kreiran'
  | 'u_obradi'
  | 'dodijeljen'
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

export interface UserAccount {
  id: string
  role: 'putnik'
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

export interface AppNotification {
  id: string
  accountId: string
  title: string
  body: string
  read: boolean
  createdAt: string
  type: string
}

export interface RouteEstimate {
  distanceKm: number
  durationMin: number
  routePoints: Array<{ lat: number; lng: number }>
  estimatedPrice: number
  estimatedEtaToPickupMin?: number
}

export interface MockDatabase {
  version: number
  users: UserAccount[]
  profiles: PassengerProfile[]
  drivers: Driver[]
  vehicles: Vehicle[]
  rideRequests: RideRequest[]
  rides: Ride[]
  ratings: Rating[]
  complaints: Complaint[]
  activityLogs: ActivityLog[]
  notifications: AppNotification[]
  currentUserId: string | null
  /** Emails/phones pending verification */
  pendingVerificationAccountIds: string[]
}
