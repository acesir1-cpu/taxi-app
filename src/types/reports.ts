export type InternalReportType =
  | 'rides_detail'
  | 'ride_requests_detail'
  | 'driver_activity_detail'
  | 'revenue_by_day'
  | 'rides_count_summary'
  | 'driver_performance'
  | 'waiting_by_zone'
  | 'cancellations_by_period'
  | 'conflict_assignments'
  | 'cancelled_rides'
  | 'complaints_report'
  | 'operational_exceptions'

export type ExternalDocumentType = 'invoice' | 'booking_confirmation' | 'ride_confirmation'

export type ReportType = InternalReportType | ExternalDocumentType

export type ReportGoalTag = 'decision' | 'business' | 'performance' | 'quality'

export type ReportColumnFormat = 'text' | 'currency' | 'datetime' | 'date' | 'number'

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: ReportColumnFormat
}

export type ReportRow = Record<string, string | number | boolean | undefined>

export interface ReportSubtotal {
  label?: string
  values: ReportRow
}

export interface ReportGroup {
  breakLabel: string
  rows: ReportRow[]
  subtotal?: ReportSubtotal
}

export interface ReportSection {
  title?: string
  columns: ReportColumn[]
  groups: ReportGroup[]
}

export interface ReportLegendItem {
  key: string
  label: string
  swatch?: string
}

export interface ReportMeta {
  id: string
  type: ReportType
  title: string
  subtitle?: string
  generatedAt: string
  periodFrom?: string
  periodTo?: string
  generatedBy?: string
  audience: 'dispatcher' | 'passenger'
  goalTag?: ReportGoalTag
}

export interface ReportDocument {
  meta: ReportMeta
  legend?: ReportLegendItem[]
  sections: ReportSection[]
  summary?: ReportRow
}

export interface ReportBuildParams {
  from: string
  to: string
  dispatcherAccountId?: string
  passengerAccountId?: string
  entityId?: string
  driverId?: string
  status?: string
  zoneId?: string
}
