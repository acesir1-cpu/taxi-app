import type { Location, OrderType, RouteEstimate } from '../types/domain'
import { haversineKm } from '../utils/distance'
import { isNightTariff } from '../utils/price'
import { calculateRoute, estimateEta } from './locationApi'
import { delay } from './delay'

export type AiDemandLevel = 'low' | 'medium' | 'high'
export type AiTrafficLevel = 'light' | 'moderate' | 'heavy'
export type AiInsightId =
  | 'normal'
  | 'rush_hour'
  | 'night_tariff'
  | 'airport_route'
  | 'center_peak'
  | 'elevated_demand'
  | 'scheduled_window'

export interface AiRideEstimate {
  route: RouteEstimate
  distanceKm: number
  durationMin: number
  estimatedPrice: number
  demandLevel: AiDemandLevel
  trafficLevel: AiTrafficLevel
  confidencePercent: number
  insightId: AiInsightId
  nightTariffApplied: boolean
  availableDrivers?: number
  pickupEtaMin?: number
}

export interface AiEstimateContext {
  availableDrivers?: number
  orderType?: OrderType
  scheduledAt?: string
  at?: Date
}

function trafficForHour(hour: number): AiTrafficLevel {
  const rush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)
  const moderate = hour >= 11 && hour <= 14
  if (rush) return 'heavy'
  if (moderate) return 'moderate'
  return 'light'
}

function demandFromLabels(pickup: Location, destination: Location, availableDrivers?: number): AiDemandLevel {
  const text = `${pickup.label} ${destination.label}`.toLowerCase()
  if (text.includes('aerodrom') || text.includes('airport')) return 'high'
  if (text.includes('baščaršija') || text.includes('basčaršija') || text.includes('bcc') || text.includes('centar')) {
    return 'medium'
  }
  if (availableDrivers !== undefined && availableDrivers <= 1) return 'high'
  if (availableDrivers !== undefined && availableDrivers >= 3) return 'low'
  return 'medium'
}

function insightIdFor(
  pickup: Location,
  destination: Location,
  traffic: AiTrafficLevel,
  night: boolean,
  demand: AiDemandLevel,
  orderType?: OrderType,
): AiInsightId {
  const text = `${pickup.label} ${destination.label}`.toLowerCase()
  if (orderType === 'zakazano') return 'scheduled_window'
  if (text.includes('aerodrom') || text.includes('airport')) return 'airport_route'
  if (night) return 'night_tariff'
  if (traffic === 'heavy') return 'rush_hour'
  if (demand === 'high') return 'elevated_demand'
  if (text.includes('centar') || text.includes('marijin')) return 'center_peak'
  return 'normal'
}

export async function buildAiRideEstimate(
  pickup: Location,
  destination: Location,
  context: AiEstimateContext = {},
): Promise<AiRideEstimate | { error: string }> {
  await delay(48)
  const at = context.scheduledAt ? new Date(context.scheduledAt) : context.at ?? new Date()
  const route = await calculateRoute(pickup, destination)
  if ('error' in route) {
    if (route.error === 'same') return { error: 'same_location' }
    return { error: 'outside_zone' }
  }

  const trafficLevel = trafficForHour(at.getHours())
  const nightTariffApplied = isNightTariff(at)
  const demandLevel = demandFromLabels(pickup, destination, context.availableDrivers)
  const insightId = insightIdFor(pickup, destination, trafficLevel, nightTariffApplied, demandLevel, context.orderType)

  let durationMin = route.durationMin
  if (trafficLevel === 'heavy') durationMin = Math.round(durationMin * 1.12)
  if (trafficLevel === 'moderate') durationMin = Math.round(durationMin * 1.05)

  const confidencePercent =
    trafficLevel === 'light' ? 94 : trafficLevel === 'moderate' ? 91 : 88

  return {
    route,
    distanceKm: route.distanceKm,
    durationMin,
    estimatedPrice: route.estimatedPrice,
    demandLevel,
    trafficLevel,
    confidencePercent,
    insightId,
    nightTariffApplied,
    availableDrivers: context.availableDrivers,
  }
}

export async function buildAiPickupEta(
  driverLocation: { lat: number; lng: number },
  pickup: Location,
  trafficLevel: AiTrafficLevel,
): Promise<number> {
  const base = await estimateEta(driverLocation, pickup)
  if (trafficLevel === 'heavy') return Math.max(2, Math.round(base * 1.15))
  if (trafficLevel === 'moderate') return Math.max(2, Math.round(base * 1.08))
  return base
}

/** 0–100 score for dispatcher driver ranking (demo). */
export function scoreDriverAiMatch(distanceToPickupKm: number, availableDriversNearby: number): number {
  const distanceScore = Math.max(0, 100 - distanceToPickupKm * 14)
  const supplyBonus = Math.min(12, availableDriversNearby * 4)
  return Math.round(Math.min(99, Math.max(55, distanceScore + supplyBonus)))
}

export function isAirportRoute(pickup: Location, destination: Location): boolean {
  const text = `${pickup.label} ${destination.label}`.toLowerCase()
  return text.includes('aerodrom') || text.includes('airport')
}

export function straightLineKm(pickup: Location, destination: Location): number {
  return haversineKm(pickup, destination)
}
