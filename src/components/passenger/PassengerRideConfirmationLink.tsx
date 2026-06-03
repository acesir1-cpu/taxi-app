import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'
import type { ButtonProps } from '../ui/button'

type PassengerRideConfirmationLinkProps = {
  rideId: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  showIcon?: boolean
  label?: string
}

export function PassengerRideConfirmationLink({
  rideId,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  label,
}: PassengerRideConfirmationLinkProps) {
  const t = strings()
  const text = label ?? t.history.viewRideConfirmation

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link to={`/app/documents/ride_confirmation/${rideId}`} aria-label={text}>
        {showIcon ? <ClipboardCheck className="mr-1.5 h-4 w-4 shrink-0" aria-hidden /> : null}
        {text}
      </Link>
    </Button>
  )
}
