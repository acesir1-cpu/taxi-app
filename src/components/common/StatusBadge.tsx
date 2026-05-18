import type { RideRequestStatus, RideStatus } from '../../types/domain'
import { strings } from '../../i18n/strings'
import {
  rideRequestStatusLabel,
  rideRequestStatusToneClass,
  rideStatusLabel,
} from '../../lib/passengerStatusLabels'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

const map: Record<RideStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  dodijeljena: 'warning',
  vozac_na_putu: 'warning',
  stigao: 'success',
  u_toku: 'success',
  zavrsena: 'success',
  otkazana: 'danger',
  neuspjesna: 'danger',
  problematicna: 'danger',
}

export function RideStatusBadge({ status }: { status: RideStatus }) {
  const t = strings()
  return (
    <Badge variant={map[status]} className="rounded-md border-0 px-2 py-0.5 text-[10px] font-semibold leading-tight">
      {rideStatusLabel(status, t.ride.status)}
    </Badge>
  )
}

export function RideRequestStatusBadge({ status }: { status: RideRequestStatus }) {
  const t = strings()
  return (
    <span
      className={cn(rideRequestStatusToneClass(status), 'normal-case tracking-normal')}
    >
      {rideRequestStatusLabel(status, t.order.scheduledRequestStatus)}
    </span>
  )
}
