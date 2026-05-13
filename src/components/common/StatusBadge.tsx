import type { RideStatus } from '../../types/domain'
import { strings } from '../../i18n/strings'
import { Badge } from '../ui/badge'

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
  const labels: Record<RideStatus, string> = {
    dodijeljena: t.ride.status.dodijeljena,
    vozac_na_putu: t.ride.status.vozac_na_putu,
    stigao: t.ride.status.stigao,
    u_toku: t.ride.status.u_toku,
    zavrsena: t.ride.status.zavrsena,
    otkazana: t.ride.status.otkazana,
    neuspjesna: t.ride.status.neuspjesna,
    problematicna: t.ride.status.problematicna,
  }
  return (
    <Badge variant={map[status]} className="rounded-md border-0 px-2 py-0.5 text-[10px] font-semibold leading-tight">
      {labels[status]}
    </Badge>
  )
}
