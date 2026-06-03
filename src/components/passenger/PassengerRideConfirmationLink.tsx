import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PassengerDocumentNavState } from '../../lib/passengerDocumentNav'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'
import type { ButtonProps } from '../ui/button'

type PassengerRideConfirmationLinkProps = {
  rideId: string
  /** Where “Back” on the document screen should go (e.g. active ride screen). */
  returnTo?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  showIcon?: boolean
  label?: string
}

export function PassengerRideConfirmationLink({
  rideId,
  returnTo,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  label,
}: PassengerRideConfirmationLinkProps) {
  const t = strings()
  const text = label ?? t.history.viewRideConfirmation
  const navState: PassengerDocumentNavState | undefined = returnTo ? { returnTo } : undefined

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link
        to={`/app/documents/ride_confirmation/${rideId}`}
        state={navState}
        aria-label={text}
      >
        {showIcon ? <ClipboardCheck className="mr-1.5 h-4 w-4 shrink-0" aria-hidden /> : null}
        {text}
      </Link>
    </Button>
  )
}
