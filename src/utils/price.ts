const BASE = 2.5
const PER_KM = 1.2
const PER_MIN = 0.2
const MIN_PRICE = 5
const NIGHT_MULT = 1.2
const NIGHT_START = 22
const NIGHT_END = 6

export function isNightTariff(date: Date = new Date()): boolean {
  const h = date.getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

export function estimatePriceBam(distanceKm: number, durationMin: number, at: Date = new Date()): number {
  let raw = BASE + distanceKm * PER_KM + durationMin * PER_MIN
  if (isNightTariff(at)) raw *= NIGHT_MULT
  return Math.round(Math.max(MIN_PRICE, raw) * 100) / 100
}
