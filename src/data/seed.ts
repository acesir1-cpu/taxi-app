import type {
  Complaint,
  DispatchLog,
  DispatcherProfile,
  Driver,
  DriverHistoryItem,
  DriverUiState,
  DriverUserProfile,
  Location,
  MockDatabase,
  PassengerProfile,
  Rating,
  Ride,
  UserAccount,
  Vehicle,
} from '../types/domain'
import { primeRoadRouteCache } from '../services/routingApi'
import { SEED_ROUTES } from './seedRouteCache'
import driverAvatarAmir from '../../vozaci-slike/charlie-green-3JmfENcL24M-unsplash.jpg'
import driverAvatarNermin from '../../vozaci-slike/christian-buehner-DItYlc26zVI-unsplash.jpg'
import driverAvatarEldar from '../../vozaci-slike/irene-strong-v2aKnjMbP_k-unsplash.jpg'
import driverAvatarMirza from '../../pictures/man.png'

export const ZONE_SARAJEVO = 'sarajevo_core'

/** Bounding box for supported zone */
export const SERVICE_BOUNDS = {
  minLat: 43.78,
  maxLat: 43.95,
  minLng: 18.28,
  maxLng: 18.45,
}

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'loc-bascarsija',
    label: 'Baščaršija',
    address: 'Baščaršija, Sarajevo',
    lat: 43.859,
    lng: 18.4318,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-marijin',
    label: 'Marijin Dvor',
    address: 'Marijin Dvor, Sarajevo',
    lat: 43.8563,
    lng: 18.4034,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-grbavica',
    label: 'Grbavica',
    address: 'Grbavica, Sarajevo',
    lat: 43.8497,
    lng: 18.3892,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-ilidza',
    label: 'Ilidža',
    address: 'Ilidža, Sarajevo',
    lat: 43.8298,
    lng: 18.3076,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-airport',
    label: 'Aerodrom Sarajevo',
    address: 'Aerodrom Sarajevo',
    lat: 43.8246,
    lng: 18.3315,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-centar',
    label: 'Centar',
    address: 'Centar, Sarajevo',
    lat: 43.8568,
    lng: 18.4134,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-bcc',
    label: 'BCC',
    address: 'BCC, Sarajevo',
    lat: 43.8565,
    lng: 18.4182,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-otoka',
    label: 'Otoka',
    address: 'Otoka, Sarajevo',
    lat: 43.8477,
    lng: 18.3636,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-vogosca',
    label: 'Vogošća',
    address: 'Vogošća',
    lat: 43.9028,
    lng: 18.3489,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-alipasino',
    label: 'Alipašino Polje',
    address: 'Alipašino Polje, Sarajevo',
    lat: 43.8212,
    lng: 18.3567,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-stup',
    label: 'Stup',
    address: 'Stup, Sarajevo',
    lat: 43.8845,
    lng: 18.3589,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-dobrinja',
    label: 'Dobrinja',
    address: 'Dobrinja, Sarajevo',
    lat: 43.8281,
    lng: 18.3512,
    zoneId: ZONE_SARAJEVO,
  },
  {
    id: 'loc-kosevo',
    label: 'Koševo',
    address: 'Koševo, Sarajevo',
    lat: 43.8682,
    lng: 18.4138,
    zoneId: ZONE_SARAJEVO,
  },
]

export function cloneLocation(id: string): Location {
  const l = MOCK_LOCATIONS.find((x) => x.id === id)
  if (!l) throw new Error(`Unknown location ${id}`)
  return { ...l }
}

function loc(id: string): Location {
  return cloneLocation(id)
}

