import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

export function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 1) return
    if (points.length === 1) {
      map.setView(points[0]!, 14)
      return
    }
    const b = L.latLngBounds(points)
    map.fitBounds(b, { padding: [28, 28], maxZoom: 14 })
  }, [map, points])
  return null
}
