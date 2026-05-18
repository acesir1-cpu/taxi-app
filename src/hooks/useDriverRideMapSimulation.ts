import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DriverActiveRide } from '../types/domain'
import {
  driverCompleteRide,
  driverMarkArrived,
  driverPatchActiveRidePosition,
} from '../services/driverSessionApi'
import { buildDriverAnimationPath } from '../utils/driverRouteAnimation'
import { fetchRoadRoute } from '../services/routingApi'
import { distanceAlongPolylineKm, haversineKm } from '../utils/distance'
import { generateDriverStartNearPickup } from '../utils/driverSim'
import { interpolateRoute, pointAlongPolyline } from '../utils/route'

/**
 * Map a polyline length to an animation duration so short rides feel snappy
 * and long rides aren't comically fast. ~6s/km clamped to 8–180 seconds.
 */
function durationForRouteKm(distanceKm: number): number {
  return Math.max(8_000, Math.min(180_000, Math.round(distanceKm * 6_000)))
}

/**
 * Animacija pozicije vozila kao na putničkom RidePage (ist ~30s trajanje, brzina simSpeed).
 */
export function useDriverRideMapSimulation(
  accountId: string | undefined,
  ride: DriverActiveRide | null | undefined,
  simSpeed: number,
) {
  const qc = useQueryClient()
  const [displayPos, setDisplayPos] = useState<{ lat: number; lng: number } | null>(null)
  const [driverOrigin, setDriverOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const rideIdRef = useRef<string | null>(null)
  const approachRunIdRef = useRef(0)
  const speedRef = useRef(simSpeed)
  const animCancelRef = useRef<(() => void) | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const displayPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const rideRef = useRef(ride)

  useEffect(() => {
    rideRef.current = ride
  }, [ride])

  useEffect(() => {
    speedRef.current = simSpeed
  }, [simSpeed])

  function cancelActiveAnimation() {
    animCancelRef.current?.()
    animCancelRef.current = null
    if (animationFrameIdRef.current !== null) {
      window.cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
  }

  function commitPos(p: { lat: number; lng: number }) {
    displayPosRef.current = p
    setDisplayPos(p)
  }

  useEffect(() => {
    if (!ride || !accountId) {
      rideIdRef.current = null
      displayPosRef.current = null
      setDisplayPos(null)
      setDriverOrigin(null)
      cancelActiveAnimation()
      return
    }
    if (rideIdRef.current !== ride.id) {
      rideIdRef.current = ride.id
      const existing =
        ride.driverLat != null && ride.driverLng != null
          ? { lat: ride.driverLat, lng: ride.driverLng }
          : null
      const chosen = existing ?? generateDriverStartNearPickup(ride.pickup)
      const dKm = haversineKm(chosen, ride.pickup)
      const mustRegenerate = !existing || dKm < 0.2 || dKm > 3
      const start = mustRegenerate ? generateDriverStartNearPickup(ride.pickup) : chosen
      setDriverOrigin(start)
      commitPos(start)
      if (mustRegenerate) void driverPatchActiveRidePosition(accountId, start.lat, start.lng)
    }
  }, [ride, accountId])

  const rideId = ride?.id
  const flowStatus = ride?.flowStatus

  useEffect(() => {
    if (!accountId || !rideId) return
    const accountIdBound = accountId
    const r = rideRef.current
    if (!r || r.id !== rideId) return

    cancelActiveAnimation()

    function animateMarkerAlongRoute(
      routeCoordinates: Array<{ lat: number; lng: number }>,
      onDone: () => void,
      explicitDistanceKm?: number,
    ) {
      if (routeCoordinates.length < 2) {
        onDone()
        return () => undefined
      }
      let cancelled = false
      let persistStamp = 0
      const measuredKm = explicitDistanceKm ?? distanceAlongPolylineKm(routeCoordinates)
      const baseDuration = durationForRouteKm(measuredKm)
      let progress = 0
      let lastTs = 0
      const step = (now: number) => {
        if (cancelled) return
        if (!lastTs) lastTs = now
        const delta = Math.max(0, now - lastTs)
        lastTs = now
        const progressDelta = (delta / baseDuration) * speedRef.current
        progress = Math.min(1, progress + progressDelta)
        const p = pointAlongPolyline(routeCoordinates, progress)
        commitPos({ lat: p.lat, lng: p.lng })
        if (now - persistStamp >= 450) {
          persistStamp = now
          void driverPatchActiveRidePosition(accountIdBound, p.lat, p.lng)
        }
        if (progress >= 1) {
          void driverPatchActiveRidePosition(accountIdBound, p.lat, p.lng)
          animationFrameIdRef.current = null
          onDone()
          return
        }
        animationFrameIdRef.current = window.requestAnimationFrame(step)
      }
      animationFrameIdRef.current = window.requestAnimationFrame(step)
      return () => {
        cancelled = true
        if (animationFrameIdRef.current !== null) {
          window.cancelAnimationFrame(animationFrameIdRef.current)
          animationFrameIdRef.current = null
        }
      }
    }

    if (r.flowStatus === 'stigao') {
      const p = { lat: r.pickup.lat, lng: r.pickup.lng }
      commitPos(p)
      void driverPatchActiveRidePosition(accountIdBound, p.lat, p.lng)
      return cancelActiveAnimation
    }

    if (r.flowStatus === 'vozac_na_putu' || r.flowStatus === 'prihvacena') {
      const runId = ++approachRunIdRef.current
      let cancelled = false

      const finishApproach = () => {
        void (async () => {
          if (cancelled || approachRunIdRef.current !== runId) return
          const still = rideRef.current
          if (
            !still ||
            still.id !== rideId ||
            (still.flowStatus !== 'vozac_na_putu' && still.flowStatus !== 'prihvacena')
          ) {
            return
          }
          const p = { lat: still.pickup.lat, lng: still.pickup.lng }
          commitPos(p)
          await driverPatchActiveRidePosition(accountIdBound, p.lat, p.lng)
          const res = await driverMarkArrived(accountIdBound)
          if (!('error' in res)) {
            await qc.invalidateQueries({ queryKey: ['driverUi', accountIdBound] })
          }
        })()
      }

      void (async () => {
        const start = displayPosRef.current ?? { lat: r.pickup.lat, lng: r.pickup.lng }
        const road = await fetchRoadRoute(start, r.pickup)
        const approachRaw =
          road.routePoints.length > 1 ? road.routePoints : interpolateRoute(start, r.pickup, 64)
        const approach = buildDriverAnimationPath(approachRaw, start, r.pickup, 64)
        if (cancelled || approachRunIdRef.current !== runId) return
        const still = rideRef.current
        if (
          !still ||
          still.id !== rideId ||
          (still.flowStatus !== 'vozac_na_putu' && still.flowStatus !== 'prihvacena')
        ) {
          return
        }
        animCancelRef.current = animateMarkerAlongRoute(approach, finishApproach, undefined)
      })()
      return () => {
        cancelled = true
        cancelActiveAnimation()
      }
    }

    if (r.flowStatus === 'u_toku') {
      const pathRaw = r.routePoints.length > 1 ? r.routePoints : interpolateRoute(r.pickup, r.destination, 72)
      const from = displayPosRef.current ?? { lat: r.pickup.lat, lng: r.pickup.lng }
      const path = buildDriverAnimationPath(pathRaw, from, r.destination, 72)
      const fallbackMs = Math.max(
        3000,
        Math.round(
          (durationForRouteKm(distanceAlongPolylineKm(path)) / Math.max(0.25, speedRef.current)) * 1.25
        )
      )
      let finalized = false
      const finalizeRide = () => {
        if (finalized) return
        finalized = true
        const end = { lat: r.destination.lat, lng: r.destination.lng }
        commitPos(end)
        void (async () => {
          await driverPatchActiveRidePosition(accountIdBound, end.lat, end.lng)
          const res = await driverCompleteRide(accountIdBound)
          if (!('error' in res)) {
            await qc.invalidateQueries({ queryKey: ['driverUi', accountIdBound] })
            await qc.invalidateQueries({ queryKey: ['notifications', accountIdBound] })
          }
        })()
      }
      const fallbackId = window.setTimeout(() => {
        const still = rideRef.current
        if (still && still.id === rideId && still.flowStatus === 'u_toku') {
          finalizeRide()
        }
      }, fallbackMs)
      animCancelRef.current = animateMarkerAlongRoute(path, finalizeRide, undefined)
      return () => {
        window.clearTimeout(fallbackId)
        cancelActiveAnimation()
      }
    }

    return cancelActiveAnimation
  }, [rideId, flowStatus, accountId])

  return {
    mapDriverPos: displayPos,
    mapDriverOrigin: driverOrigin,
  }
}
