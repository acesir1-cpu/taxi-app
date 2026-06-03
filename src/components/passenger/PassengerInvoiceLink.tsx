import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PassengerDocumentNavState } from '../../lib/passengerDocumentNav'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'
import type { ButtonProps } from '../ui/button'

type PassengerInvoiceLinkProps = {
  rideId: string
  returnTo?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  showIcon?: boolean
  label?: string
}

export function PassengerInvoiceLink({
  rideId,
  returnTo,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  label,
}: PassengerInvoiceLinkProps) {
  const t = strings()
  const text = label ?? t.documents.generateInvoice
  const navState: PassengerDocumentNavState | undefined = returnTo ? { returnTo } : undefined

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link to={`/app/documents/invoice/${rideId}`} state={navState} aria-label={text}>
        {showIcon ? <FileText className="mr-1.5 h-4 w-4" aria-hidden /> : null}
        {text}
      </Link>
    </Button>
  )
}
