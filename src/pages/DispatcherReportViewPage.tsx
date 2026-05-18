import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/common/LoadingState'
import { ReportShell } from '../components/reports/ReportShell'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useLangRefresh } from '../hooks/useLangRefresh'
import { defaultReportRange, parseRangeFromInputs } from '../lib/reports/reportFilters'
import { strings } from '../i18n/strings'
import { buildInternalReport, isInternalReportType } from '../services/reportApi'
import { dispatcherCan } from '../services/dispatcherApi'
import type { InternalReportType } from '../types/reports'
import { useDispatcherSession } from '../hooks/useDispatcherSession'
import { Card, CardContent, passengerAppCardClassName } from '../components/ui/card'
import { useDispatchData } from '../hooks/useDispatchSnapshot'

const selectClassName =
  'flex h-11 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-brand-navy shadow-sm transition-all focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/45'

function reportTitle(type: InternalReportType, r: ReturnType<typeof strings>['dispatcher']['reports']): string {
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

export function DispatcherReportViewPage() {
  useLangRefresh()
  const t = strings()
  const r = t.dispatcher.reports
  const { reportType } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { me } = useDispatcherSession()
  const { data } = useDispatchData()
  const canView = dispatcherCan(me.dispatcherProfile.roleLevel, 'view_reports')

  const defaults = useMemo(() => defaultReportRange(), [])
  const [from, setFrom] = useState(searchParams.get('from') ?? defaults.from)
  const [to, setTo] = useState(searchParams.get('to') ?? defaults.to)
  const [driverId, setDriverId] = useState(searchParams.get('driverId') ?? 'all')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [zoneId, setZoneId] = useState(searchParams.get('zoneId') ?? 'all')

  const type = reportType && isInternalReportType(reportType) ? reportType : null

  const driverOptions = useMemo(
    () =>
      data?.drivers.map((row) => ({
        id: row.driver.id,
        label: `${row.driver.firstName} ${row.driver.lastName}`,
      })) ?? [],
    [data]
  )
  const statusOptions = useMemo(() => {
    const items = new Map<string, string>()
    data?.rides.forEach((row) => items.set(row.status, row.statusLabel))
    data?.complaints.forEach((row) => items.set(row.status, row.status))
    return [...items.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [data])
  const zoneOptions = useMemo(
    () => [
      { id: 'center', label: r.zoneCenter },
      { id: 'new_sarajevo', label: r.zoneNewSarajevo },
      { id: 'airport', label: r.zoneAirport },
      { id: 'north', label: r.zoneNorth },
      { id: 'other', label: r.zoneOther },
    ],
    [r.zoneAirport, r.zoneCenter, r.zoneNewSarajevo, r.zoneNorth, r.zoneOther]
  )

  const reportQ = useQuery({
    queryKey: ['internalReport', type, from, to, driverId, status, zoneId, me.account.id],
    queryFn: () =>
      buildInternalReport(type!, {
        from,
        to,
        dispatcherAccountId: me.account.id,
        driverId: driverId === 'all' ? undefined : driverId,
        status: status === 'all' ? undefined : status,
        zoneId: zoneId === 'all' ? undefined : zoneId,
      }),
    enabled: !!type && canView,
  })

  function applyRange() {
    const parsed = parseRangeFromInputs(from, to)
    setFrom(parsed.from)
    setTo(parsed.to)
    const next: Record<string, string> = { from: parsed.from, to: parsed.to }
    if (driverId !== 'all') next.driverId = driverId
    if (status !== 'all') next.status = status
    if (zoneId !== 'all') next.zoneId = zoneId
    setSearchParams(next)
  }

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

  if (!type) {
    return (
      <p className="text-sm text-slate-600">
        <Link to="/dispatch/reports" className="font-semibold text-brand-navy underline">
          {r.backToCatalog}
        </Link>
      </p>
    )
  }

  const doc = reportQ.data
  const hasRows = doc?.sections.some((s) => s.groups.some((g) => g.rows.length > 0)) ?? false
  const shellLabels = {
    generated: r.generated,
    period: r.period,
    reportId: r.reportId,
    legendTitle: r.legendTitle,
    summaryTitle: r.summaryTitle,
    pageFooter: r.pageFooter,
  }
  const toolbarLabels = {
    printPdf: r.printPdf,
    exportCsv: r.exportCsv,
    period: r.period,
    generated: r.generated,
    page: r.pageFooter,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" asChild>
          <Link to="/dispatch/reports">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {r.backToCatalog}
          </Link>
        </Button>
        <h1 className="text-xl font-extrabold text-brand-navy">{reportTitle(type, r)}</h1>
      </div>

      <Card className={`${passengerAppCardClassName} print:hidden`}>
        <CardContent className="flex flex-wrap items-end gap-4 pt-5">
          <div className="space-y-1">
            <Label htmlFor="report-from">{r.dateFrom}</Label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to">{r.dateTo}</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-driver">{r.filterDriver}</Label>
            <select id="report-driver" className={selectClassName} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="all">{r.allDrivers}</option>
              {driverOptions.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-status">{r.filterStatus}</Label>
            <select id="report-status" className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{r.allStatuses}</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-zone">{r.filterZone}</Label>
            <select id="report-zone" className={selectClassName} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="all">{r.allZones}</option>
              {zoneOptions.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={applyRange}>
            {r.generate}
          </Button>
        </CardContent>
      </Card>

      {reportQ.isLoading ? (
        <LoadingState />
      ) : doc ? (
        <>
          {!hasRows ? <p className="text-sm font-semibold text-amber-700">{r.noData}</p> : null}
          <ReportShell
            document={{
              ...doc,
              meta: {
                ...doc.meta,
                title: reportTitle(type, r),
                periodFrom: from,
                periodTo: to,
              },
            }}
            labels={shellLabels}
            toolbarLabels={toolbarLabels}
          />
        </>
      ) : null}
    </div>
  )
}
