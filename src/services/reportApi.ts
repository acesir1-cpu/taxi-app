import { dispatchRideStatusLabel } from './dispatcherApi'
import { delay } from './delay'
import { getDb } from './mockDb'
import type { Complaint, Driver, DriverActivityLogItem, Location, Ride, RideRequest } from '../types/domain'
import type {
  ExternalDocumentType,
  InternalReportType,
  ReportBuildParams,
  ReportColumn,
  ReportDocument,
  ReportGroup,
  ReportLegendItem,
  ReportRow,
  ReportType,
} from '../types/reports'
import {
  calendarDayKey,
  isInDateRange,
  parseRangeFromInputs,
  rideActivityIso,
} from '../lib/reports/reportFilters'
import { getReportBuildLabels, type ReportBuildLabels } from '../lib/reports/reportLabels'
import { formatBsDate, formatBsDateTime } from '../utils/date'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function passengerName(passengerId: string, L: ReportBuildLabels): string {
  const p = getDb().profiles.find((x) => x.id === passengerId)
  return p ? `${p.firstName} ${p.lastName}`.trim() : L.unknownPassenger
}

function driverName(driverId: string): string {
  const d = getDb().drivers.find((x) => x.id === driverId)
  return d ? `${d.firstName} ${d.lastName}` : '-'
}

function accountLabel(accountId?: string): string {
  if (!accountId) return '-'
  const db = getDb()
  const user = db.users.find((u) => u.id === accountId)
  if (!user) return accountId
  const profile =
    db.profiles.find((p) => p.accountId === accountId) ??
    db.dispatcherProfiles.find((p) => p.accountId === accountId) ??
    db.driverProfiles.find((p) => p.accountId === accountId)
  if (profile && 'firstName' in profile) return `${profile.firstName} ${profile.lastName}`
  return user.email
}

function dispatcherDisplay(accountId?: string): string | undefined {
  if (!accountId) return undefined
  const p = getDb().dispatcherProfiles.find((d) => d.accountId === accountId)
  return p ? p.fullName : accountLabel(accountId)
}

function ridePrice(ride: Ride): number {
  return ride.finalPrice ?? ride.estimatedPrice ?? 0
}

function paymentLabel(method: string, L: ReportBuildLabels): string {
  if (method === 'gotovina') return L.paymentCash
  return method
}

function statusLegend(L: ReportBuildLabels): ReportLegendItem[] {
  return [
    { key: 'zavrsena', label: L.legendCompleted, swatch: '#16a34a' },
    { key: 'otkazana', label: L.legendCancelled, swatch: '#dc2626' },
    { key: 'u_toku', label: L.legendInProgress, swatch: '#2563eb' },
    { key: 'dodijeljena', label: L.legendAssigned, swatch: '#ca8a04' },
  ]
}

type ReportFilters = Pick<ReportBuildParams, 'driverId' | 'status' | 'zoneId'>
type ReportZoneKey = 'center' | 'new_sarajevo' | 'airport' | 'north' | 'other'

const LONG_WAIT_MINUTES = 10
const ACTIVE_RIDE_STATUSES = new Set<Ride['status']>(['dodijeljena', 'vozac_na_putu', 'stigao', 'u_toku', 'problematicna'])

function activeFilter(value?: string): string | undefined {
  return value && value !== 'all' ? value : undefined
}

function routeLabel(pickup: Location, destination: Location): string {
  return `${pickup.label} -> ${destination.label}`
}

function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(diff) || diff < 0) return undefined
  return Math.round(diff / 60_000)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

function zoneKey(location: Location): ReportZoneKey {
  if (location.id === 'loc-airport') return 'airport'
  if (['loc-bascarsija', 'loc-marijin', 'loc-centar', 'loc-bcc', 'loc-kosevo'].includes(location.id)) return 'center'
  if (['loc-grbavica', 'loc-ilidza', 'loc-otoka', 'loc-alipasino', 'loc-stup', 'loc-dobrinja'].includes(location.id)) {
    return 'new_sarajevo'
  }
  if (location.id === 'loc-vogosca') return 'north'
  return 'other'
}

function zoneLabel(key: ReportZoneKey, L: ReportBuildLabels): string {
  if (key === 'center') return L.zoneCenter
  if (key === 'new_sarajevo') return L.zoneNewSarajevo
  if (key === 'airport') return L.zoneAirport
  if (key === 'north') return L.zoneNorth
  return L.zoneOther
}

function requestForRide(ride: Ride): RideRequest | undefined {
  return getDb().rideRequests.find((req) => req.id === ride.requestId)
}

function waitMinutesForRequest(request: RideRequest, ride?: Ride | null): number {
  const end = ride?.driverArrivedAt ?? ride?.assignedAt ?? ride?.cancelledAt ?? new Date().toISOString()
  return minutesBetween(request.createdAt, end) ?? 0
}

function rideDurationMin(ride: Ride): number {
  return minutesBetween(ride.startedAt, ride.finishedAt) ?? ride.estimatedDurationMin
}

function arrivalMinutes(ride: Ride): number | undefined {
  return minutesBetween(ride.assignedAt, ride.driverArrivedAt)
}

function rideMatchesFilters(ride: Ride, filters: ReportFilters): boolean {
  const driverId = activeFilter(filters.driverId)
  const status = activeFilter(filters.status)
  const zoneId = activeFilter(filters.zoneId)
  if (driverId && ride.driverId !== driverId) return false
  if (status && ride.status !== status) return false
  if (zoneId && zoneKey(ride.pickup) !== zoneId) return false
  return true
}

function requestMatchesFilters(request: RideRequest, filters: ReportFilters): boolean {
  const db = getDb()
  const ride = request.rideId ? db.rides.find((r) => r.id === request.rideId) ?? null : null
  const driverId = activeFilter(filters.driverId)
  const status = activeFilter(filters.status)
  const zoneId = activeFilter(filters.zoneId)
  if (driverId && ride?.driverId !== driverId) return false
  if (status && request.status !== status && ride?.status !== status) return false
  if (zoneId && zoneKey(request.pickup) !== zoneId) return false
  return true
}

