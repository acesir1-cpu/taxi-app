import { haversineKm } from './distance'

/** Simple curved-ish polyline between two points for visualization */
export function interpolateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  segments = 24
): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = []
  const midLat = (from.lat + to.lat) / 2
  const midLng = (from.lng + to.lng) / 2
  const perp = 0.002 * (Math.random() > 0.5 ? 1 : -1)
  const ctrl = { lat: midLat + perp, lng: midLng - perp }

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const lat =
      (1 - t) * (1 - t) * from.lat + 2 * (1 - t) * t * ctrl.lat + t * t * to.lat
    const lng =
      (1 - t) * (1 - t) * from.lng + 2 * (1 - t) * t * ctrl.lng + t * t * to.lng
    out.push({ lat, lng })
  }
  return out
}

/** Urban average speed km/h for duration from polyline length */
export function estimateDurationMin(distanceKm: number, speedKmh = 30): number {
  if (speedKmh <= 0) return 0
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60))
}

/** Closest point on segment AB to P (planar lon/lat; fine for short urban segments). */
function closestPointOnSegment(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  p: { lat: number; lng: number }
): { lat: number; lng: number } {
  const abx = b.lng - a.lng
  const aby = b.lat - a.lat
  const apx = p.lng - a.lng
  const apy = p.lat - a.lat
  const ab2 = abx * abx + aby * aby
  const t = ab2 < 1e-18 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  return { lat: a.lat + t * aby, lng: a.lng + t * abx }
}

/**
 * Keep only the sub-path from the driver's position onward (toward the end of `points`),
 * so a trailing polyline does not stay visible “behind” the vehicle.
 */
export function trimPolylineAhead(
  points: ReadonlyArray<{ lat: number; lng: number }>,
  from: { lat: number; lng: number }
): Array<{ lat: number; lng: number }> {
  if (points.length < 2) return points.length ? [{ ...points[0]! }] : []
  let bestDist = Infinity
  let bestI = 0
  let bestPoint = points[0]!
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const c = closestPointOnSegment(a, b, from)
    const d = haversineKm(from, c)
    if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) <= 1e-9 && i > bestI)) {
      bestDist = d
      bestI = i
      bestPoint = c
    }
  }
  const rest = points.slice(bestI + 1)
  const out: Array<{ lat: number; lng: number }> = [bestPoint]
  for (const q of rest) {
    const prev = out[out.length - 1]!
    if (haversineKm(prev, q) >= 0.00005) out.push(q)
  }
  return out.length >= 2 ? out : [from, points[points.length - 1]!]
}

export function pointAlongPolyline(
  points: Array<{ lat: number; lng: number }>,
  t: number
): { lat: number; lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 }
  if (points.length === 1) return points[0]!
  const clamped = Math.min(1, Math.max(0, t))
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1]!, points[i]!)
    lengths.push(d)
    total += d
  }
  if (total === 0) return points[0]!
  let target = total * clamped
  for (let i = 1; i < points.length; i++) {
    const seg = lengths[i - 1] ?? 0
    if (target <= seg || i === points.length - 1) {
      const a = points[i - 1]!
      const b = points[i]!
      const ratio = seg === 0 ? 1 : Math.min(1, target / seg)
      return {
        lat: a.lat + (b.lat - a.lat) * ratio,
        lng: a.lng + (b.lng - a.lng) * ratio,
      }
    }
    target -= seg
  }
  return points[points.length - 1]!
}
