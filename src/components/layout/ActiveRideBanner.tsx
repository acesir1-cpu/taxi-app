import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { strings } from '../../i18n/strings'

export function ActiveRideBanner({ rideId }: { rideId: string }) {
  const t = strings()
  return (
    <Link
      to={`/app/ride/${rideId}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-md"
    >
      <span>{t.ride.banner}</span>
      <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
    </Link>
  )
}
