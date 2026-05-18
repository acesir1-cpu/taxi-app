/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RideRequestStatusBadge, RideStatusBadge } from '../common/StatusBadge'
import { Card, CardContent, passengerAppCardClassName } from '../ui/card'
import { getGuestLang } from '../../i18n/guestLocale'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'
import type { DriverAvailability, RideRequestStatus, RideStatus } from '../../types/domain'

const RIDE_STATUSES = new Set<RideStatus>([
  'dodijeljena',
  'vozac_na_putu',
  'stigao',
  'u_toku',
  'zavrsena',
  'otkazana',
  'neuspjesna',
  'problematicna',
])

export function formatDispatchDateTime(iso: string | undefined): string {
  const t = strings()
  if (!iso) return t.dispatcher.common.notAvailable
  const locale = getGuestLang() === 'en' ? 'en-GB' : 'bs-BA'
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DispatchStatusBadge({ status }: { status: RideStatus | RideRequestStatus }) {
  if (RIDE_STATUSES.has(status as RideStatus)) {
    return <RideStatusBadge status={status as RideStatus} />
  }
  return <RideRequestStatusBadge status={status as RideRequestStatus} />
}

export function DriverStatusPill({ status }: { status: DriverAvailability }) {
  const t = strings()
  const meta: Record<DriverAvailability, { label: string; className: string }> = {
    dostupan: { label: t.dispatcher.driverStatus.dostupan, className: 'bg-emerald-100 text-emerald-800' },
    zauzet: { label: t.dispatcher.driverStatus.zauzet, className: 'bg-amber-100 text-amber-900' },
    na_pauzi: { label: t.dispatcher.driverStatus.na_pauzi, className: 'bg-indigo-100 text-indigo-800' },
    van_smjene: { label: t.dispatcher.driverStatus.van_smjene, className: 'bg-slate-100 text-slate-700' },
    van_funkcije: { label: t.dispatcher.driverStatus.van_funkcije, className: 'bg-red-100 text-red-800' },
  }
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', meta[status].className)}>
      {meta[status].label}
    </span>
  )
}

/** @deprecated Use DispatchStatusBadge */
export const RideStatusPill = DispatchStatusBadge

export function KpiCard({
  icon,
  label,
  value,
  tone = 'default',
  to,
}: {
  icon: ReactNode
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'warning' | 'danger'
  to?: string
}) {
  const toneClass = {
    default: 'bg-brand-navy/5 text-brand-navy',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  }[tone]
  const inner = (
    <CardContent className="flex items-center gap-3 p-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', toneClass)}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold leading-snug tracking-wide text-slate-600">{label}</p>
        <p className="truncate text-xl font-bold text-brand-navy">{value}</p>
      </div>
    </CardContent>
  )
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          passengerAppCardClassName,
          'block rounded-2xl transition hover:ring-2 hover:ring-brand-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50',
        )}
      >
        {inner}
      </Link>
    )
  }
  return <Card className={passengerAppCardClassName}>{inner}</Card>
}
