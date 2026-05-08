import { haversineKm } from './distance'
import { interpolateRoute } from './route'

/** Drop consecutive points closer than ~2m so arc-length animation does not stall on zero-length segments. */
function pruneNearDuplicatePoints(
  points: Array<{ lat: number; lng: number }>,
  minKm = 0.002
): Array<{ lat: number; lng: number }> {
  if (points.length <= 1) return points
  const out: Array<{ lat: number; lng: number }> = [points[0]!]
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!
    const prev = out[out.length - 1]!
    if (haversineKm(prev, p) >= minKm) out.push(p)
  }
  if (out.length >= 2) return out
  const a = points[0]!
  const b = points[points.length - 1]!
  if (haversineKm(a, b) < 1e-9) {
    return [a, { lat: a.lat, lng: a.lng + 1e-6 }]
  }
  return [a, b]
}

/** Snap / extend polyline so simulation starts at `from` and ends exactly at `to`. */
export function buildDriverAnimationPath(
  routePoints: ReadonlyArray<{ lat: number; lng: number }>,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  fallbackSegments = 48
): Array<{ lat: number; lng: number }> {
  const snapKm = 0.05
  let path =
    routePoints.length > 1
      ? routePoints.map((p) => ({ lat: p.lat, lng: p.lng }))
      : interpolateRoute(from, to, fallbackSegments)
  if (path.length < 2) {
    path = interpolateRoute(from, to, fallbackSegments)
  }
  if (haversineKm(path[0]!, from) > snapKm) {
    path = [from, ...path]
  } else {
    path = [{ lat: from.lat, lng: from.lng }, ...path.slice(1)]
  }
  const lastIdx = path.length - 1
  if (haversineKm(path[lastIdx]!, to) > snapKm) {
    path = [...path, to]
  } else {
    path = [...path.slice(0, -1), { lat: to.lat, lng: to.lng }]
  }
  return pruneNearDuplicatePoints(path)
}