function driverLinkedUi(driver: Driver) {
  const db = getDb()
  const profile = db.driverProfiles.find((p) => p.linkedDriverId === driver.id)
  return profile ? db.driverUiByAccountId[profile.accountId] : undefined
}

function rejectedCountForDriver(driver: Driver, from: string, to: string): number {
  const ui = driverLinkedUi(driver)
  if (!ui) return 0
  return ui.activityLog.filter(
    (log) => isInDateRange(log.createdAt, from, to) && log.message.toLowerCase().includes('odbij')
  ).length
}

function acceptanceRateForDriver(driver: Driver): number {
  const ui = driverLinkedUi(driver)
  if (ui) return ui.acceptanceRatePercent
  if (driver.availabilityStatus === 'van_funkcije') return 72
  return Math.round(Math.min(98, Math.max(82, 86 + (driver.rating - 4.5) * 12)))
}

function topDriverLabel(rides: Ride[]): string {
  const counts = new Map<string, number>()
  for (const ride of rides) counts.set(ride.driverId, (counts.get(ride.driverId) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? `${driverName(top[0])} (${top[1]})` : '-'
}

function topReason(rows: Array<{ reason?: string }>): string {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const reason = row.reason?.trim() || '-'
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? `${top[0]} (${top[1]})` : '-'
}

function baseMeta(
  type: ReportType,
  title: string,
  opts: {
    subtitle?: string
    from?: string
    to?: string
    generatedBy?: string
    audience: 'dispatcher' | 'passenger'
    goalTag?: ReportDocument['meta']['goalTag']
  }
): ReportDocument['meta'] {
  return {
    id: uid('rpt'),
    type,
    title,
    subtitle: opts.subtitle,
    generatedAt: new Date().toISOString(),
    periodFrom: opts.from,
    periodTo: opts.to,
    generatedBy: opts.generatedBy,
    audience: opts.audience,
    goalTag: opts.goalTag,
  }
}

function buildRidesDetail(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'rideId', label: L.colRideId },
    { key: 'when', label: L.colWhen, format: 'datetime' },
    { key: 'passenger', label: L.colPassenger },
    { key: 'driver', label: L.colDriver },
    { key: 'pickup', label: L.colPickup },
    { key: 'destination', label: L.colDestination },
    { key: 'zone', label: L.colZone },
    { key: 'status', label: L.colStatus },
    { key: 'durationMin', label: L.colDurationMin, align: 'right', format: 'number' },
    { key: 'price', label: L.colPrice, align: 'right', format: 'currency' },
  ]
  const rides = db.rides
    .filter((r) => isInDateRange(rideActivityIso(r), from, to) && rideMatchesFilters(r, params))
    .sort((a, b) => rideActivityIso(b).localeCompare(rideActivityIso(a)))

  const byDay = new Map<string, Ride[]>()
  for (const ride of rides) byDay.set(calendarDayKey(rideActivityIso(ride)), [...(byDay.get(calendarDayKey(rideActivityIso(ride))) ?? []), ride])

  const groups: ReportGroup[] = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, dayRides]) => ({
      breakLabel: day,
      rows: dayRides.map((ride) => ({
        rideId: ride.id,
        when: rideActivityIso(ride),
        passenger: passengerName(ride.passengerId, L),
        driver: driverName(ride.driverId),
        pickup: ride.pickup.label,
        destination: ride.destination.label,
        zone: zoneLabel(zoneKey(ride.pickup), L),
        status: dispatchRideStatusLabel(ride.status),
        durationMin: rideDurationMin(ride),
        price: ridePrice(ride),
      })),
      subtotal: {
        label: L.subtotalForDay.replace('{day}', day),
        values: {
          rides: dayRides.length,
          completed: dayRides.filter((r) => r.status === 'zavrsena').length,
          cancelled: dayRides.filter((r) => r.status === 'otkazana').length,
          revenueBam: dayRides.reduce((sum, r) => sum + (r.status === 'zavrsena' ? ridePrice(r) : 0), 0).toFixed(2),
        },
      },
    }))

  return {
    meta: baseMeta('rides_detail', L.titleRidesDetail, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'performance',
      subtitle: L.subtitleRidesDetail,
    }),
    legend: statusLegend(L),
    sections: [{ columns, groups: groups.length ? groups : [{ breakLabel: L.groupAllRides, rows: [] }] }],
    summary: {
      totalRows: rides.length,
      completed: rides.filter((r) => r.status === 'zavrsena').length,
      cancelled: rides.filter((r) => r.status === 'otkazana').length,
      revenueBam: rides.reduce((sum, r) => sum + (r.status === 'zavrsena' ? ridePrice(r) : 0), 0).toFixed(2),
    },
  }
}

function buildRideRequestsDetail(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'requestId', label: L.colRequestId },
    { key: 'createdAt', label: L.colCreatedAt, format: 'datetime' },
    { key: 'passenger', label: L.colPassenger },
    { key: 'pickup', label: L.colPickup },
    { key: 'destination', label: L.colDestination },
    { key: 'zone', label: L.colZone },
    { key: 'orderType', label: L.colOrderType },
    { key: 'status', label: L.colStatus },
    { key: 'etaMin', label: L.colEtaMin, align: 'right', format: 'number' },
    { key: 'durationMin', label: L.colDurationMin, align: 'right', format: 'number' },
    { key: 'price', label: L.colEstimatedPrice, align: 'right', format: 'currency' },
    { key: 'assignedRide', label: L.colAssignedRide },
  ]
  const requests = db.rideRequests
    .filter((req) => isInDateRange(req.createdAt, from, to) && requestMatchesFilters(req, params))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const byStatus = new Map<string, RideRequest[]>()
  for (const request of requests) {
    const status = dispatchRideStatusLabel(request.status)
    byStatus.set(status, [...(byStatus.get(status) ?? []), request])
  }

  const groups: ReportGroup[] = [...byStatus.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([status, statusRequests]) => ({
      breakLabel: status,
      rows: statusRequests.map((request) => ({
        requestId: request.id,
        createdAt: request.createdAt,
        passenger: passengerName(request.passengerId, L),
        pickup: request.pickup.label,
        destination: request.destination.label,
        zone: zoneLabel(zoneKey(request.pickup), L),
        orderType: request.orderType,
        status: dispatchRideStatusLabel(request.status),
        etaMin: request.estimatedEtaMin,
        durationMin: request.estimatedDurationMin,
        price: request.estimatedPrice,
        assignedRide: request.rideId ?? '-',
      })),
      subtotal: { values: { requests: statusRequests.length } },
    }))

  return {
    meta: baseMeta('ride_requests_detail', L.titleRideRequestsDetail, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'decision',
      subtitle: L.subtitleRideRequestsDetail,
    }),
    legend: statusLegend(L),
    sections: [{ columns, groups: groups.length ? groups : [{ breakLabel: L.groupAllRequests, rows: [] }] }],
    summary: { totalRows: requests.length },
  }
}