function seedRouteKey(p: { lat: number; lng: number }, d: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(5)},${p.lng.toFixed(5)}|${d.lat.toFixed(5)},${d.lng.toFixed(5)}`
}

export function simpleRoute(p: Location, d: Location): Array<{ lat: number; lng: number }> {
  const baked = SEED_ROUTES[seedRouteKey(p, d)]
  if (baked) return baked.routePoints.map((pt) => ({ lat: pt.lat, lng: pt.lng }))
  const pts: Array<{ lat: number; lng: number }> = []
  const n = 20
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push({
      lat: p.lat + (d.lat - p.lat) * t,
      lng: p.lng + (d.lng - p.lng) * t,
    })
  }
  return pts
}

primeRoadRouteCache(
  Object.values(SEED_ROUTES).map((entry) => ({
    from: entry.from,
    to: entry.to,
    routePoints: entry.routePoints,
    distanceKm: entry.distanceKm,
    durationMin: entry.durationMin,
  })),
)

const DEMO_USER_ID = 'acc-demo-lejla'
const DEMO_PROFILE_ID = 'prof-demo-lejla'

const demoUser: UserAccount = {
  id: DEMO_USER_ID,
  role: 'putnik',
  email: 'korisnik@urbanflow.ba',
  phone: '+38761111222',
  passwordPlain: 'Test12345',
  status: 'aktivan',
  createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
  lastLoginAt: new Date().toISOString(),
  verifiedAt: new Date(Date.now() - 86400000 * 119).toISOString(),
}

/** Prijava za demo putnika (isti podaci kao u mock bazi). */
export const DEMO_PASSENGER_EMAIL = demoUser.email
export const DEMO_PASSENGER_PASSWORD = demoUser.passwordPlain

const demoProfile: PassengerProfile = {
  id: DEMO_PROFILE_ID,
  accountId: DEMO_USER_ID,
  firstName: 'Lejla',
  lastName: 'Hasanović',
  registeredAt: demoUser.createdAt,
}

const vehicles: Vehicle[] = [
  {
    id: 'veh-1',
    registration: 'K12-M-458',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2021,
    color: 'Siva',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-2',
    registration: 'M44-T-902',
    brand: 'Škoda',
    model: 'Octavia',
    year: 2020,
    color: 'Crna',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-3',
    registration: 'J88-A-321',
    brand: 'VW',
    model: 'Golf',
    year: 2019,
    color: 'Bijela',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-4',
    registration: 'A77-K-190',
    brand: 'Renault',
    model: 'Megane',
    year: 2018,
    color: 'Plava',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-5',
    registration: 'S22-B-441',
    brand: 'Toyota',
    model: 'Yaris',
    year: 2022,
    color: 'Siva',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-6',
    registration: 'H55-C-778',
    brand: 'Hyundai',
    model: 'i30',
    year: 2021,
    color: 'Crna',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-7',
    registration: 'F33-D-902',
    brand: 'Ford',
    model: 'Focus',
    year: 2020,
    color: 'Bijela',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
  {
    id: 'veh-8',
    registration: 'P11-E-215',
    brand: 'Peugeot',
    model: '308',
    year: 2019,
    color: 'Srebrna',
    seatCount: 4,
    type: 'limuzina',
    status: 'dostupno',
  },
]

const drivers: Driver[] = [
  {
    id: 'drv-amar',
    firstName: 'Amir',
    lastName: 'K.',
    avatarUrl: driverAvatarAmir,
    phone: '+38761111333',
    licenseNumber: 'LIC-2026-001',
    availabilityStatus: 'dostupan',
    rating: 4.9,
    totalRatings: 210,
    currentLocation: { lat: 43.8585, lng: 18.4305 },
    vehicleId: 'veh-1',
  },
  {
    id: 'drv-nermin',
    firstName: 'Nermin',
    lastName: 'H.',
    avatarUrl: driverAvatarNermin,
    phone: '+38761110002',
    licenseNumber: 'BH-DRV-002',
    availabilityStatus: 'zauzet',
    rating: 4.8,
    totalRatings: 156,
    currentLocation: { lat: 43.856, lng: 18.404 },
    vehicleId: 'veh-2',
  },
  {
    id: 'drv-eldar',
    firstName: 'Eldar',
    lastName: 'S.',
    avatarUrl: driverAvatarEldar,
    phone: '+38761110003',
    licenseNumber: 'BH-DRV-003',
    availabilityStatus: 'dostupan',
    rating: 4.7,
    totalRatings: 98,
    currentLocation: { lat: 43.8495, lng: 18.3885 },
    vehicleId: 'veh-3',
  },
  {
    id: 'drv-mirza',
    firstName: 'Mirza',
    lastName: 'P.',
    avatarUrl: driverAvatarMirza,
    phone: '+38761110004',
    licenseNumber: 'BH-DRV-004',
    availabilityStatus: 'van_funkcije',
    rating: 4.6,
    totalRatings: 74,
    currentLocation: { lat: 43.852, lng: 18.395 },
    vehicleId: 'veh-4',
  },
  {
    id: 'drv-senad',
    firstName: 'Senad',
    lastName: 'B.',
    avatarUrl: driverAvatarNermin,
    phone: '+38761110005',
    licenseNumber: 'BH-DRV-005',
    availabilityStatus: 'dostupan',
    rating: 4.85,
    totalRatings: 132,
    currentLocation: { lat: 43.8625, lng: 18.418 },
    vehicleId: 'veh-5',
  },
  {
    id: 'drv-ajla',
    firstName: 'Ajla',
    lastName: 'R.',
    avatarUrl: driverAvatarEldar,
    phone: '+38761110006',
    licenseNumber: 'BH-DRV-006',
    availabilityStatus: 'dostupan',
    rating: 4.92,
    totalRatings: 188,
    currentLocation: { lat: 43.8548, lng: 18.401 },
    vehicleId: 'veh-6',
  },
  {
    id: 'drv-haris',
    firstName: 'Haris',
    lastName: 'T.',
    avatarUrl: driverAvatarAmir,
    phone: '+38761110007',
    licenseNumber: 'BH-DRV-007',
    availabilityStatus: 'dostupan',
    rating: 4.75,
    totalRatings: 91,
    currentLocation: { lat: 43.8478, lng: 18.392 },
    vehicleId: 'veh-7',
  },
  {
    id: 'drv-emina',
    firstName: 'Emina',
    lastName: 'K.',
    avatarUrl: driverAvatarMirza,
    phone: '+38761110008',
    licenseNumber: 'BH-DRV-008',
    availabilityStatus: 'dostupan',
    rating: 4.88,
    totalRatings: 145,
    currentLocation: { lat: 43.8512, lng: 18.425 },
    vehicleId: 'veh-8',
  },
]

const ride1Pickup = loc('loc-bascarsija')
const ride1Dest = loc('loc-marijin')
const ride1Route = simpleRoute(ride1Pickup, ride1Dest)

const ridePast1: Ride = {
  id: 'ride-seed-1',
  requestId: 'req-seed-1',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-amar',
  vehicleId: 'veh-1',
  status: 'zavrsena',
  orderType: 'odmah',
  pickup: ride1Pickup,
  destination: ride1Dest,
  routePoints: ride1Route,
  estimatedPrice: 9.2,
  finalPrice: 9.2,
  distanceKm: 3.1,
  estimatedDurationMin: 8,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  assignedAt: new Date(Date.now() - 86400000 * 5 + 3000).toISOString(),
  driverArrivedAt: new Date(Date.now() - 86400000 * 5 + 600000).toISOString(),
  startedAt: new Date(Date.now() - 86400000 * 5 + 610000).toISOString(),
  finishedAt: new Date(Date.now() - 86400000 * 5 + 900000).toISOString(),
}

const ridePast2Pickup = loc('loc-grbavica')
const ridePast2Dest = loc('loc-airport')
const ridePast2Route = simpleRoute(ridePast2Pickup, ridePast2Dest)

const ridePast2Started = new Date(Date.now() - 86400000 * 12 + 510000).toISOString()

const ridePast2: Ride = {
  id: 'ride-seed-2',
  requestId: 'req-seed-2',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-nermin',
  vehicleId: 'veh-2',
  status: 'zavrsena',
  orderType: 'zakazano',
  scheduledAt: new Date(Date.now() - 86400000 * 12 + 180000).toISOString(),
  pickup: ridePast2Pickup,
  destination: ridePast2Dest,
  routePoints: ridePast2Route,
  estimatedPrice: 18.5,
  finalPrice: 18.5,
  distanceKm: 8.4,
  estimatedDurationMin: 18,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  assignedAt: new Date(Date.now() - 86400000 * 12 + 2000).toISOString(),
  driverArrivedAt: new Date(Date.now() - 86400000 * 12 + 500000).toISOString(),
  startedAt: ridePast2Started,
  finishedAt: new Date(Date.now() - 86400000 * 12 + 800000).toISOString(),
}

const ridePast3Pickup = loc('loc-ilidza')
const ridePast3Dest = loc('loc-centar')
const ridePast3Route = simpleRoute(ridePast3Pickup, ridePast3Dest)

const ridePast3: Ride = {
  id: 'ride-seed-3',
  requestId: 'req-seed-3',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-eldar',
  vehicleId: 'veh-3',
  status: 'zavrsena',
  orderType: 'odmah',
  pickup: ridePast3Pickup,
  destination: ridePast3Dest,
  routePoints: ridePast3Route,
  estimatedPrice: 11.8,
  finalPrice: 11.8,
  distanceKm: 5.2,
  estimatedDurationMin: 12,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  assignedAt: new Date(Date.now() - 86400000 * 2 + 2500).toISOString(),
  driverArrivedAt: new Date(Date.now() - 86400000 * 2 + 400000).toISOString(),
  startedAt: new Date(Date.now() - 86400000 * 2 + 410000).toISOString(),
  finishedAt: new Date(Date.now() - 86400000 * 2 + 700000).toISOString(),
}

const ridePast4Pickup = loc('loc-otoka')
const ridePast4Dest = loc('loc-vogosca')
const ridePast4Route = simpleRoute(ridePast4Pickup, ridePast4Dest)

const ridePast4: Ride = {
  id: 'ride-seed-4',
  requestId: 'req-seed-4',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-amar',
  vehicleId: 'veh-1',
  status: 'otkazana',
  orderType: 'odmah',
  pickup: ridePast4Pickup,
  destination: ridePast4Dest,
  routePoints: ridePast4Route,
  estimatedPrice: 12.4,
  distanceKm: 6.5,
  estimatedDurationMin: 14,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  cancelledAt: new Date(Date.now() - 86400000 * 20 + 120000).toISOString(),
  cancellationReason: 'Putnik otkazao',
}

const ridePast5Pickup = loc('loc-centar')
const ridePast5Dest = loc('loc-stup')
const ridePast5Route = simpleRoute(ridePast5Pickup, ridePast5Dest)

const ridePast5: Ride = {
  id: 'ride-seed-5',
  requestId: 'req-seed-5',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-nermin',
  vehicleId: 'veh-2',
  status: 'zavrsena',
  orderType: 'odmah',
  pickup: ridePast5Pickup,
  destination: ridePast5Dest,
  routePoints: ridePast5Route,
  estimatedPrice: 10.5,
  finalPrice: 10.5,
  distanceKm: 4.8,
  estimatedDurationMin: 11,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  assignedAt: new Date(Date.now() - 86400000 * 8 + 3000).toISOString(),
  driverArrivedAt: new Date(Date.now() - 86400000 * 8 + 400000).toISOString(),
  startedAt: new Date(Date.now() - 86400000 * 8 + 410000).toISOString(),
  finishedAt: new Date(Date.now() - 86400000 * 8 + 650000).toISOString(),
}

const ridePast6Pickup = loc('loc-kosevo')
const ridePast6Dest = loc('loc-centar')
const ridePast6Route = simpleRoute(ridePast6Pickup, ridePast6Dest)
const ridePast6Started = new Date(Date.now() - 86400000 * 30 + 720000).toISOString()

const ridePast6: Ride = {
  id: 'ride-seed-6',
  requestId: 'req-seed-6',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-amar',
  vehicleId: 'veh-1',
  status: 'zavrsena',
  orderType: 'zakazano',
  scheduledAt: new Date(Date.now() - 86400000 * 30 + 360000).toISOString(),
  pickup: ridePast6Pickup,
  destination: ridePast6Dest,
  routePoints: ridePast6Route,
  estimatedPrice: 8.4,
  finalPrice: 8.4,
  distanceKm: 2.8,
  estimatedDurationMin: 9,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 31).toISOString(),
  assignedAt: new Date(Date.now() - 86400000 * 30 + 2500).toISOString(),
  driverArrivedAt: new Date(Date.now() - 86400000 * 30 + 600000).toISOString(),
  startedAt: ridePast6Started,
  finishedAt: new Date(Date.now() - 86400000 * 30 + 900000).toISOString(),
}

const ridePast7Pickup = loc('loc-dobrinja')
const ridePast7Dest = loc('loc-kosevo')
const ridePast7Route = simpleRoute(ridePast7Pickup, ridePast7Dest)

const ridePast7: Ride = {
  id: 'ride-seed-7',
  requestId: 'req-seed-7',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-eldar',
  vehicleId: 'veh-3',
  status: 'neuspjesna',
  orderType: 'odmah',
  pickup: ridePast7Pickup,
  destination: ridePast7Dest,
  routePoints: ridePast7Route,
  estimatedPrice: 14.6,
  distanceKm: 7.3,
  estimatedDurationMin: 16,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 16).toISOString(),
  cancelledAt: new Date(Date.now() - 86400000 * 16 + 180000).toISOString(),
  cancellationReason: 'Vozač nije uspio pronaći putnika',
}

const ridePast8Pickup = loc('loc-alipasino')
const ridePast8Dest = loc('loc-bascarsija')
const ridePast8Route = simpleRoute(ridePast8Pickup, ridePast8Dest)

const ridePast8: Ride = {
  id: 'ride-seed-8',
  requestId: 'req-seed-8',
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-nermin',
  vehicleId: 'veh-2',
  status: 'otkazana',
  orderType: 'zakazano',
  scheduledAt: new Date(Date.now() - 86400000 * 4 + 3600000).toISOString(),
  pickup: ridePast8Pickup,
  destination: ridePast8Dest,
  routePoints: ridePast8Route,
  estimatedPrice: 13.9,
  distanceKm: 6.2,
  estimatedDurationMin: 15,
  paymentMethod: 'gotovina',
  createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  cancelledAt: new Date(Date.now() - 86400000 * 4 + 1200000).toISOString(),
  cancellationReason: 'Zakazanu vožnju otkazao putnik',
}

const scheduledReq1Pickup = loc('loc-bcc')
const scheduledReq1Dest = loc('loc-airport')
const scheduledReq2Pickup = loc('loc-marijin')
const scheduledReq2Dest = loc('loc-vogosca')
const demoScheduledRequests = [
  {
    id: 'req-seed-scheduled-1',
    passengerId: DEMO_PROFILE_ID,
    pickup: scheduledReq1Pickup,
    destination: scheduledReq1Dest,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    orderType: 'zakazano' as const,
    scheduledAt: new Date(Date.now() + 86400000 * 1 + 3600000).toISOString(),
    estimatedPrice: 19.4,
    estimatedDurationMin: 24,
    estimatedEtaMin: 24,
    distanceKm: 11.8,
    status: 'kreiran' as const,
  },
  {
    id: 'req-seed-scheduled-2',
    passengerId: DEMO_PROFILE_ID,
    pickup: scheduledReq2Pickup,
    destination: scheduledReq2Dest,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    orderType: 'zakazano' as const,
    scheduledAt: new Date(Date.now() + 86400000 * 2 + 5400000).toISOString(),
    estimatedPrice: 16.1,
    estimatedDurationMin: 20,
    estimatedEtaMin: 20,
    distanceKm: 9.7,
    status: 'u_obradi' as const,
  },
  {
    id: 'req-seed-scheduled-3',
    passengerId: DEMO_PROFILE_ID,
    pickup: loc('loc-kosevo'),
    destination: loc('loc-dobrinja'),
    createdAt: new Date(Date.now() - 900000).toISOString(),
    orderType: 'odmah' as const,
    estimatedPrice: 9.8,
    estimatedDurationMin: 14,
    estimatedEtaMin: 6,
    distanceKm: 5.4,
    status: 'u_obradi' as const,
  },
]

const dispatchAssignedPickup = loc('loc-ilidza')
const dispatchAssignedDest = loc('loc-centar')
const dispatchAssignedRoute = simpleRoute(dispatchAssignedPickup, dispatchAssignedDest)

const dispatchAssignedRequest = {
  id: 'req-dispatch-assigned-1',
  passengerId: DEMO_PROFILE_ID,
  pickup: dispatchAssignedPickup,
  destination: dispatchAssignedDest,
  createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  orderType: 'odmah' as const,
  estimatedPrice: 11.4,
  estimatedDurationMin: 16,
  estimatedEtaMin: 4,
  distanceKm: 6.2,
  status: 'dodijeljen' as const,
  rideId: 'ride-dispatch-assigned-1',
}

const dispatchAssignedRide: Ride = {
  id: 'ride-dispatch-assigned-1',
  requestId: dispatchAssignedRequest.id,
  passengerId: DEMO_PROFILE_ID,
  driverId: 'drv-eldar',
  vehicleId: 'veh-3',
  status: 'dodijeljena',
  orderType: 'odmah',
  pickup: dispatchAssignedPickup,
  destination: dispatchAssignedDest,
  routePoints: dispatchAssignedRoute,
  estimatedPrice: 11.4,
  distanceKm: 6.2,
  estimatedDurationMin: 16,
  paymentMethod: 'gotovina',
  createdAt: dispatchAssignedRequest.createdAt,
  assignedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  driverLat: 43.8495,
  driverLng: 18.3885,
}

const demoPassengerRides = [ridePast1, ridePast2, ridePast3, ridePast4, ridePast5, ridePast6, ridePast7, ridePast8]

const ratings: Rating[] = [
  {
    id: 'rat-1',
    rideId: 'ride-seed-1',
    driverId: 'drv-amar',
    passengerId: DEMO_PROFILE_ID,
    stars: 5,
    comment: 'Odličan vozač, preporuka!',
    createdAt: new Date(Date.now() - 86400000 * 5 + 950000).toISOString(),
  },
  {
    id: 'rat-2',
    rideId: 'ride-seed-2',
    driverId: 'drv-nermin',
    passengerId: DEMO_PROFILE_ID,
    stars: 4,
    createdAt: new Date(Date.now() - 86400000 * 12 + 850000).toISOString(),
  },
]

const complaints: Complaint[] = [
  {
    id: 'cmp-1',
    rideId: 'ride-seed-5',
    submittedByAccountId: DEMO_USER_ID,
    category: 'kasnjenje',
    description: 'Vozač je kasnio više od 15 minuta.',
    status: 'u_obradi',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
]

const DISPATCH_PHONE_USER_ID = 'acc-dispatch-phone-1'
const DISPATCH_PHONE_PROFILE_ID = 'prof-dispatch-phone-1'

const dispatchPhoneUser: UserAccount = {
  id: DISPATCH_PHONE_USER_ID,
  role: 'putnik',
  email: 'poziv.korisnik@urbanflow.ba',
  phone: '+38761111999',
  passwordPlain: 'Test12345',
  status: 'aktivan',
  createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  verifiedAt: new Date(Date.now() - 1000 * 60 * 74).toISOString(),
}

const dispatchPhoneProfile: PassengerProfile = {
  id: DISPATCH_PHONE_PROFILE_ID,
  accountId: DISPATCH_PHONE_USER_ID,
  firstName: 'Telefon',
  lastName: 'Poziv',
  registeredAt: dispatchPhoneUser.createdAt,
}

const dispatchActivePickup = loc('loc-bascarsija')
const dispatchActiveDest = loc('loc-airport')
const dispatchActiveRoute = simpleRoute(dispatchActivePickup, dispatchActiveDest)

const dispatchActiveRequest = {
  id: 'req-dispatch-active-1',
  passengerId: DISPATCH_PHONE_PROFILE_ID,
  pickup: dispatchActivePickup,
  destination: dispatchActiveDest,
  createdAt: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
  orderType: 'odmah' as const,
  estimatedPrice: 18.5,
  estimatedDurationMin: 22,
  estimatedEtaMin: 5,
  distanceKm: 12.6,
  status: 'dodijeljen' as const,
  rideId: 'ride-dispatch-active-1',
}

const dispatchActiveRide: Ride = {
  id: 'ride-dispatch-active-1',
  requestId: dispatchActiveRequest.id,
  passengerId: DISPATCH_PHONE_PROFILE_ID,
  driverId: 'drv-nermin',
  vehicleId: 'veh-2',
  status: 'vozac_na_putu',
  orderType: 'odmah',
  pickup: dispatchActivePickup,
  destination: dispatchActiveDest,
  routePoints: dispatchActiveRoute,
  estimatedPrice: 18.5,
  distanceKm: 12.6,
  estimatedDurationMin: 22,
  paymentMethod: 'gotovina',
  createdAt: dispatchActiveRequest.createdAt,
  assignedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  driverLat: 43.856,
  driverLng: 18.404,
}

export const DEMO_DRIVER_ACCOUNT_ID = 'acc-driver-demo-1'
export const DEMO_DRIVER_PROFILE_ID = 'driver-demo-1'

const demoDriverUser: UserAccount = {
  id: DEMO_DRIVER_ACCOUNT_ID,
  role: 'vozac',
  email: 'vozac@urbanflow.ba',
  phone: '+38761111333',
  passwordPlain: 'Test12345',
  status: 'aktivan',
  createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  lastLoginAt: new Date().toISOString(),
  verifiedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
}

const demoDriverProfile: DriverUserProfile = {
  id: DEMO_DRIVER_PROFILE_ID,
  accountId: DEMO_DRIVER_ACCOUNT_ID,
  linkedDriverId: 'drv-amar',
  firstName: 'Amir',
  lastName: 'K.',
  fullName: 'Amir K.',
  email: 'vozac@urbanflow.ba',
  phone: '+38761111333',
  licenseNumber: 'LIC-2026-001',
  licenseStatus: 'validna',
  rating: 4.9,
  totalRides: 1284,
  vehicle: {
    model: 'Toyota Corolla',
    color: 'Siva',
    plate: 'K12-M-458',
    status: 'dostupno',
  },
  registeredAt: demoDriverUser.createdAt,
}

export const DEMO_DRIVER_EMAIL = demoDriverUser.email
export const DEMO_DRIVER_PASSWORD = demoDriverUser.passwordPlain

export const DEMO_DISPATCHER_ACCOUNT_ID = 'acc-dispatcher-demo-1'
export const DEMO_DISPATCHER_PROFILE_ID = 'dispatcher-demo-1'

const demoDispatcherUser: UserAccount = {
  id: DEMO_DISPATCHER_ACCOUNT_ID,
  role: 'dispecer',
  email: 'dispecer@urbanflow.ba',
  phone: '+38761111444',
  passwordPlain: 'Test12345',
  status: 'aktivan',
  createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
  lastLoginAt: new Date().toISOString(),
  verifiedAt: new Date(Date.now() - 86400000 * 39).toISOString(),
}

const demoDispatcherProfile: DispatcherProfile = {
  id: DEMO_DISPATCHER_PROFILE_ID,
  accountId: DEMO_DISPATCHER_ACCOUNT_ID,
  firstName: 'Amina',
  lastName: 'D.',
  fullName: 'Amina D.',
  email: demoDispatcherUser.email,
  phone: demoDispatcherUser.phone,
  roleLevel: 'sef_smjene',
  shiftName: 'Dnevna smjena',
  registeredAt: demoDispatcherUser.createdAt,
}

export const DEMO_DISPATCHER_EMAIL = demoDispatcherUser.email
export const DEMO_DISPATCHER_PASSWORD = demoDispatcherUser.passwordPlain

function createDefaultDispatchLogs(): DispatchLog[] {
  const now = Date.now()
  return [
    {
      id: 'dispatch-log-seed-1',
      createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      dispatcherAccountId: DEMO_DISPATCHER_ACCOUNT_ID,
      kind: 'system',
      message: 'Dispečerski panel spreman. Praćenje aktivnih vozila uključeno.',
    },
    {
      id: 'dispatch-log-seed-2',
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
      dispatcherAccountId: DEMO_DISPATCHER_ACCOUNT_ID,
      kind: 'anomaly',
      message: 'Sistem detektovao vozilo van funkcije: Mirza P.',
      driverId: 'drv-mirza',
    },
    {
      id: 'dispatch-log-seed-3',
      createdAt: new Date(now - 1000 * 60 * 7).toISOString(),
      dispatcherAccountId: DEMO_DISPATCHER_ACCOUNT_ID,
      kind: 'complaint',
      message: 'Reklamacija u obradi: kašnjenje na vožnji ride-seed-5.',
      rideId: 'ride-seed-5',
      complaintId: 'cmp-1',
    },
    {
      id: 'dispatch-log-seed-reassign-1',
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      dispatcherAccountId: DEMO_DISPATCHER_ACCOUNT_ID,
      kind: 'ride',
      message: 'Preraspodjela vožnje na vozača Kenan H.',
      rideId: 'ride-seed-2',
      requestId: 'req-seed-2',
      driverId: 'drv-kenan',
      meta: { action: 'reassign', previousDriverId: 'drv-mirza', newDriverId: 'drv-kenan' },
    },
    {
      id: 'dispatch-log-seed-reassign-2',
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      dispatcherAccountId: DEMO_DISPATCHER_ACCOUNT_ID,
      kind: 'ride',
      message: 'Preraspodjela vožnje na vozača Mirza P.',
      rideId: 'ride-seed-4',
      requestId: 'req-seed-4',
      driverId: 'drv-mirza',
      meta: { action: 'reassign', previousDriverId: 'drv-kenan', newDriverId: 'drv-mirza' },
    },
  ]
}

export function createDefaultDriverUi(): DriverUiState {
  const t0 = Date.now()
  const history: DriverHistoryItem[] = [
    {
      id: 'dhist-1',
      date: new Date(t0 - 86400000 * 1).toISOString(),
      pickupLabel: 'Marijin Dvor',
      destinationLabel: 'Grbavica',
      passengerName: 'Emina S.',
      status: 'zavrsena',
      earningsBam: 6.5,
      paymentMethod: 'gotovina',
      rating: 5,
      routeDistanceKm: 2.4,
      durationMin: 9,
    },
    {
      id: 'dhist-2',
      date: new Date(t0 - 86400000 * 3).toISOString(),
      pickupLabel: 'Baščaršija',
      destinationLabel: 'Otoka',
      passengerName: 'Tarik M.',
      status: 'zavrsena',
      earningsBam: 11.2,
      paymentMethod: 'gotovina',
      rating: 4,
      routeDistanceKm: 5.1,
      durationMin: 14,
    },
    {
      id: 'dhist-3',
      date: new Date(t0 - 86400000 * 5).toISOString(),
      pickupLabel: 'BCC',
      destinationLabel: 'Aerodrom Sarajevo',
      passengerName: 'Selma R.',
      status: 'zavrsena',
      earningsBam: 19.8,
      paymentMethod: 'gotovina',
      rating: 5,
      routeDistanceKm: 12.6,
      durationMin: 24,
    },
    {
      id: 'dhist-4',
      date: new Date(t0 - 86400000 * 7).toISOString(),
      pickupLabel: 'Grbavica',
      destinationLabel: 'Centar',
      passengerName: 'Adnan K.',
      status: 'otkazana',
      earningsBam: 0,
      paymentMethod: 'gotovina',
      routeDistanceKm: 3.2,
      cancellationReason: 'Putnik otkazao',
    },
    {
      id: 'dhist-5',
      date: new Date(t0 - 86400000 * 9).toISOString(),
      pickupLabel: 'Ilidža',
      destinationLabel: 'Marijin Dvor',
      passengerName: 'Ivana P.',
      status: 'problem',
      earningsBam: 4.0,
      paymentMethod: 'gotovina',
      problemType: 'GPS problem',
      routeDistanceKm: 8.9,
      durationMin: 18,
    },
    {
      id: 'dhist-6',
      date: new Date(t0 - 86400000 * 14).toISOString(),
      pickupLabel: 'Otoka',
      destinationLabel: 'Baščaršija',
      passengerName: 'Haris B.',
      status: 'zavrsena',
      earningsBam: 9.4,
      paymentMethod: 'gotovina',
      rating: 4,
      routeDistanceKm: 4.5,
      durationMin: 12,
    },
    {
      id: 'dhist-7',
      date: new Date(t0 - 86400000 * 21).toISOString(),
      pickupLabel: 'Koševo',
      destinationLabel: 'BCC',
      passengerName: 'Maida F.',
      status: 'neuspjesna',
      earningsBam: 0,
      paymentMethod: 'gotovina',
      routeDistanceKm: 4.0,
      cancellationReason: 'Neispravna adresa',
    },
    {
      id: 'dhist-8',
      date: new Date(t0 - 86400000 * 28).toISOString(),
      pickupLabel: 'Aerodrom Sarajevo',
      destinationLabel: 'Marijin Dvor',
      passengerName: 'Vedad L.',
      status: 'zavrsena',
      earningsBam: 17.5,
      paymentMethod: 'gotovina',
      rating: 5,
      routeDistanceKm: 11.0,
      durationMin: 22,
    },
  ]
  const activityLog = [
    {
      id: 'dlog-seed-1',
      createdAt: new Date(t0 - 1000 * 60 * 45).toISOString(),
      kind: 'smjena' as const,
      message: 'Smjena započeta. GPS lokacija evidentirana.',
      meta: { lokacija: 'Sarajevo (Centar)' },
    },
    {
      id: 'dlog-seed-2',
      createdAt: new Date(t0 - 1000 * 60 * 39).toISOString(),
      kind: 'zahtjev' as const,
      message: 'Novi zahtjev za vožnju primljen.',
      meta: { zahtjevId: 'req-seed-driver-1' },
    },
    {
      id: 'dlog-seed-3',
      createdAt: new Date(t0 - 1000 * 60 * 37).toISOString(),
      kind: 'vožnja' as const,
      message: 'Vožnja prihvaćena.',
      meta: { vožnjaId: 'ride-seed-driver-1' },
    },
    {
      id: 'dlog-seed-4',
      createdAt: new Date(t0 - 1000 * 60 * 24).toISOString(),
      kind: 'vožnja' as const,
      message: 'Vožnja završena.',
      meta: { vožnjaId: 'ride-seed-driver-1' },
    },
    {
      id: 'dlog-seed-5',
      createdAt: new Date(t0 - 1000 * 60 * 18).toISOString(),
      kind: 'zahtjev' as const,
      message: 'Novi zahtjev za vožnju primljen.',
      meta: { zahtjevId: 'req-seed-driver-2' },
    },
    {
      id: 'dlog-seed-6',
      createdAt: new Date(t0 - 1000 * 60 * 6).toISOString(),
      kind: 'status_vozaca' as const,
      message: 'Status promijenjen: Dostupan.',
    },
  ]

  return {
    availabilityStatus: 'van_smjene',
    gpsPermissionSimulated: false,
    pendingRequest: null,
    activeRide: null,
    history,
    activityLog,
    ridesToday: 2,
    earningsTodayBam: 27.3,
    fuelPercent: 72,
    acceptanceRatePercent: 94,
    totalUnjustifiedCancels: 0,
    adminWarningSent: false,
    flags: {},
    shiftClock: {
      totalActiveSecondsToday: 0,
      pausesToday: 0,
      hasStartedToday: false,
    },
    vehicleUi: {
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
    },
    settings: {
      notificationsEnabled: true,
      gpsConsent: true,
      shareLocationDuringShift: true,
      shareLocationWithDispatcher: true,
      lastGpsReadAt: new Date(t0 - 120000).toISOString(),
      lastKnownLocationLabel: 'Sarajevo (Centar)',
    },
  }
}

/** Migracija / dopuna mock baze za vozački modul */
export function ensureDriverData(db: MockDatabase): boolean {
  let changed = false
  if (!Array.isArray(db.driverProfiles)) {
    db.driverProfiles = []
    changed = true
  }
  if (!db.driverUiByAccountId || typeof db.driverUiByAccountId !== 'object') {
    db.driverUiByAccountId = {}
    changed = true
  }
  if (!db.users.some((u) => u.id === DEMO_DRIVER_ACCOUNT_ID)) {
    db.users.push({ ...demoDriverUser })
    db.driverProfiles.push({ ...demoDriverProfile })
    db.driverUiByAccountId[DEMO_DRIVER_ACCOUNT_ID] = createDefaultDriverUi()
    changed = true
  } else if (!db.driverUiByAccountId[DEMO_DRIVER_ACCOUNT_ID]) {
    db.driverUiByAccountId[DEMO_DRIVER_ACCOUNT_ID] = createDefaultDriverUi()
    changed = true
  }
  if (!db.driverProfiles.some((p) => p.accountId === DEMO_DRIVER_ACCOUNT_ID)) {
    db.driverProfiles.push({ ...demoDriverProfile })
    changed = true
  }
  const demoDriverUi = db.driverUiByAccountId[DEMO_DRIVER_ACCOUNT_ID]
  if (demoDriverUi) {
    if (!Array.isArray(demoDriverUi.history) || demoDriverUi.history.length < 6) {
      demoDriverUi.history = createDefaultDriverUi().history
      changed = true
    }
    if (!Array.isArray(demoDriverUi.activityLog) || demoDriverUi.activityLog.length < 4) {
      demoDriverUi.activityLog = createDefaultDriverUi().activityLog
      changed = true
    }
    if ((demoDriverUi.ridesToday ?? 0) <= 0 && !demoDriverUi.activeRide) {
      demoDriverUi.ridesToday = 2
      changed = true
    }
    if ((demoDriverUi.earningsTodayBam ?? 0) <= 0 && !demoDriverUi.activeRide) {
      demoDriverUi.earningsTodayBam = 27.3
      changed = true
    }
  }
  if (db.version < 2) {
    db.version = 2
    changed = true
  }
  const amir = db.drivers.find((d) => d.id === 'drv-amar')
  if (amir && amir.firstName !== 'Amir') {
    amir.firstName = 'Amir'
    amir.lastName = 'K.'
    amir.phone = '+38761111333'
    amir.licenseNumber = 'LIC-2026-001'
    changed = true
  }
  if (!db.passengerDemoHistoryCleared) {
    for (const req of demoScheduledRequests) {
      if (!db.rideRequests.some((r) => r.id === req.id)) {
        db.rideRequests.push(structuredClone(req))
        changed = true
      }
    }
    for (const ride of demoPassengerRides) {
      if (!db.rides.some((r) => r.id === ride.id)) {
        db.rides.push(structuredClone(ride))
        changed = true
      }
    }
  }
  const avatarByDriverId: Record<string, string> = {
    'drv-amar': driverAvatarAmir,
    'drv-nermin': driverAvatarNermin,
    'drv-eldar': driverAvatarEldar,
    'drv-mirza': driverAvatarMirza,
    'drv-senad': driverAvatarNermin,
    'drv-ajla': driverAvatarEldar,
    'drv-haris': driverAvatarAmir,
    'drv-emina': driverAvatarMirza,
  }
  for (const driver of db.drivers) {
    const seededAvatar = avatarByDriverId[driver.id]
    if (!seededAvatar) continue
    /** Ne prepisuj odobrene uploadane slike (data URL). */
    if (driver.avatarUrl?.startsWith('data:')) continue
    if (driver.avatarUrl !== seededAvatar) {
      driver.avatarUrl = seededAvatar
      changed = true
    }
  }
  if (!Array.isArray(db.driverAvatarPendingRequests)) {
    db.driverAvatarPendingRequests = []
    changed = true
  }
  return changed
}

/** Migracija / dopuna mock baze za dispečerski modul */
export function ensureDispatchData(db: MockDatabase): boolean {
  let changed = false
  if (db.version < 3) {
    db.version = 3
    changed = true
  }
  if (!Array.isArray(db.dispatcherProfiles)) {
    db.dispatcherProfiles = []
    changed = true
  }
  if (!Array.isArray(db.dispatchLogs)) {
    db.dispatchLogs = createDefaultDispatchLogs()
    changed = true
  }
  if (!Array.isArray(db.dispatchAcknowledgedAnomalyIds)) {
    db.dispatchAcknowledgedAnomalyIds = []
    changed = true
  }
  if (!db.users.some((u) => u.id === DEMO_DISPATCHER_ACCOUNT_ID)) {
    db.users.push({ ...demoDispatcherUser })
    changed = true
  }
  const dispatcherUser = db.users.find((u) => u.id === DEMO_DISPATCHER_ACCOUNT_ID)
  if (dispatcherUser && dispatcherUser.role !== 'dispecer') {
    dispatcherUser.role = 'dispecer'
    changed = true
  }
  if (!db.dispatcherProfiles.some((p) => p.accountId === DEMO_DISPATCHER_ACCOUNT_ID)) {
    db.dispatcherProfiles.push({ ...demoDispatcherProfile })
    changed = true
  }
  if (!db.users.some((u) => u.id === DISPATCH_PHONE_USER_ID)) {
    db.users.push({ ...dispatchPhoneUser })
    changed = true
  }
  if (!db.profiles.some((p) => p.id === DISPATCH_PHONE_PROFILE_ID)) {
    db.profiles.push({ ...dispatchPhoneProfile })
    changed = true
  }
  if (!db.rideRequests.some((r) => r.id === dispatchActiveRequest.id)) {
    db.rideRequests.push(structuredClone(dispatchActiveRequest))
    changed = true
  }
  if (!db.rides.some((r) => r.id === dispatchActiveRide.id)) {
    db.rides.push(structuredClone(dispatchActiveRide))
    changed = true
  }
  if (!db.rideRequests.some((r) => r.id === dispatchAssignedRequest.id)) {
    db.rideRequests.push(structuredClone(dispatchAssignedRequest))
    changed = true
  }
  if (!db.rides.some((r) => r.id === dispatchAssignedRide.id)) {
    db.rides.push(structuredClone(dispatchAssignedRide))
    changed = true
  }
  const nermin = db.drivers.find((d) => d.id === dispatchActiveRide.driverId)
  if (nermin && nermin.availabilityStatus === 'dostupan') {
    nermin.availabilityStatus = 'zauzet'
    changed = true
  }
  const eldar = db.drivers.find((d) => d.id === dispatchAssignedRide.driverId)
  if (eldar && eldar.availabilityStatus === 'dostupan') {
    eldar.availabilityStatus = 'zauzet'
    changed = true
  }
  const scheduled3 = db.rideRequests.find((r) => r.id === 'req-seed-scheduled-3')
  if (scheduled3 && scheduled3.status === 'dodijeljen' && !scheduled3.rideId) {
    scheduled3.status = 'u_obradi'
    scheduled3.pickup = loc('loc-kosevo')
    scheduled3.destination = loc('loc-dobrinja')
    changed = true
  }
  if (db.dispatchLogs.length === 0) {
    db.dispatchLogs = createDefaultDispatchLogs()
    changed = true
  }
  if (db.version < 4) {
    for (const vehicle of vehicles.filter((v) => v.id.startsWith('veh-') && ['veh-5', 'veh-6', 'veh-7', 'veh-8'].includes(v.id))) {
      if (!db.vehicles.some((v) => v.id === vehicle.id)) {
        db.vehicles.push(structuredClone(vehicle))
        changed = true
      }
    }
    for (const driver of drivers.filter((d) =>
      ['drv-senad', 'drv-ajla', 'drv-haris', 'drv-emina'].includes(d.id),
    )) {
      if (!db.drivers.some((d) => d.id === driver.id)) {
        db.drivers.push(structuredClone(driver))
        changed = true
      }
    }
    db.version = 4
    changed = true
  }
  return changed
}

export function createFreshSeed(): MockDatabase {
  return {
    version: 4,
    users: [demoUser, { ...demoDriverUser }, { ...demoDispatcherUser }, { ...dispatchPhoneUser }],
    profiles: [demoProfile, { ...dispatchPhoneProfile }],
    driverProfiles: [{ ...demoDriverProfile }],
    dispatcherProfiles: [{ ...demoDispatcherProfile }],
    driverUiByAccountId: {
      [DEMO_DRIVER_ACCOUNT_ID]: createDefaultDriverUi(),
    },
    drivers: structuredClone(drivers),
    driverAvatarPendingRequests: [],
    vehicles: structuredClone(vehicles),
    rideRequests: [
      ...structuredClone(demoScheduledRequests),
      structuredClone(dispatchActiveRequest),
      structuredClone(dispatchAssignedRequest),
    ],
    rides: [...structuredClone(demoPassengerRides), structuredClone(dispatchActiveRide), structuredClone(dispatchAssignedRide)],
    passengerDemoHistoryCleared: false,
    ratings,
    complaints,
    activityLogs: [],
    dispatchLogs: createDefaultDispatchLogs(),
    dispatchAcknowledgedAnomalyIds: [],
    notifications: [],
    currentUserId: null,
    pendingVerificationAccountIds: [],
  }
}
