import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/** Stable signature so parent re-renders with new array refs don't re-trigger fit. */
function pointsSignature(points: Array<[number, number]>): string {
  return points.map(([lat, lng]) => `${lat},${lng}`).join('|')
}

export function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  const sig = pointsSignature(points)

  useEffect(() => {
    if (points.length < 1) return
    if (points.length === 1) {
      map.setView(points[0]!, 14)
      return
    }
    const b = L.latLngBounds(points)
    map.fitBounds(b, { padding: [28, 28], maxZoom: 14 })
    // `sig` is the logical dependency; `points` is read from the render when sig changed.
  }, [map, sig])
  return null
}