function buildDriverActivityDetail(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const driverFilter = activeFilter(params.driverId)
  const columns: ReportColumn[] = [
    { key: 'when', label: L.colWhen, format: 'datetime' },
    { key: 'driver', label: L.colDriver },
    { key: 'activityType', label: L.colActivityType },
    { key: 'message', label: L.colMessage },
    { key: 'related', label: L.colRelated },
  ]

  function driverActivityRows(driver: Driver, activity: DriverActivityLogItem[]): ReportRow[] {
    return activity
      .filter((log) => isInDateRange(log.createdAt, from, to))
      .map((log) => ({
        when: log.createdAt,
        driver: driverName(driver.id),
        activityType: log.kind,
        message: log.message,
        related: Object.entries(log.meta ?? {}).map(([key, value]) => `${key}: ${value}`).join(', ') || '-',
      }))
  }

  const groups: ReportGroup[] = db.drivers
    .filter((driver) => !driverFilter || driver.id === driverFilter)
    .map((driver) => {
      const ui = driverLinkedUi(driver)
      const appRows = ui ? driverActivityRows(driver, ui.activityLog) : []
      const dispatchRows = db.dispatchLogs
        .filter((log) => log.driverId === driver.id && isInDateRange(log.createdAt, from, to))
        .map((log) => ({
          when: log.createdAt,
          driver: driverName(driver.id),
          activityType: log.kind,
          message: log.message,
          related: log.rideId ?? log.requestId ?? log.complaintId ?? '-',
        }))
      const rows = [...appRows, ...dispatchRows].sort((a, b) => String(b.when).localeCompare(String(a.when)))
      return {
        breakLabel: L.groupDriver.replace('{name}', driverName(driver.id)),
        rows,
        subtotal: { values: { count: rows.length } },
      }
    })
    .filter((group) => group.rows.length > 0 || Boolean(driverFilter))

  return {
    meta: baseMeta('driver_activity_detail', L.titleDriverActivityDetail, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'performance',
      subtitle: L.subtitleDriverActivityDetail,
    }),
    legend: [{ key: 'driver_activity', label: L.legendDriverActivity, swatch: '#2563eb' }],
    sections: [{ columns, groups: groups.length ? groups : [{ breakLabel: L.groupDriverActivity, rows: [] }] }],
    summary: { totalRows: groups.reduce((sum, group) => sum + group.rows.length, 0) },
  }
}

function buildRevenueByDay(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const rides = db.rides.filter((r) => isInDateRange(rideActivityIso(r), from, to) && rideMatchesFilters(r, params))
  const byDay = new Map<string, Ride[]>()
  for (const ride of rides) byDay.set(calendarDayKey(rideActivityIso(ride)), [...(byDay.get(calendarDayKey(rideActivityIso(ride))) ?? []), ride])

  const columns: ReportColumn[] = [
    { key: 'date', label: L.colDate },
    { key: 'rides', label: L.metricRides, align: 'right', format: 'number' },
    { key: 'revenue', label: L.metricRevenueBam, align: 'right', format: 'currency' },
    { key: 'avgBam', label: L.metricAvgBam, align: 'right', format: 'currency' },
    { key: 'cancelled', label: L.colCancelled, align: 'right', format: 'number' },
    { key: 'busiestDriver', label: L.colBusiestDriver },
  ]
  const rows: ReportRow[] = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, dayRides]) => {
      const completed = dayRides.filter((r) => r.status === 'zavrsena')
      const revenue = completed.reduce((sum, r) => sum + ridePrice(r), 0)
      return {
        date: day,
        rides: dayRides.length,
        revenue,
        avgBam: completed.length ? revenue / completed.length : 0,
        cancelled: dayRides.filter((r) => r.status === 'otkazana').length,
        busiestDriver: topDriverLabel(dayRides),
      }
    })

  const completed = rides.filter((r) => r.status === 'zavrsena')
  const totalRevenue = completed.reduce((s, r) => s + ridePrice(r), 0)

  return {
    meta: baseMeta('revenue_by_day', L.titleRevenueByDay, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'business',
      subtitle: L.subtitleRevenueByDay,
    }),
    legend: [{ key: 'subtotal', label: L.legendSubtotalDay, swatch: '#0f172a' }],
    sections: [
      {
        columns,
        groups: [
          {
            breakLabel: L.groupRevenueDays,
            rows,
            subtotal: { values: { days: rows.length, rides: rides.length, completed: completed.length, revenueBam: totalRevenue.toFixed(2) } },
          },
        ],
      },
    ],
    summary: { days: rows.length, rides: rides.length, revenueBam: totalRevenue.toFixed(2) },
  }
}

