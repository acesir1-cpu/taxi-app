import { useEffect, useState } from 'react'
import { fetchRoadRoute, getCachedRoadRoute, type LatLng, type RoadRoute } from '../services/routingApi'

/**
 * Returns a road-snapped route between two points. Initial render uses the
 * synchronous cache (which falls back to a curved interpolation on a miss);
 * a background fetch upgrades to the real route once OSRM responds and the
 * next render emits it.
 */
export function useRoadRoute(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
): RoadRoute | null {
  const [route, setRoute] = useState<RoadRoute | null>(() =>
    from && to ? getCachedRoadRoute(from, to) : null,
  )

  useEffect(() => {
    if (!from || !to) {
      setRoute(null)
      return
    }
    let cancelled = false
    setRoute(getCachedRoadRoute(from, to))
    void fetchRoadRoute(from, to).then((next) => {
      if (cancelled) return
      setRoute(next)
    })
    return () => {
      cancelled = true
    }
    // Intentionally key on coordinate values, not object identity: parents
    // often pass freshly constructed `{lat, lng}` objects on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.lat, from?.lng, to?.lat, to?.lng])

  return route
}
