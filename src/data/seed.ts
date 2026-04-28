import type {
  Complaint,
  Driver,
  Location,
  MockDatabase,
  PassengerProfile,
  Rating,
  Ride,
  UserAccount,
  Vehicle,
} from '../types/domain'

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

function loc(id: string): Location {
  const l = MOCK_LOCATIONS.find((x) => x.id === id)
  if (!l) throw new Error(`Unknown location ${id}`)
  return { ...l }
}

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
]

const drivers: Driver[] = [
  {
    id: 'drv-amar',
    firstName: 'Amar',
    lastName: 'K.',
    phone: '+38761110001',
    licenseNumber: 'BH-DRV-001',
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
    phone: '+38761110002',
    licenseNumber: 'BH-DRV-002',
    availabilityStatus: 'dostupan',
    rating: 4.8,
    totalRatings: 156,
    currentLocation: { lat: 43.856, lng: 18.404 },
    vehicleId: 'veh-2',
  },
  {
    id: 'drv-eldar',
    firstName: 'Eldar',
    lastName: 'S.',
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
    phone: '+38761110004',
    licenseNumber: 'BH-DRV-004',
    availabilityStatus: 'van_funkcije',
    rating: 4.6,
    totalRatings: 74,
    currentLocation: { lat: 43.852, lng: 18.395 },
    vehicleId: 'veh-4',
  },
]

function simpleRoute(p: Location, d: Location) {
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

export function createFreshSeed(): MockDatabase {
  return {
    version: 1,
    users: [demoUser],
    profiles: [demoProfile],
    drivers: structuredClone(drivers),
    vehicles: structuredClone(vehicles),
    rideRequests: [],
    rides: [ridePast1, ridePast2, ridePast3, ridePast4, ridePast5, ridePast6],
    ratings,
    complaints,
    activityLogs: [],
    notifications: [],
    currentUserId: null,
    pendingVerificationAccountIds: [],
  }
}