function buildRidesCountSummary(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const rides = db.rides.filter((r) => isInDateRange(rideActivityIso(r), from, to) && rideMatchesFilters(r, params))
  const countColumns: ReportColumn[] = [
    { key: 'label', label: L.colGroup },
    { key: 'total', label: L.metricTotal, align: 'right', format: 'number' },
    { key: 'completed', label: L.colCompleted, align: 'right', format: 'number' },
    { key: 'cancelled', label: L.colCancelled, align: 'right', format: 'number' },
    { key: 'failed', label: L.colFailed, align: 'right', format: 'number' },
    { key: 'active', label: L.colActive, align: 'right', format: 'number' },
    { key: 'revenue', label: L.metricRevenueBam, align: 'right', format: 'currency' },
  ]

  function countRow(label: string, groupRides: Ride[]): ReportRow {
    return {
      label,
      total: groupRides.length,
      completed: groupRides.filter((r) => r.status === 'zavrsena').length,
      cancelled: groupRides.filter((r) => r.status === 'otkazana').length,
      failed: groupRides.filter((r) => r.status === 'neuspjesna').length,
      active: groupRides.filter((r) => ACTIVE_RIDE_STATUSES.has(r.status)).length,
      revenue: groupRides.reduce((sum, r) => sum + (r.status === 'zavrsena' ? ridePrice(r) : 0), 0),
    }
  }

  const byDay = new Map<string, Ride[]>()
  const byDriver = new Map<string, Ride[]>()
  for (const ride of rides) {
    const day = calendarDayKey(rideActivityIso(ride))
    byDay.set(day, [...(byDay.get(day) ?? []), ride])
    byDriver.set(ride.driverId, [...(byDriver.get(ride.driverId) ?? []), ride])
  }
  const byDayRows = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, dayRides]) => countRow(day, dayRides))
  const byDriverRows = [...byDriver.entries()].sort((a, b) => b[1].length - a[1].length).map(([driverId, driverRides]) => countRow(driverName(driverId), driverRides))

  return {
    meta: baseMeta('rides_count_summary', L.titleRidesCount, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'performance',
      subtitle: L.subtitleRidesCount,
    }),
    legend: statusLegend(L),
    sections: [
      { title: L.sectionRidesByDay, columns: countColumns, groups: [{ breakLabel: L.groupRideCountsByDay, rows: byDayRows }] },
      { title: L.sectionRidesByDriver, columns: countColumns, groups: [{ breakLabel: L.groupRideCountsByDriver, rows: byDriverRows }] },
    ],
    summary: { total: rides.length, completed: rides.filter((r) => r.status === 'zavrsena').length },
  }
}

function buildDriverPerformance(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const driverFilter = activeFilter(params.driverId)
  const columns: ReportColumn[] = [
    { key: 'driver', label: L.colDriver },
    { key: 'accepted', label: L.colAccepted, align: 'right', format: 'number' },
    { key: 'rejected', label: L.colRejected, align: 'right', format: 'number' },
    { key: 'completed', label: L.colCompleted, align: 'right', format: 'number' },
    { key: 'avgRating', label: L.colAvgRating, align: 'right' },
    { key: 'revenue', label: L.colRevenue, align: 'right', format: 'currency' },
    { key: 'avgArrivalMin', label: L.colAvgArrival, align: 'right' },
    { key: 'acceptanceRate', label: L.colAcceptanceRate, align: 'right' },
  ]

  const rows = db.drivers
    .filter((driver) => !driverFilter || driver.id === driverFilter)
    .map((driver) => {
      const rides = db.rides.filter(
        (ride) =>
          ride.driverId === driver.id &&
          isInDateRange(rideActivityIso(ride), from, to) &&
          rideMatchesFilters(ride, { ...params, driverId: driver.id })
      )
      const completed = rides.filter((ride) => ride.status === 'zavrsena')
      const ratings = db.ratings.filter((rating) => completed.some((ride) => ride.id === rating.rideId))
      const arrivalValues = completed.map(arrivalMinutes).filter((n): n is number => n !== undefined)
      return {
        driver: driverName(driver.id),
        accepted: rides.length,
        rejected: rejectedCountForDriver(driver, from, to),
        completed: completed.length,
        avgRating: ratings.length ? average(ratings.map((r) => r.stars)).toFixed(1) : driver.rating.toFixed(1),
        revenue: completed.reduce((sum, ride) => sum + ridePrice(ride), 0),
        avgArrivalMin: arrivalValues.length ? `${Math.round(average(arrivalValues))} min` : '-',
        acceptanceRate: `${acceptanceRateForDriver(driver)}%`,
      }
    })
    .sort((a, b) => Number(b.completed) - Number(a.completed))

  return {
    meta: baseMeta('driver_performance', L.titleDriverPerformance, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'performance',
      subtitle: L.subtitleDriverPerformance,
    }),
    legend: [{ key: 'driver_performance', label: L.legendDriverPerformance, swatch: '#16a34a' }],
    sections: [{ columns, groups: [{ breakLabel: L.groupPerformance, rows }] }],
    summary: {
      drivers: rows.length,
      accepted: rows.reduce((sum, row) => sum + Number(row.accepted), 0),
      rejected: rows.reduce((sum, row) => sum + Number(row.rejected), 0),
      completed: rows.reduce((sum, row) => sum + Number(row.completed), 0),
      revenueBam: rows.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
    },
  }
}

function buildWaitingByZone(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'zone', label: L.colZone },
    { key: 'requests', label: L.metricRequests, align: 'right', format: 'number' },
    { key: 'rides', label: L.metricRides, align: 'right', format: 'number' },
    { key: 'avgWaitMin', label: L.metricAverageWaitMin, align: 'right' },
    { key: 'longWaitCount', label: L.colLongWait, align: 'right', format: 'number' },
    { key: 'cancelled', label: L.colCancelled, align: 'right', format: 'number' },
  ]
  const requests = db.rideRequests.filter((req) => isInDateRange(req.createdAt, from, to) && requestMatchesFilters(req, params))
  const rows: ReportRow[] = (['center', 'new_sarajevo', 'airport', 'north', 'other'] as ReportZoneKey[])
    .map((key) => {
      const zoneRequests = requests.filter((req) => zoneKey(req.pickup) === key)
      const waits = zoneRequests.map((req) => {
        const ride = req.rideId ? db.rides.find((r) => r.id === req.rideId) ?? null : null
        return waitMinutesForRequest(req, ride)
      })
      return {
        zone: zoneLabel(key, L),
        requests: zoneRequests.length,
        rides: zoneRequests.filter((req) => req.rideId).length,
        avgWaitMin: waits.length ? `${Math.round(average(waits))} min` : '-',
        longWaitCount: waits.filter((n) => n > LONG_WAIT_MINUTES).length,
        cancelled: zoneRequests.filter((req) => req.status === 'otkazan').length,
      }
    })
    .filter((row) => Number(row.requests) > 0 || activeFilter(params.zoneId))

  const allWaits = requests.map((req) => {
    const ride = req.rideId ? db.rides.find((r) => r.id === req.rideId) ?? null : null
    return waitMinutesForRequest(req, ride)
  })

  return {
    meta: baseMeta('waiting_by_zone', L.titleWaitingByZone, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'performance',
      subtitle: L.subtitleWaitingByZone,
    }),
    legend: [{ key: 'long_wait', label: L.legendLongWait, swatch: '#dc2626' }],
    sections: [{ columns, groups: [{ breakLabel: L.groupWaitingZones, rows }] }],
    summary: {
      requests: requests.length,
      averageWaitMin: allWaits.length ? `${Math.round(average(allWaits))} min` : '-',
      longWaitCount: rows.reduce((sum, row) => sum + Number(row.longWaitCount), 0),
    },
  }
}

