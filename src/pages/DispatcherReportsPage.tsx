import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarRange,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  Gauge,
  ListChecks,
  MapPinned,
  MessageSquare,
  ShieldCheck,
  Star,
  Timer,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../components/common/LoadingState'
import { KpiCard } from '../components/dispatch/dispatchUi'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useDispatchData } from '../hooks/useDispatchSnapshot'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { isInDateRange, rideActivityIso, todayReportRange } from '../lib/reports/reportFilters'
import { strings } from '../i18n/strings'
import { INTERNAL_REPORT_CATALOG } from '../services/reportApi'
import { dispatcherCan } from '../services/dispatcherApi'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import type { InternalReportType, ReportGoalTag } from '../types/reports'

const REPORT_ICONS: Record<InternalReportType, typeof BarChart3> = {
  rides_detail: ClipboardList,
  ride_requests_detail: ListChecks,
  driver_activity_detail: Activity,
  revenue_by_day: FileSpreadsheet,
  rides_count_summary: BarChart3,
  driver_performance: Gauge,
  waiting_by_zone: Timer,
  cancellations_by_period: XCircle,
  conflict_assignments: AlertTriangle,
  cancelled_rides: CalendarRange,
  complaints_report: MessageSquare,
  operational_exceptions: AlertTriangle,
}

function goalLabel(goal: ReportGoalTag | undefined, r: ReturnType<typeof strings>['dispatcher']['reports']): string {
  if (goal === 'decision') return r.goalDecision
  if (goal === 'business') return r.goalBusiness
  if (goal === 'quality') return r.goalQuality
  return r.goalPerformance
}

function typeLabel(type: InternalReportType, r: ReturnType<typeof strings>['dispatcher']['reports']): string {
  const map: Record<InternalReportType, string> = {
    rides_detail: r.typeRidesDetail,
    ride_requests_detail: r.typeRideRequestsDetail,
    driver_activity_detail: r.typeDriverActivityDetail,
    revenue_by_day: r.typeRevenueByDay,
    rides_count_summary: r.typeRidesCount,
    driver_performance: r.typeDriverPerformance,
    waiting_by_zone: r.typeWaitingByZone,
    cancellations_by_period: r.typeCancellationsByPeriod,
    conflict_assignments: r.typeConflictAssignments,
    cancelled_rides: r.typeCancelledRides,
    complaints_report: r.typeComplaintsReport,
    operational_exceptions: r.typeOperationalExceptions,
  }
  return map[type]
}

function typeDesc(type: InternalReportType, r: ReturnType<typeof strings>['dispatcher']['reports']): string {
  const map: Record<InternalReportType, string> = {
    rides_detail: r.typeRidesDetailDesc,
    ride_requests_detail: r.typeRideRequestsDetailDesc,
    driver_activity_detail: r.typeDriverActivityDetailDesc,
    revenue_by_day: r.typeRevenueByDayDesc,
    rides_count_summary: r.typeRidesCountDesc,
    driver_performance: r.typeDriverPerformanceDesc,
    waiting_by_zone: r.typeWaitingByZoneDesc,
    cancellations_by_period: r.typeCancellationsByPeriodDesc,
    conflict_assignments: r.typeConflictAssignmentsDesc,
    cancelled_rides: r.typeCancelledRidesDesc,
    complaints_report: r.typeComplaintsReportDesc,
    operational_exceptions: r.typeOperationalExceptionsDesc,
  }
  return map[type]
}

