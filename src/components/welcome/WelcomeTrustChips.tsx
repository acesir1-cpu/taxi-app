import { Fragment } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

/** Unified social-proof metrics capsule for the welcome conversion panel. */
export function WelcomeTrustChips({
  items,
  className,
  'aria-label': ariaLabel,
}: {
  items: { icon: LucideIcon; label: string }[]
  className?: string
  'aria-label'?: string
}) {
  return (
    <div className={cn('welcome-trust-metrics', className)} role="group" aria-label={ariaLabel}>
      {items.map(({ icon: Icon, label }, index) => (
        <Fragment key={label}>
          {index > 0 ? <span className="welcome-trust-metrics__sep" aria-hidden /> : null}
          <span className="welcome-trust-metrics__item">
            <Icon className="welcome-trust-metrics__icon" strokeWidth={2.4} aria-hidden />
            <span className="welcome-trust-metrics__label">{label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}
