import { CarTaxiFront, MapPin, Navigation } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

/** Subtle floating order preview for the brand hero (decorative). */
export function WelcomeOrderPreview({ className }: { className?: string }) {
  const p = strings().welcome.orderPreview

  return (
    <article
      className={cn(
        'welcome-order-preview rounded-[14px] border border-white/20 bg-white/22 backdrop-blur-md',
        className,
      )}
      aria-label={p.ariaLabel}
    >
      <header className="welcome-order-preview__head">
        <div className="welcome-order-preview__title-row">
          <h3 className="welcome-order-preview__card-title">{p.cardTitle}</h3>
          <span className="welcome-order-preview__live welcome-order-preview__live--pulse">
            <span className="welcome-order-preview__live-dot" aria-hidden />
            {p.liveBadge}
          </span>
        </div>
        <CarTaxiFront className="welcome-order-preview__taxi" strokeWidth={2.2} aria-hidden />
      </header>

      <dl className="welcome-order-preview__rows">
        <div className="welcome-order-preview__row">
          <dt className="sr-only">{p.pickupLabel}</dt>
          <dd>
            <MapPin className="welcome-order-preview__icon" strokeWidth={2.4} aria-hidden />
            <span className="welcome-order-preview__label">{p.pickupLabel}</span>
            <span className="welcome-order-preview__value">{p.pickup}</span>
          </dd>
        </div>
        <div className="welcome-order-preview__row">
          <dt className="sr-only">{p.destinationLabel}</dt>
          <dd>
            <Navigation className="welcome-order-preview__icon" strokeWidth={2.4} aria-hidden />
            <span className="welcome-order-preview__label">{p.destinationLabel}</span>
            <span className="welcome-order-preview__value">{p.destination}</span>
          </dd>
        </div>
      </dl>

      <footer className="welcome-order-preview__footer">
        <div className="welcome-order-preview__meta">
          <div>
            <span className="welcome-order-preview__meta-label">{p.etaLabel}</span>
            <span className="welcome-order-preview__meta-value">{p.eta}</span>
          </div>
          <div>
            <span className="welcome-order-preview__meta-label">{p.priceLabel}</span>
            <span className="welcome-order-preview__meta-value">{p.price}</span>
          </div>
        </div>
        <p className="welcome-order-preview__status">
          <span className="welcome-order-preview__status-dot" aria-hidden />
          {p.status}
        </p>
      </footer>
    </article>
  )
}