function buildCancellationsByPeriod(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'date', label: L.colDate },
    { key: 'cancelledRides', label: L.colCancelledRides, align: 'right', format: 'number' },
    { key: 'cancelledRequests', label: L.colCancelledRequests, align: 'right', format: 'number' },
    { key: 'total', label: L.metricTotal, align: 'right', format: 'number' },
    { key: 'avgWaitMin', label: L.metricAverageWaitMin, align: 'right' },
    { key: 'topReason', label: L.colTopReason },
  ]
  const rideRows = db.rides
    .filter((ride) => ride.status === 'otkazana' && ride.cancelledAt && isInDateRange(ride.cancelledAt, from, to) && rideMatchesFilters(ride, params))
    .map((ride) => ({ date: calendarDayKey(ride.cancelledAt!), kind: 'ride', wait: minutesBetween(ride.createdAt, ride.cancelledAt) ?? 0, reason: ride.cancellationReason }))
  const requestRows = db.rideRequests
    .filter((req) => req.status === 'otkazan' && isInDateRange(req.createdAt, from, to) && requestMatchesFilters(req, params))
    .map((req) => ({ date: calendarDayKey(req.createdAt), kind: 'request', wait: 0, reason: req.cancellationReason }))
  const allRows = [...rideRows, ...requestRows]
  const byDay = new Map<string, typeof allRows>()
  for (const row of allRows) byDay.set(row.date, [...(byDay.get(row.date) ?? []), row])
  const rows: ReportRow[] = [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({
      date: day,
      cancelledRides: items.filter((item) => item.kind === 'ride').length,
      cancelledRequests: items.filter((item) => item.kind === 'request').length,
      total: items.length,
      avgWaitMin: items.length ? `${Math.round(average(items.map((item) => item.wait)))} min` : '-',
      topReason: topReason(items),
    }))

  return {
    meta: baseMeta('cancellations_by_period', L.titleCancellationsByPeriod, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'business',
      subtitle: L.subtitleCancellationsByPeriod,
    }),
    legend: [{ key: 'cancelled', label: L.legendCancelledItem, swatch: '#dc2626' }],
    sections: [{ columns, groups: [{ breakLabel: L.groupCancellationDays, rows }] }],
    summary: { total: allRows.length, cancelled: rideRows.length, cancelledRequests: requestRows.length },
  }
}

function buildConflictAssignments(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'when', label: L.colWhen, format: 'datetime' },
    { key: 'requestId', label: L.colRequestId },
    { key: 'rideId', label: L.colRide },
    { key: 'passenger', label: L.colPassenger },
    { key: 'previousDriver', label: L.colPreviousDriver },
    { key: 'newDriver', label: L.colNewDriver },
    { key: 'message', label: L.colMessage },
    { key: 'statusResolution', label: L.colStatusResolution },
  ]
  const logs = db.dispatchLogs.filter((log) => {
    if (log.kind !== 'ride' || log.meta?.action !== 'reassign' || !isInDateRange(log.createdAt, from, to)) return false
    const ride = log.rideId ? db.rides.find((r) => r.id === log.rideId) : undefined
    const driverId = activeFilter(params.driverId)
    if (driverId && log.driverId !== driverId && log.meta?.previousDriverId !== driverId && log.meta?.newDriverId !== driverId) return false
    if (activeFilter(params.zoneId) && ride && zoneKey(ride.pickup) !== params.zoneId) return false
    return true
  })
  const rows: ReportRow[] = logs.map((log) => {
    const ride = log.rideId ? db.rides.find((r) => r.id === log.rideId) : undefined
    const request = log.requestId ? db.rideRequests.find((r) => r.id === log.requestId) : ride ? requestForRide(ride) : undefined
    return {
      when: log.createdAt,
      requestId: log.requestId ?? request?.id ?? '-',
      rideId: log.rideId ?? '-',
      passenger: request ? passengerName(request.passengerId, L) : '-',
      previousDriver: driverName(String(log.meta?.previousDriverId ?? '')),
      newDriver: driverName(String(log.meta?.newDriverId ?? log.driverId ?? '')),
      message: log.message,
      statusResolution: ride ? dispatchRideStatusLabel(ride.status) : L.resolutionLogged,
    }
  })

  return {
    meta: baseMeta('conflict_assignments', L.titleConflictAssignments, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'decision',
      subtitle: L.subtitleConflictAssignments,
    }),
    legend: [{ key: 'reassign', label: L.legendReassign, swatch: '#ea580c' }],
    sections: [{ columns, groups: [{ breakLabel: L.groupReassignments, rows }] }],
    summary: { count: rows.length },
  }
}

