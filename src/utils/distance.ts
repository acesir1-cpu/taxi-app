const R = 6371

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = deg2rad(b.lat - a.lat)
  const dLng = deg2rad(b.lng - a.lng)
  const lat1 = deg2rad(a.lat)
  const lat2 = deg2rad(b.lat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180
}

export function distanceAlongPolylineKm(points: Array<{ lat: number; lng: number }>): number {
  if (points.length < 2) return 0
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    sum += haversineKm(points[i - 1]!, points[i]!)
  }
  return sum
}
