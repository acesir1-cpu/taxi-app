import { MOCK_LOCATIONS, SERVICE_BOUNDS, ZONE_SARAJEVO } from '../data/seed'
import type { Location, RouteEstimate } from '../types/domain'
import { haversineKm } from '../utils/distance'
import { estimatePriceBam } from '../utils/price'
import { estimateDurationMin, interpolateRoute } from '../utils/route'
import { delay } from './delay'

const PHOTON_URL = 'https://photon.komoot.io/api/'
const DEDupe_KM = 0.03
const MIN_CHARS_GEOCODE = 3

type PhotonFeature = {
  type: string
  geometry?: { type: string; coordinates?: number[] }
  properties?: Record<string, string | number | undefined>
}

type PhotonResponse = { features?: PhotonFeature[] }

function photonFeatureToLocation(f: PhotonFeature): Location | null {
  if (f.geometry?.type !== 'Point' || !f.geometry.coordinates || f.geometry.coordinates.length < 2) {
    return null
  }
  const lng = f.geometry.coordinates[0]!
  const lat = f.geometry.coordinates[1]!
  const p = f.properties ?? {}
  const street = typeof p.street === 'string' ? p.street : ''
  const hn = typeof p.housenumber === 'string' ? p.housenumber : ''
  const streetLine = [street, hn].filter(Boolean).join(' ')
  const name = typeof p.name === 'string' ? p.name : ''
  const label = streetLine || name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  const city = (typeof p.city === 'string' ? p.city : '') || (typeof p.district === 'string' ? p.district : '')
  const postcode = typeof p.postcode === 'string' ? p.postcode : ''
  const country = typeof p.country === 'string' ? p.country : ''
  const address = [streetLine || name, postcode, city, country].filter(Boolean).join(', ') || label
  const osm = p.osm_id
  const id =
    osm != null && String(osm)
      ? `photon-osm-${osm}`
      : `photon-${lng.toFixed(5)}-${lat.toFixed(5)}`
  return { id, label, address, lat, lng, zoneId: ZONE_SARAJEVO }
}

async function photonSearchAddresses(trimmed: string, signal?: AbortSignal): Promise<Location[]> {
  const bbox = `${SERVICE_BOUNDS.minLng},${SERVICE_BOUNDS.minLat},${SERVICE_BOUNDS.maxLng},${SERVICE_BOUNDS.maxLat}`
  const url = `${PHOTON_URL}?${new URLSearchParams({
    q: trimmed,
    limit: '10',
    lang: 'en',
    bbox,
  })}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('photon')
  const data = (await res.json()) as PhotonResponse
  const features = data.features ?? []
  const out: Location[] = []
  for (const f of features) {
    const loc = photonFeatureToLocation(f)
    if (loc) out.push(loc)
  }
  return out
}

function mergeDeduped(primary: Location[], secondary: Location[], max = 12): Location[] {
  const out: Location[] = [...primary]
  for (const s of secondary) {
    if (out.length >= max) break
    if (out.some((o) => haversineKm(o, s) < DEDupe_KM)) continue
    out.push(s)
  }
  return out
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<Location[]> {
  const trimmed = query.trim()
  const q = trimmed.toLowerCase()
  if (!q) {
    await delay(120)
    return MOCK_LOCATIONS.slice(0, 8)
  }
  const local = MOCK_LOCATIONS.filter(
    (l) => l.label.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
  )
  if (trimmed.length < MIN_CHARS_GEOCODE) {
    await delay(120)
    return local.slice(0, 12)
  }
  let remote: Location[] = []
  try {
    remote = await photonSearchAddresses(trimmed, signal)
  } catch {
    remote = []
  }
  await delay(80)
  return mergeDeduped(local, remote, 12)
}

export function isInServiceZone(lat: number, lng: number): boolean {
  return (
    lat >= SERVICE_BOUNDS.minLat &&
    lat <= SERVICE_BOUNDS.maxLat &&
    lng >= SERVICE_BOUNDS.minLng &&
    lng <= SERVICE_BOUNDS.maxLng
  )
}

/** Lokacija iz korisničkog klika na kartu (MVP zona Sarajevo). */
export function createLocationFromMapClick(lat: number, lng: number): Location {
  return {
    id: `map-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    label: `Tačka na mapi (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)} · Sarajevo`,
    lat,
    lng,
    zoneId: ZONE_SARAJEVO,
  }
}

export async function validateLocation(loc: Location): Promise<{ ok: true } | { ok: false; message: string }> {
  await delay(200)
  if (!isInServiceZone(loc.lat, loc.lng)) {
    return { ok: false, message: 'outside' }
  }
  return { ok: true }
}

export async function calculateRoute(
  pickup: Location,
  destination: Location
): Promise<RouteEstimate | { error: string }> {
  await delay()
  const pv = await validateLocation(pickup)
  const dv = await validateLocation(destination)
  if (!pv.ok) return { error: 'outside' }
  if (!dv.ok) return { error: 'outside' }
  const straightKm = haversineKm(pickup, destination)
  if (straightKm < 0.05) return { error: 'same' }
  const routePoints = interpolateRoute(pickup, destination, 28)
  const distanceKm = Math.round(straightKm * 1.15 * 100) / 100
  const durationMin = estimateDurationMin(distanceKm, 32)
  const estimatedPrice = estimatePriceBam(distanceKm, durationMin)
  return {
    distanceKm,
    durationMin,
    routePoints,
    estimatedPrice,
  }
}

export async function estimateEta(
  driverLocation: { lat: number; lng: number },
  pickup: Location
): Promise<number> {
  await delay(150)
  const km = haversineKm(driverLocation, pickup)
  const min = estimateDurationMin(km, 28)
  return Math.max(1, min)
}
