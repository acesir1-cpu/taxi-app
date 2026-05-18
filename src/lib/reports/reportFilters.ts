import { formatBsDate } from '../../utils/date'

export function startOfDayMs(isoOrDate: string | Date): number {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : new Date(isoOrDate.getTime())
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function endOfDayMs(isoOrDate: string | Date): number {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : new Date(isoOrDate.getTime())
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()
}

export function isSameCalendarDay(a: string, b: string): boolean {
  return formatBsDate(a) === formatBsDate(b)
}

export function calendarDayKey(iso: string): string {
  return formatBsDate(iso)
}

export function isInDateRange(iso: string, from: string, to: string): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= startOfDayMs(from) && t <= endOfDayMs(to)
}

export function rideActivityIso(ride: {
  finishedAt?: string
  cancelledAt?: string
  startedAt?: string
  assignedAt?: string
  createdAt: string
}): string {
  return ride.finishedAt ?? ride.cancelledAt ?? ride.startedAt ?? ride.assignedAt ?? ride.createdAt
}

export function defaultReportRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return { from: toIsoDateInput(from), to: toIsoDateInput(to) }
}

export function todayReportRange(): { from: string; to: string } {
  const d = new Date()
  const iso = toIsoDateInput(d)
  return { from: iso, to: iso }
}

export function toIsoDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseRangeFromInputs(from: string, to: string): { from: string; to: string } {
  const f = from || defaultReportRange().from
  const t = to || defaultReportRange().to
  if (startOfDayMs(f) > startOfDayMs(t)) return { from: t, to: f }
  return { from: f, to: t }
}