export function DispatcherReportsPage() {
  useLangRefresh()
  const t = strings()
  const r = t.dispatcher.reports
  const { me } = useDispatcherSession()
  const { data, isPending } = useDispatchData()
  const canView = dispatcherCan(me.dispatcherProfile.roleLevel, 'view_reports')
  const today = useMemo(() => todayReportRange(), [])

  const todayStats = useMemo(() => {
    if (!data) return null
    const ridesToday = data.rides.filter((row) => {
      const iso = row.ride ? rideActivityIso(row.ride) : row.createdAt
      return isInDateRange(iso, today.from, today.to)
    })
    const completedToday = ridesToday.filter((row) => row.status === 'zavrsena')
    const revenueToday = completedToday.reduce(
      (sum, row) => sum + (row.ride?.finalPrice ?? row.ride?.estimatedPrice ?? row.estimatedPrice ?? 0),
      0
    )
    const averageRevenue = completedToday.length ? revenueToday / completedToday.length : 0

    const driverStats = data.drivers.map((row) => {
      const rides = ridesToday.filter((ride) => ride.ride?.driverId === row.driver.id)
      const revenue = rides.reduce(
        (sum, ride) => sum + (ride.ride?.finalPrice ?? ride.ride?.estimatedPrice ?? ride.estimatedPrice ?? 0),
        0
      )
      return {
        id: row.driver.id,
        name: `${row.driver.firstName} ${row.driver.lastName}`,
        rides: rides.length,
        revenue,
      }
    })

    const zoneStats = [
      {
        label: r.zoneCenter,
        rides: ridesToday.filter((row) => row.pickupLabel.includes('Baš') || row.pickupLabel.includes('Centar')).length,
      },
      {
        label: r.zoneNewSarajevo,
        rides: ridesToday.filter((row) => row.pickupLabel.includes('Ilid') || row.pickupLabel.includes('Grbavica')).length,
      },
      {
        label: r.zoneAirport,
        rides: ridesToday.filter(
          (row) => row.destinationLabel.includes('Aerodrom') || row.pickupLabel.includes('Aerodrom')
        ).length,
      },
    ]
    const activeZones = zoneStats.filter((z) => z.rides > 0).length

    return {
      ridesToday: ridesToday.length,
      averageRevenue,
      driverStats,
      zoneStats,
      activeZones,
    }
  }, [data, r.zoneAirport, r.zoneCenter, r.zoneNewSarajevo, today.from, today.to])

  if (isPending && !data) return <LoadingState />

  if (!canView) {
    return (
      <Card className={passengerAppCardClassName}>
        <CardContent className="py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" />
          <p className="mt-3 text-lg font-bold text-brand-navy">{r.lockedTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{r.lockedBody}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return <LoadingState />

  const query = `?from=${today.from}&to=${today.to}`

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-navy">{r.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{r.subtitle}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">{r.tutorialNote}</p>
      </div>

      {todayStats ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<BarChart3 className="h-5 w-5" />} label={r.kpiTotalRides} value={todayStats.ridesToday} />
          <KpiCard
            icon={<Wallet className="h-5 w-5" />}
            label={r.kpiAvgRevenueToday}
            value={`${todayStats.averageRevenue.toFixed(2)} BAM`}
          />
          <KpiCard icon={<Clock className="h-5 w-5" />} label={r.kpiAnomalies} value={data.anomalies.length} tone="warning" />
          <KpiCard
            icon={<MapPinned className="h-5 w-5" />}
            label={r.zonesTitle}
            value={r.kpiZonesActive.replace('{count}', String(todayStats.activeZones))}
          />
          <KpiCard
            icon={<Star className="h-5 w-5" />}
            label={r.kpiComplaints}
            value={data.complaints.length}
            tone={data.complaints.length ? 'danger' : 'default'}
          />
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-bold text-brand-navy">{r.catalogTitle}</h2>
        <p className="mt-0.5 text-sm text-slate-600">{r.catalogSubtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {INTERNAL_REPORT_CATALOG.map((item) => {
            const Icon = REPORT_ICONS[item.type]
            return (
              <Card key={item.type} className={passengerAppCardClassName}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-brand-navy" />
                    {typeLabel(item.type, r)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {goalLabel(item.goalTag, r)}
                  </p>
                  <p className="text-sm text-slate-600">{typeDesc(item.type, r)}</p>
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/dispatch/reports/${item.type}${query}`}>{r.openReport}</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">{r.demoFootnote}</p>
      </section>

      {todayStats ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <Card className={passengerAppCardClassName}>
            <CardHeader className="pb-2">
              <CardTitle>{r.perDriverTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {todayStats.driverStats.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-sm">
                    <span className="font-bold text-brand-navy">{row.name}</span>
                    <span className="font-semibold text-slate-600">{r.ridesCount.replace('{count}', String(row.rides))}</span>
                    <span className="font-bold text-brand-navy">{row.revenue.toFixed(2)} BAM</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={passengerAppCardClassName}>
            <CardHeader className="pb-2">
              <CardTitle>{r.zonesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayStats.zoneStats.map((row) => (
                <div key={row.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-brand-navy">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-600">{r.ridesCount.replace('{count}', String(row.rides))}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-yellow" style={{ width: `${Math.min(100, row.rides * 16)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