function buildCancelledRides(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'requestId', label: L.colRequestId },
    { key: 'when', label: L.colDate, format: 'datetime' },
    { key: 'passenger', label: L.colPassenger },
    { key: 'driver', label: L.colDriver },
    { key: 'reason', label: L.colReason },
    { key: 'waitMin', label: L.colWaitBeforeCancel, align: 'right', format: 'number' },
    { key: 'dispatcherNote', label: L.colDispatcherNote },
    { key: 'statusResolution', label: L.colStatusResolution },
  ]

  function dispatchNote(rideId?: string, requestId?: string): string {
    const log = db.dispatchLogs.find((item) => (rideId && item.rideId === rideId) || (requestId && item.requestId === requestId))
    return log?.message ?? '-'
  }

  const rideRows: ReportRow[] = db.rides
    .filter((r) => r.status === 'otkazana' && r.cancelledAt && isInDateRange(r.cancelledAt, from, to) && rideMatchesFilters(r, params))
    .map((ride) => ({
      requestId: ride.requestId,
      when: ride.cancelledAt!,
      passenger: passengerName(ride.passengerId, L),
      driver: driverName(ride.driverId),
      reason: ride.cancellationReason ?? '-',
      waitMin: minutesBetween(ride.createdAt, ride.cancelledAt) ?? 0,
      dispatcherNote: dispatchNote(ride.id, ride.requestId),
      statusResolution: dispatchRideStatusLabel(ride.status),
    }))
  const requestRows: ReportRow[] = db.rideRequests
    .filter((req) => req.status === 'otkazan' && isInDateRange(req.createdAt, from, to) && requestMatchesFilters(req, params))
    .map((req) => ({
      requestId: req.id,
      when: req.createdAt,
      passenger: passengerName(req.passengerId, L),
      driver: req.rideId ? driverName(db.rides.find((ride) => ride.id === req.rideId)?.driverId ?? '') : '-',
      reason: req.cancellationReason ?? '-',
      waitMin: 0,
      dispatcherNote: dispatchNote(req.rideId, req.id),
      statusResolution: `${dispatchRideStatusLabel(req.status)} / ${accountLabel(req.cancelledByAccountId)}`,
    }))
  const rows = [...rideRows, ...requestRows].sort((a, b) => String(b.when).localeCompare(String(a.when)))

  return {
    meta: baseMeta('cancelled_rides', L.titleCancelledRides, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'decision',
    }),
    legend: [{ key: 'cancelled', label: L.legendCancelledItem, swatch: '#dc2626' }],
    sections: [{ columns, groups: [{ breakLabel: L.groupCancelledItems, rows }] }],
    summary: { count: rows.length },
  }
}

function buildComplaintsReport(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'complaintId', label: L.colComplaintId },
    { key: 'when', label: L.colWhen, format: 'datetime' },
    { key: 'rideId', label: L.colRide },
    { key: 'passenger', label: L.colPassenger },
    { key: 'driver', label: L.colDriver },
    { key: 'category', label: L.colCategory },
    { key: 'status', label: L.colStatus },
    { key: 'message', label: L.colMessage },
    { key: 'resolution', label: L.colResolution },
  ]
  const complaints = db.complaints.filter((complaint) => {
    if (!isInDateRange(complaint.createdAt, from, to)) return false
    const ride = db.rides.find((r) => r.id === complaint.rideId)
    if (ride && !rideMatchesFilters(ride, { ...params, status: undefined })) return false
    const status = activeFilter(params.status)
    if (status && complaint.status !== status && ride?.status !== status) return false
    return true
  })
  const byStatus = new Map<string, Complaint[]>()
  for (const complaint of complaints) byStatus.set(complaint.status, [...(byStatus.get(complaint.status) ?? []), complaint])
  const groups: ReportGroup[] = [...byStatus.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([status, statusComplaints]) => ({
      breakLabel: status,
      rows: statusComplaints.map((complaint) => {
        const ride = db.rides.find((r) => r.id === complaint.rideId)
        return {
          complaintId: complaint.id,
          when: complaint.createdAt,
          rideId: complaint.rideId,
          passenger: ride ? passengerName(ride.passengerId, L) : accountLabel(complaint.submittedByAccountId),
          driver: ride ? driverName(ride.driverId) : '-',
          category: complaint.category,
          status: complaint.status,
          message: complaint.description,
          resolution: complaint.outcome ?? complaint.resolvedAt ?? '-',
        }
      }),
      subtotal: { values: { complaints: statusComplaints.length } },
    }))

  return {
    meta: baseMeta('complaints_report', L.titleComplaintsReport, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'quality',
      subtitle: L.subtitleComplaintsReport,
    }),
    legend: [{ key: 'complaint', label: L.legendComplaint, swatch: '#7c3aed' }],
    sections: [{ columns, groups: groups.length ? groups : [{ breakLabel: L.groupComplaints, rows: [] }] }],
    summary: { complaints: complaints.length },
  }
}

