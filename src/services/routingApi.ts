import { interpolateRoute } from '../utils/route'
import { haversineKm } from '../utils/distance'

/**
 * Road-snapped routing client.
 *
 * Uses the OSRM public demo endpoint (no API key, rate-limited, demo only).
 * Swap `OSRM_BASE` to a self-hosted instance or change the implementation here
 * to migrate to ORS / Mapbox / GraphHopper without touching call sites.
 */

export type LatLng = { lat: number; lng: number }

export interface RoadRoute {
  routePoints: LatLng[]
  distanceKm: number
  durationMin: number
  source: 'osrm' | 'cache' | 'fallback'
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const CACHE_VERSION = 'v1'
const STORAGE_PREFIX = `rt:${CACHE_VERSION}:`
const TTL_MS = 14 * 24 * 60 * 60 * 1000
/** Per-request guard so a single hung request can't block the UI forever. */
const REQUEST_TIMEOUT_MS = 6000

/** Round to 5 decimals (~1.1m precision) so trivial pan jitter doesn't bust the cache. */
function roundCoord(value: number): string {
  return value.toFixed(5)
}

function cacheKey(from: LatLng, to: LatLng): string {
  return `${roundCoord(from.lat)},${roundCoord(from.lng)}|${roundCoord(to.lat)},${roundCoord(to.lng)}`
}

interface CachedEntry {
  routePoints: LatLng[]
  distanceKm: number
  durationMin: number
  storedAt: number
}

const memoryCache = new Map<string, CachedEntry>()
let warnedFallback = false

function readStorage(key: string): CachedEntry | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedEntry
    if (!parsed || typeof parsed.storedAt !== 'number') return null
    if (Date.now() - parsed.storedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_PREFIX + key)
      return null
    }
    if (!Array.isArray(parsed.routePoints) || parsed.routePoints.length < 2) return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(key: string, entry: CachedEntry): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    /* localStorage may be full or disabled — silently skip persisting. */
  }
}

function buildFallback(from: LatLng, to: LatLng): RoadRoute {
  const routePoints = interpolateRoute(from, to, 28)
  const distanceKm = Math.round(haversineKm(from, to) * 1.15 * 100) / 100
  const durationMin = Math.max(1, Math.round((distanceKm / 32) * 60))
  return { routePoints, distanceKm, durationMin, source: 'fallback' }
}

interface OsrmResponse {
  code?: string
  routes?: Array<{
    geometry?: { coordinates?: Array<[number, number]> }
    distance?: number
    duration?: number
  }>
}

async function callOsrm(from: LatLng, to: LatLng): Promise<RoadRoute | null> {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as OsrmResponse
    if (data.code && data.code !== 'Ok') return null
    const route = data.routes?.[0]
    const coords = route?.geometry?.coordinates
    if (!coords || coords.length < 2) return null
    const routePoints: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }))
    const distanceKm = Math.round(((route?.distance ?? 0) / 1000) * 100) / 100
    const durationMin = Math.max(1, Math.round((route?.duration ?? 0) / 60))
    return { routePoints, distanceKm, durationMin, source: 'osrm' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Inflight de-duplication so a flurry of identical fetches share one request. */
const inflight = new Map<string, Promise<RoadRoute>>()

export async function fetchRoadRoute(from: LatLng, to: LatLng): Promise<RoadRoute> {
  const key = cacheKey(from, to)

  const mem = memoryCache.get(key)
  if (mem) {
    return {
      routePoints: mem.routePoints,
      distanceKm: mem.distanceKm,
      durationMin: mem.durationMin,
      source: 'cache',
    }
  }
  const stored = readStorage(key)
  if (stored) {
    memoryCache.set(key, stored)
    return {
      routePoints: stored.routePoints,
      distanceKm: stored.distanceKm,
      durationMin: stored.durationMin,
      source: 'cache',
    }
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    try {
      const fresh = await callOsrm(from, to)
      if (fresh) {
        const entry: CachedEntry = {
          routePoints: fresh.routePoints,
          distanceKm: fresh.distanceKm,
          durationMin: fresh.durationMin,
          storedAt: Date.now(),
        }
        memoryCache.set(key, entry)
        writeStorage(key, entry)
        return fresh
      }
      if (!warnedFallback) {
        warnedFallback = true
        console.warn('[routingApi] OSRM unavailable, falling back to interpolated curve.')
      }
      return buildFallback(from, to)
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

/**
 * Synchronous variant: only returns a road route if it's already in the in-memory
 * cache. Otherwise returns the curve fallback. Useful for components that render
 * synchronously and can't await; pair with a background `fetchRoadRoute()` call
 * that will populate the cache for the next render.
 */
export function getCachedRoadRoute(from: LatLng, to: LatLng): RoadRoute {
  const key = cacheKey(from, to)
  const mem = memoryCache.get(key)
  if (mem) {
    return {
      routePoints: mem.routePoints,
      distanceKm: mem.distanceKm,
      durationMin: mem.durationMin,
      source: 'cache',
    }
  }
  const stored = readStorage(key)
  if (stored) {
    memoryCache.set(key, stored)
    return {
      routePoints: stored.routePoints,
      distanceKm: stored.distanceKm,
      durationMin: stored.durationMin,
      source: 'cache',
    }
  }
  return buildFallback(from, to)
}

/** Pre-seed the in-memory cache from a static prebake (used by seed data). */
export function primeRoadRouteCache(entries: Array<{ from: LatLng; to: LatLng; routePoints: LatLng[]; distanceKm?: number; durationMin?: number }>): void {
  const now = Date.now()
  for (const e of entries) {
    if (!e.routePoints || e.routePoints.length < 2) continue
    const key = cacheKey(e.from, e.to)
    memoryCache.set(key, {
      routePoints: e.routePoints,
      distanceKm: e.distanceKm ?? 0,
      durationMin: e.durationMin ?? 0,
      storedAt: now,
    })
  }
}
