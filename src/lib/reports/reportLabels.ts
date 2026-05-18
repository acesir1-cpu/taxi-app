import { strings } from '../../i18n/strings'
import type { ReportRow } from '../../types/reports'

export type ReportBuildLabels = ReturnType<typeof strings>['dispatcher']['reports']['reportBuild']

export function getReportBuildLabels(): ReportBuildLabels {
  return strings().dispatcher.reports.reportBuild
}

export function formatReportMetricKey(key: string): string {
  const L = getReportBuildLabels()
  const map: Record<string, string> = {
    totalRows: L.metricTotalRows,
    days: L.metricDays,
    rides: L.metricRides,
    revenueBam: L.metricRevenueBam,
    count: L.metricCount,
    total: L.metricTotal,
    avgBam: L.metricAvgBam,
    invoiceNo: L.metricInvoiceNo,
    date: L.metricDate,
    amountBam: L.metricAmountBam,
    confirmationNo: L.metricConfirmationNo,
    completed: L.metricCompleted,
    cancelled: L.metricCancelled,
    cancelledRequests: L.metricCancelledRequests,
    failed: L.metricFailed,
    active: L.metricActive,
    requests: L.metricRequests,
    averageWaitMin: L.metricAverageWaitMin,
    longWaitCount: L.metricLongWaitCount,
    complaints: L.metricComplaints,
    accepted: L.metricAccepted,
    rejected: L.metricRejected,
    drivers: L.metricDrivers,
  }
  return map[key] ?? key
}

export function formatReportMetrics(values: ReportRow): string {
  return Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${formatReportMetricKey(k)}: ${v}`)
    .join(' · ')
}

export function formatReportSummary(summary: ReportRow): string {
  return formatReportMetrics(summary)
}