function buildOperationalExceptions(params: ReportBuildParams, generatedBy?: string): ReportDocument {
  const L = getReportBuildLabels()
  const db = getDb()
  const { from, to } = params
  const columns: ReportColumn[] = [
    { key: 'when', label: L.colWhen, format: 'datetime' },
    { key: 'exceptionType', label: L.colExceptionType },
    { key: 'severity', label: L.colSeverity },
    { key: 'rideOrRequest', label: L.colRelated },
    { key: 'passenger', label: L.colPassenger },
    { key: 'driver', label: L.colDriver },
    { key: 'message', label: L.colMessage },
    { key: 'statusResolution', label: L.colStatusResolution },
  ]
  const nowIso = new Date().toISOString()
  const rows: ReportRow[] = []

  for (const request of db.rideRequests.filter((req) => isInDateRange(req.createdAt, from, to) && requestMatchesFilters(req, params))) {
    const ride = request.rideId ? db.rides.find((r) => r.id === request.rideId) ?? null : null
    const wait = waitMinutesForRequest(request, ride)
    if (wait > LONG_WAIT_MINUTES && (!ride || ride.status !== 'zavrsena')) {
      rows.push({
        when: request.createdAt,
        exceptionType: L.exceptionLongWait,
        severity: wait > 20 ? L.severityDanger : L.severityWarning,
        rideOrRequest: ride?.id ?? request.id,
        passenger: passengerName(request.passengerId, L),
        driver: ride ? driverName(ride.driverId) : '-',
        message: `${wait} min`,
        statusResolution: ride ? dispatchRideStatusLabel(ride.status) : dispatchRideStatusLabel(request.status),
      })
    }
    if (request.status === 'neuspjesan') {
      rows.push({
        when: request.createdAt,
        exceptionType: L.exceptionFailedAssignment,
        severity: L.severityDanger,
        rideOrRequest: request.id,
        passenger: passengerName(request.passengerId, L),
        driver: ride ? driverName(ride.driverId) : '-',
        message: request.cancellationReason ?? L.exceptionFailedAssignment,
        statusResolution: dispatchRideStatusLabel(request.status),
      })
    }
  }

  for (const ride of db.rides.filter((r) => isInDateRange(rideActivityIso(r), from, to) && rideMatchesFilters(r, params))) {
    if (ride.status === 'neuspjesna' || ride.status === 'problematicna') {
      rows.push({
        when: rideActivityIso(ride),
        exceptionType: ride.status === 'neuspjesna' ? L.exceptionFailedAssignment : L.exceptionProblemRide,
        severity: L.severityDanger,
        rideOrRequest: ride.id,
        passenger: passengerName(ride.passengerId, L),
        driver: driverName(ride.driverId),
        message: ride.cancellationReason ?? dispatchRideStatusLabel(ride.status),
        statusResolution: dispatchRideStatusLabel(ride.status),
      })
    }
  }

  for (const complaint of db.complaints.filter((c) => isInDateRange(c.createdAt, from, to))) {
    const ride = db.rides.find((r) => r.id === complaint.rideId)
    if (ride && !rideMatchesFilters(ride, { ...params, status: undefined })) continue
    if (complaint.status !== 'zaprimljena' && complaint.status !== 'u_obradi') continue
    rows.push({
      when: complaint.createdAt,
      exceptionType: L.exceptionComplaint,
      severity: complaint.status === 'u_obradi' ? L.severityDanger : L.severityWarning,
      rideOrRequest: complaint.rideId,
      passenger: ride ? passengerName(ride.passengerId, L) : accountLabel(complaint.submittedByAccountId),
      driver: ride ? driverName(ride.driverId) : '-',
      message: complaint.description,
      statusResolution: complaint.status,
    })
  }

  for (const driver of db.drivers.filter((d) => !activeFilter(params.driverId) || d.id === params.driverId)) {
    const ui = driverLinkedUi(driver)
    const lastGps = ui?.settings.lastGpsReadAt
    const gpsStale = lastGps ? Date.now() - new Date(lastGps).getTime() > 10 * 60_000 : false
    const rejected = rejectedCountForDriver(driver, from, to)
    const acceptance = acceptanceRateForDriver(driver)
    if (driver.availabilityStatus === 'van_funkcije' && isInDateRange(nowIso, from, to)) {
      rows.push({
        when: nowIso,
        exceptionType: L.exceptionDriverUnavailable,
        severity: L.severityDanger,
        rideOrRequest: '-',
        passenger: '-',
        driver: driverName(driver.id),
        message: L.exceptionDriverUnavailable,
        statusResolution: driver.availabilityStatus,
      })
    }
    if (gpsStale && lastGps && isInDateRange(lastGps, from, to)) {
      rows.push({
        when: lastGps,
        exceptionType: L.exceptionStaleGps,
        severity: L.severityWarning,
        rideOrRequest: '-',
        passenger: '-',
        driver: driverName(driver.id),
        message: L.exceptionStaleGps,
        statusResolution: driver.availabilityStatus,
      })
    }
    if ((rejected >= 3 || acceptance < 80) && isInDateRange(nowIso, from, to)) {
      rows.push({
        when: nowIso,
        exceptionType: L.exceptionHighRejection,
        severity: acceptance < 75 ? L.severityDanger : L.severityWarning,
        rideOrRequest: '-',
        passenger: '-',
        driver: driverName(driver.id),
        message: `${L.colRejected}: ${rejected}, ${L.colAcceptanceRate}: ${acceptance}%`,
        statusResolution: L.resolutionNeedsReview,
      })
    }
  }

  const sortedRows = rows.sort((a, b) => String(b.when).localeCompare(String(a.when)))

  return {
    meta: baseMeta('operational_exceptions', L.titleOperationalExceptions, {
      from,
      to,
      generatedBy,
      audience: 'dispatcher',
      goalTag: 'quality',
      subtitle: L.subtitleOperationalExceptions,
    }),
    legend: [
      { key: 'warning', label: L.severityWarning, swatch: '#ca8a04' },
      { key: 'danger', label: L.severityDanger, swatch: '#dc2626' },
    ],
    sections: [{ columns, groups: [{ breakLabel: L.groupOperationalExceptions, rows: sortedRows }] }],
    summary: { count: sortedRows.length },
  }
}

function buildInvoice(ride: Ride, passengerAccountId: string): ReportDocument | { error: string } {
  const L = getReportBuildLabels()
  const profile = getDb().profiles.find((p) => p.accountId === passengerAccountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }
  if (ride.status !== 'zavrsena') return { error: 'not_completed' }

  const columns: ReportColumn[] = [
    { key: 'label', label: L.colLabel },
    { key: 'value', label: L.colValue, align: 'right' },
  ]
  const rows: ReportRow[] = [
    { label: L.rowRoute, value: routeLabel(ride.pickup, ride.destination) },
    { label: L.rowDistance, value: `${ride.distanceKm.toFixed(1)} km` },
    { label: L.rowDurationEst, value: `${ride.estimatedDurationMin} min` },
    { label: L.rowPayment, value: paymentLabel(ride.paymentMethod, L) },
    { label: L.rowTotal, value: `${ridePrice(ride).toFixed(2)} BAM` },
  ]

  return {
    meta: baseMeta('invoice', L.invoiceTitle, {
      generatedBy: `${profile.firstName} ${profile.lastName}`,
      audience: 'passenger',
      subtitle: L.invoiceRideSubtitle.replace('{id}', ride.id),
    }),
    sections: [{ columns, groups: [{ breakLabel: L.groupBillingItems, rows }] }],
    summary: {
      invoiceNo: `INV-${ride.id}`,
      date: formatBsDate(ride.finishedAt ?? ride.createdAt),
      amountBam: ridePrice(ride).toFixed(2),
    },
  }
}

function buildBookingConfirmation(request: RideRequest, passengerAccountId: string): ReportDocument | { error: string } {
  const L = getReportBuildLabels()
  const profile = getDb().profiles.find((p) => p.accountId === passengerAccountId)
  if (!profile || request.passengerId !== profile.id) return { error: 'forbidden' }

  const columns: ReportColumn[] = [
    { key: 'label', label: L.colField },
    { key: 'value', label: L.colValue },
  ]
  const rows: ReportRow[] = [
    { label: L.rowBookingNo, value: request.id },
    { label: L.rowPickup, value: request.pickup.label },
    { label: L.rowDestination, value: request.destination.label },
    { label: L.rowScheduled, value: request.scheduledAt ? formatBsDateTime(request.scheduledAt) : '-' },
    { label: L.rowEstPrice, value: `${request.estimatedPrice.toFixed(2)} BAM` },
    { label: L.colStatus, value: dispatchRideStatusLabel(request.status) },
  ]

  return {
    meta: baseMeta('booking_confirmation', L.bookingTitle, {
      generatedBy: `${profile.firstName} ${profile.lastName}`,
      audience: 'passenger',
      subtitle: request.id,
    }),
    sections: [{ columns, groups: [{ breakLabel: L.groupBookingData, rows }] }],
    summary: { confirmationNo: `BK-${request.id}` },
  }
}

