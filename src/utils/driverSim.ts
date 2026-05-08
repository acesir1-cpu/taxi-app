import { haversineKm } from './distance'

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** Početna pozicija vozila blizu preuzimanja (0,2–3 km), ista logika kao na putničkom ekranu. */
export function generateDriverStartNearPickup(pickup: { lat: number; lng: number }): { lat: number; lng: number } {
  for (let i = 0; i < 24; i++) {
    const latOffset = randomInRange(-0.02, 0.02)
    const lngOffset = randomInRange(-0.02, 0.02)
    const candidate = {
      lat: pickup.lat + latOffset,
      lng: pickup.lng + lngOffset,
    }
    const dKm = haversineKm(candidate, pickup)
    if (dKm >= 0.2 && dKm <= 3) return candidate
  }
  return {
    lat: pickup.lat + 0.012,
    lng: pickup.lng - 0.01,
  }
}
