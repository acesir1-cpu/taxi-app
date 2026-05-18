/* eslint-disable react-refresh/only-export-components */
import type { DriverAvailability } from '../../types/domain'
import { cn } from '../../lib/utils'

/** Brand-aligned tokens for driver workspace (welcome / app shell palette). */
export const driverBrand = {
  pickupIcon: 'text-brand-teal',
  destinationIcon: 'text-brand-navy-soft',
  newRideBadge:
    'border-amber-900/10 bg-brand-yellow text-brand-navy shadow-sm shadow-amber-900/[0.08] hover:bg-brand-yellow-dark',
  earningsIconWrap: 'bg-brand-teal/10',
  earningsIcon: 'text-brand-teal',
  fuelIconWrap: 'bg-brand-navy/5',
  fuelIcon: 'text-brand-navy-soft',
  alertDanger: 'border-brand-danger/25 bg-brand-danger/10 text-brand-navy',
  rejectBtn:
    'text-brand-danger hover:bg-brand-danger/10 hover:text-brand-danger focus-visible:ring-brand-danger/35',
  progressDone: 'bg-brand-teal',
  progressDoneText: 'text-brand-teal',
  progressCurrent: 'bg-brand-yellow',
  successBadge: 'border-brand-teal/25 bg-brand-teal/10 text-brand-navy',
  dangerBadge: 'border-brand-danger/25 bg-brand-danger/10 text-brand-danger',
  warningBadge: 'border-brand-yellow/35 bg-brand-yellow/15 text-brand-navy',
  mutedBadge: 'border-brand-border bg-slate-100 text-slate-700',
} as const

export function driverAvailabilityDotClass(status: DriverAvailability): string {
  switch (status) {
    case 'dostupan':
      return 'bg-brand-teal'
    case 'zauzet':
      return 'bg-brand-yellow'
    case 'na_pauzi':
      return 'bg-[var(--color-primary-dark)]'
    case 'van_smjene':
      return 'bg-brand-navy-soft'
    case 'van_funkcije':
      return 'bg-brand-danger'
    default:
      return 'bg-slate-400'
  }
}

export function driverDestructiveButtonClass(extra?: string) {
  return cn(driverBrand.rejectBtn, extra)
}

export function driverProgressStepClass(phase: 'done' | 'current' | 'todo', kind: 'bar' | 'text' | 'circle') {
  if (phase === 'done') {
    if (kind === 'circle') return `${driverBrand.progressDone} text-white`
    if (kind === 'bar') return driverBrand.progressDone
    return driverBrand.progressDoneText
  }
  if (phase === 'current') {
    if (kind === 'bar') return driverBrand.progressCurrent
    if (kind === 'circle') return 'bg-brand-yellow text-brand-navy ring-2 ring-brand-yellow-dark/40'
    return 'text-brand-navy'
  }
  if (kind === 'circle') return 'bg-slate-200 text-slate-500'
  if (kind === 'bar') return 'bg-slate-200'
  return 'text-slate-500'
}