function buildRideConfirmation(ride: Ride, passengerAccountId: string): ReportDocument | { error: string } {
  const L = getReportBuildLabels()
  const profile = getDb().profiles.find((p) => p.accountId === passengerAccountId)
  if (!profile || ride.passengerId !== profile.id) return { error: 'forbidden' }

  const driver = getDb().drivers.find((d) => d.id === ride.driverId)
  const vehicle = getDb().vehicles.find((v) => v.id === ride.vehicleId)

  const columns: ReportColumn[] = [
    { key: 'label', label: L.colField },
    { key: 'value', label: L.colValue },
  ]
  const rows: ReportRow[] = [
    { label: L.rowRideNo, value: ride.id },
    { label: L.rowRoute, value: routeLabel(ride.pickup, ride.destination) },
    { label: L.colDriver, value: driver ? `${driver.firstName} ${driver.lastName}` : '-' },
    { label: L.rowVehicle, value: vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.registration}` : '-' },
    { label: L.colStatus, value: dispatchRideStatusLabel(ride.status) },
    { label: L.rowEstPrice, value: `${ride.estimatedPrice.toFixed(2)} BAM` },
  ]

  return {
    meta: baseMeta('ride_confirmation', L.rideConfirmTitle, {
      generatedBy: `${profile.firstName} ${profile.lastName}`,
      audience: 'passenger',
      subtitle: ride.id,
    }),
    sections: [{ columns, groups: [{ breakLabel: L.groupRideData, rows }] }],
    summary: { confirmationNo: `RC-${ride.id}` },
  }
}

export async function buildInternalReport(
  type: InternalReportType,
  params: ReportBuildParams
): Promise<ReportDocument> {
  await delay(80)
  const { from, to } = parseRangeFromInputs(params.from, params.to)
  const buildParams = { ...params, from, to }
  const generatedBy = params.dispatcherAccountId ? dispatcherDisplay(params.dispatcherAccountId) : undefined

  switch (type) {
    case 'rides_detail':
      return buildRidesDetail(buildParams, generatedBy)
    case 'ride_requests_detail':
      return buildRideRequestsDetail(buildParams, generatedBy)
    case 'driver_activity_detail':
      return buildDriverActivityDetail(buildParams, generatedBy)
    case 'revenue_by_day':
      return buildRevenueByDay(buildParams, generatedBy)
    case 'rides_count_summary':
      return buildRidesCountSummary(buildParams, generatedBy)
    case 'driver_performance':
      return buildDriverPerformance(buildParams, generatedBy)
    case 'waiting_by_zone':
      return buildWaitingByZone(buildParams, generatedBy)
    case 'cancellations_by_period':
      return buildCancellationsByPeriod(buildParams, generatedBy)
    case 'conflict_assignments':
      return buildConflictAssignments(buildParams, generatedBy)
    case 'cancelled_rides':
      return buildCancelledRides(buildParams, generatedBy)
    case 'complaints_report':
      return buildComplaintsReport(buildParams, generatedBy)
    case 'operational_exceptions':
      return buildOperationalExceptions(buildParams, generatedBy)
    default:
      return buildRidesDetail(buildParams, generatedBy)
  }
}

export async function buildPassengerDocument(
  type: ExternalDocumentType,
  entityId: string,
  passengerAccountId: string
): Promise<ReportDocument | { error: string }> {
  await delay(80)
  const db = getDb()

  if (type === 'invoice') {
    const ride = db.rides.find((r) => r.id === entityId)
    if (!ride) return { error: 'not_found' }
    return buildInvoice(ride, passengerAccountId)
  }
  if (type === 'booking_confirmation') {
    const request = db.rideRequests.find((r) => r.id === entityId)
    if (!request) return { error: 'not_found' }
    return buildBookingConfirmation(request, passengerAccountId)
  }
  if (type === 'ride_confirmation') {
    const ride = db.rides.find((r) => r.id === entityId)
    if (!ride) return { error: 'not_found' }
    return buildRideConfirmation(ride, passengerAccountId)
  }
  return { error: 'unknown_type' }
}

export function isInternalReportType(value: string): value is InternalReportType {
  return [
    'rides_detail',
    'ride_requests_detail',
    'driver_activity_detail',
    'revenue_by_day',
    'rides_count_summary',
    'driver_performance',
    'waiting_by_zone',
    'cancellations_by_period',
    'conflict_assignments',
    'cancelled_rides',
    'complaints_report',
    'operational_exceptions',
  ].includes(value)
}

export function isExternalDocumentType(value: string): value is ExternalDocumentType {
  return ['invoice', 'booking_confirmation', 'ride_confirmation'].includes(value)
}

export const INTERNAL_REPORT_CATALOG: Array<{
  type: InternalReportType
  goalTag: ReportDocument['meta']['goalTag']
}> = [
  { type: 'rides_detail', goalTag: 'performance' },
  { type: 'ride_requests_detail', goalTag: 'decision' },
  { type: 'driver_activity_detail', goalTag: 'performance' },
  { type: 'revenue_by_day', goalTag: 'business' },
  { type: 'rides_count_summary', goalTag: 'performance' },
  { type: 'driver_performance', goalTag: 'performance' },
  { type: 'waiting_by_zone', goalTag: 'performance' },
  { type: 'cancellations_by_period', goalTag: 'business' },
  { type: 'conflict_assignments', goalTag: 'decision' },
  { type: 'cancelled_rides', goalTag: 'decision' },
  { type: 'complaints_report', goalTag: 'quality' },
  { type: 'operational_exceptions', goalTag: 'quality' },
]
