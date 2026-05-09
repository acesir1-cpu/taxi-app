import { haversineKm } from '../utils/distance'

export type DriverZoneConfig = {
  name: string
  lat: number
  lng: number
  /** Meters from zone center */
  radius: number
  baseCount: number
}

export const DRIVER_ZONES: DriverZoneConfig[] = [
  { name: 'Centar', lat: 43.8563, lng: 18.4131, radius: 1500, baseCount: 4 },
  { name: 'Baščaršija', lat: 43.8601, lng: 18.4319, radius: 1000, baseCount: 3 },
  { name: 'Ilidža', lat: 43.8303, lng: 18.3103, radius: 2000, baseCount: 2 },
  { name: 'Grbavica', lat: 43.8489, lng: 18.3919, radius: 1200, baseCount: 3 },
  { name: 'Vogošća', lat: 43.9022, lng: 18.3408, radius: 2000, baseCount: 1 },
  { name: 'Rural/Edge', lat: 0, lng: 0, radius: 99999, baseCount: 0 },
]

export const SARAJEVO_CENTER_FALLBACK = { lat: 43.8563, lng: 18.4131 }

/**
 * Before pickup is chosen: fleet markers scatter around city center (2 km) for a “live map” feel,
 * independent of GPS-based zone used for the header count.
 */
export const IDLE_MAP_SCATTER_ZONE: DriverZoneConfig = {
  name: 'IdleMap',
  lat: SARAJEVO_CENTER_FALLBACK.lat,
  lng: SARAJEVO_CENTER_FALLBACK.lng,
  radius: 2000,
  baseCount: 0,
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Pick the urban zone whose radius contains the point; ties broken by closest center. Fallback: Rural/Edge. */
export function resolveDriverZone(lat: number, lng: number): DriverZoneConfig {
  const urban = DRIVER_ZONES.filter((z) => z.name !== 'Rural/Edge')
  let best: DriverZoneConfig | null = null
  let bestDistM = Infinity
  for (const z of urban) {
    const distM = haversineKm({ lat, lng }, { lat: z.lat, lng: z.lng }) * 1000
    if (distM <= z.radius && distM < bestDistM) {
      bestDistM = distM
      best = z
    }
  }
  return best ?? DRIVER_ZONES.find((z) => z.name === 'Rural/Edge')!
}

export function initialSimDriverCount(zone: DriverZoneConfig): number {
  return Math.max(0, zone.baseCount + randomIntInclusive(-1, 1))
}

/** Uniform random point within zone disk (Haversine direct). */
export function randomPointInZone(zone: DriverZoneConfig): { lat: number; lng: number } {
  const distKm = Math.random() * (zone.radius / 1000)
  const bearing = Math.random() * 2 * Math.PI
  const R = 6371
  const lat1 = (zone.lat * Math.PI) / 180
  const lon1 = (zone.lng * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distKm / R) + Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(bearing)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distKm / R) * Math.cos(lat1),
      Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
    )
  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI }
}

export function clampPointToZone(
  zone: DriverZoneConfig,
  lat: number,
  lng: number
): { lat: number; lng: number } {
  const distKm = haversineKm({ lat, lng }, { lat: zone.lat, lng: zone.lng })
  const maxKm = zone.radius / 1000
  if (distKm <= maxKm) return { lat, lng }
  const fraction = maxKm / distKm
  return {
    lat: zone.lat + (lat - zone.lat) * fraction,
    lng: zone.lng + (lng - zone.lng) * fraction,
  }
}

/** Small random walk (~≤100 m), kept inside zone. */
export function jitterWithinZone(zone: DriverZoneConfig, lat: number, lng: number): { lat: number; lng: number } {
  const dLat = (Math.random() - 0.5) * 0.0018
  const dLng = ((Math.random() - 0.5) * 0.0018) / Math.cos((lat * Math.PI) / 180)
  return clampPointToZone(zone, lat + dLat, lng + dLng)
}

/** UI: 1–2 actual drivers still show as “2” in the label (product spec). */
export function displayedNearbyDriverCount(raw: number): number {
  if (raw <= 0) return 0
  if (raw <= 2) return 2
  return raw
}
