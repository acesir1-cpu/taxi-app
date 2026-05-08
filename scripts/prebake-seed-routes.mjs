#!/usr/bin/env node
/**
 * Pre-bake the road-snapped routes for the six seeded past rides in
 * src/data/seed.ts so the seed module remains synchronous at import time.
 *
 * Run via:  npm run prebake:seed-routes
 *
 * Re-run whenever the seed pickup/destination pairs change. Output is
 * committed at src/data/seedRouteCache.ts.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const outFile = resolve(repoRoot, 'src/data/seedRouteCache.ts')

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

const LOCATIONS = {
  'loc-bascarsija': { lat: 43.859, lng: 18.4318 },
  'loc-marijin': { lat: 43.8563, lng: 18.4034 },
  'loc-grbavica': { lat: 43.8497, lng: 18.3892 },
  'loc-airport': { lat: 43.8246, lng: 18.3315 },
  'loc-ilidza': { lat: 43.8298, lng: 18.3076 },
  'loc-centar': { lat: 43.8568, lng: 18.4134 },
  'loc-otoka': { lat: 43.8477, lng: 18.3636 },
  'loc-vogosca': { lat: 43.9028, lng: 18.3489 },
  'loc-stup': { lat: 43.8845, lng: 18.3589 },
  'loc-kosevo': { lat: 43.8682, lng: 18.4138 },
}

const PAIRS = [
  ['loc-bascarsija', 'loc-marijin'],
  ['loc-grbavica', 'loc-airport'],
  ['loc-ilidza', 'loc-centar'],
  ['loc-otoka', 'loc-vogosca'],
  ['loc-centar', 'loc-stup'],
  ['loc-kosevo', 'loc-centar'],
]

function roundCoord(v) {
  return Number.parseFloat(v.toFixed(5))
}

function cacheKey(from, to) {
  return `${from.lat.toFixed(5)},${from.lng.toFixed(5)}|${to.lat.toFixed(5)},${to.lng.toFixed(5)}`
}

async function fetchRoute(from, to) {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM ${res.status} for ${url}`)
  const data = await res.json()
  if (data.code && data.code !== 'Ok') throw new Error(`OSRM code=${data.code}`)
  const route = data.routes?.[0]
  const coords = route?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) throw new Error('OSRM returned no geometry')
  return {
    routePoints: coords.map(([lng, lat]) => ({
      lat: roundCoord(lat),
      lng: roundCoord(lng),
    })),
    distanceKm: Math.round((route.distance / 1000) * 100) / 100,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
  }
}

function formatRoutePoints(points) {
  return points
    .map((p) => `    { lat: ${p.lat}, lng: ${p.lng} },`)
    .join('\n')
}

function formatEntry(key, fromId, toId, payload) {
  const from = LOCATIONS[fromId]
  const to = LOCATIONS[toId]
  return `  // ${fromId} -> ${toId}
  ${JSON.stringify(key)}: {
    from: { lat: ${from.lat}, lng: ${from.lng} },
    to: { lat: ${to.lat}, lng: ${to.lng} },
    distanceKm: ${payload.distanceKm},
    durationMin: ${payload.durationMin},
    routePoints: [
${formatRoutePoints(payload.routePoints)}
    ],
  },`
}

async function main() {
  console.log('Fetching road routes from OSRM...')
  const entries = []
  for (const [fromId, toId] of PAIRS) {
    const from = LOCATIONS[fromId]
    const to = LOCATIONS[toId]
    if (!from || !to) throw new Error(`Unknown location pair ${fromId} -> ${toId}`)
    const key = cacheKey(from, to)
    process.stdout.write(`  ${fromId} -> ${toId} ... `)
    const payload = await fetchRoute(from, to)
    console.log(`${payload.routePoints.length} pts, ${payload.distanceKm} km, ${payload.durationMin} min`)
    entries.push(formatEntry(key, fromId, toId, payload))
    // Stay polite to the public demo endpoint.
    await new Promise((r) => setTimeout(r, 250))
  }

  const banner = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Built by scripts/prebake-seed-routes.mjs from the OSRM public demo.
 * Re-run \`npm run prebake:seed-routes\` whenever seed pickup/destination
 * pairs change.
 */
`
  const body = `import type { LatLng } from '../services/routingApi'

export interface SeedRouteCacheEntry {
  from: LatLng
  to: LatLng
  routePoints: LatLng[]
  distanceKm: number
  durationMin: number
}

export const SEED_ROUTES: Record<string, SeedRouteCacheEntry> = {
${entries.join('\n')}
}
`
  await writeFile(outFile, banner + '\n' + body, 'utf8')
  console.log(`\nWrote ${outFile}`)
}

main().catch((err) => {
  console.error('Failed to prebake seed routes:', err)
  process.exit(1)
})
