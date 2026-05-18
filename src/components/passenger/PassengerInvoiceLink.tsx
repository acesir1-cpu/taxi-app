import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { strings } from '../../i18n/strings'
import { Button } from '../ui/button'
import type { ButtonProps } from '../ui/button'

type PassengerInvoiceLinkProps = {
  rideId: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  showIcon?: boolean
  label?: string
}

export function PassengerInvoiceLink({
  rideId,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  label,
}: PassengerInvoiceLinkProps) {
  const t = strings()
  const text = label ?? t.documents.generateInvoice

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link to={`/app/documents/invoice/${rideId}`} aria-label={text}>
        {showIcon ? <FileText className="mr-1.5 h-4 w-4" aria-hidden /> : null}
        {text}
      </Link>
    </Button>
  )
}
