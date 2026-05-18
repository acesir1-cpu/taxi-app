import type { AppMessages } from '../i18n/strings'
import type { ComplaintStatus, RideRequestStatus, RideStatus } from '../types/domain'

/** Prijateljski tekst za status narudžbe / zakazane vožnje (npr. u_obradi → Tražimo vozača). */
export function rideRequestStatusLabel(
  status: RideRequestStatus,
  messages: AppMessages['order']['scheduledRequestStatus'],
): string {
  return messages[status] ?? status
}

/** Prijateljski tekst za status vožnje. */
export function rideStatusLabel(status: RideStatus, messages: AppMessages['ride']['status']): string {
  return messages[status] ?? status
}

/** Prijateljski tekst za status prijave problema. */
export function complaintStatusLabel(
  status: ComplaintStatus,
  messages: AppMessages['history']['complaintStatuses'],
): string {
  return messages[status] ?? status
}

export function rideRequestStatusToneClass(status: RideRequestStatus): string {
  const base =
    'inline-flex max-w-[100%] shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight tracking-normal'
  switch (status) {
    case 'prihvacen':
    case 'dodijeljen':
      return `${base} bg-emerald-100 text-emerald-800`
    case 'otkazan':
      return `${base} bg-rose-100 text-rose-800`
    case 'neuspjesan':
      return `${base} bg-orange-100 text-orange-900`
    case 'u_obradi':
      return `${base} bg-amber-100 text-amber-900`
    case 'kreiran':
    default:
      return `${base} bg-slate-100 text-slate-700`
  }
}

export function rideStatusToneClass(status: RideStatus): string {
  switch (status) {
    case 'zavrsena':
      return 'bg-emerald-100 text-emerald-700'
    case 'otkazana':
    case 'neuspjesna':
    case 'problematicna':
      return 'bg-rose-100 text-rose-700'
    case 'u_toku':
    case 'vozac_na_putu':
    case 'stigao':
    case 'dodijeljena':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}
