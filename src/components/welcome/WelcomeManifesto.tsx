import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

export function WelcomeManifesto({ className }: { className?: string }) {
  const wc = strings().welcome

  return (
    <section
      className={cn('welcome-manifesto py-20 md:py-28', className)}
      aria-labelledby="welcome-manifesto-heading"
    >
      <p id="welcome-manifesto-heading" className="welcome-manifesto-label">
        {wc.manifestoLabel}
      </p>
      <p className="welcome-manifesto-body">{wc.manifestoBody}</p>
      <p className="welcome-manifesto-tagline">{wc.manifestoTagline}</p>
    </section>
  )
}
