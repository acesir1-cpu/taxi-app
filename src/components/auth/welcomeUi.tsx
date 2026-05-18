import { CarTaxiFront, type LucideIcon } from 'lucide-react'
import * as React from 'react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

const btnMotion =
  'transition-[transform,box-shadow,filter,background-color,border-color] duration-150 ease-out motion-reduce:transition-none'

export function BrandLogo({
  className,
  iconClassName,
  textClassName,
}: {
  className?: string
  iconClassName?: string
  textClassName?: string
}) {
  const t = strings()
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <CarTaxiFront
        className={cn('h-8 w-8 shrink-0 text-white', iconClassName)}
        strokeWidth={2.3}
        aria-hidden
      />
      <span
        className={cn(
          'truncate text-[17px] font-bold tracking-tight text-white md:text-[18px]',
          textClassName,
        )}
      >
        {t.brand}
      </span>
    </div>
  )
}

export function AiBadge({ className }: { className?: string }) {
  const wc = strings().welcome
  return <span className={cn('uf-badge uf-badge--ai', className)}>{wc.aiBadge}</span>
}

export function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: LucideIcon
  title: string
  body: string
  className?: string
}) {
  return (
    <li className={cn('uf-feature-card group flex items-start gap-3', className)}>
      <div className="uf-feature-card__icon" aria-hidden>
        <Icon className="h-[17px] w-[17px] text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-snug text-white">{title}</p>
        <p className="mt-1 text-[12px] font-semibold leading-snug text-[#1A1A1A]">{body}</p>
      </div>
    </li>
  )
}

export function WelcomeStatsBar({
  items,
  className,
  'aria-label': ariaLabel,
}: {
  items: { icon: LucideIcon; label: string }[]
  className?: string
  'aria-label'?: string
}) {
  return (
    <div className={cn('uf-stats-bar', className)} role="group" aria-label={ariaLabel}>
      {items.map(({ icon: Icon, label }, index) => (
        <React.Fragment key={label}>
          {index > 0 ? <span className="uf-stats-bar__divider" aria-hidden /> : null}
          <span className="uf-stats-bar__item">
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
              strokeWidth={2.2}
              aria-hidden
            />
            <span>{label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export function WelcomePrimaryButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'uf-btn uf-btn--primary inline-flex w-full items-center justify-center gap-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:translate-y-0',
        btnMotion,
        'hover:not(:disabled):-translate-y-px active:not(:disabled):scale-[0.98]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function WelcomeSecondaryButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'uf-btn uf-btn--secondary inline-flex flex-1 items-center justify-center gap-2',
        'text-[14px] font-semibold text-[var(--color-text)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        btnMotion,
        'hover:not(:disabled):-translate-y-px hover:not(:disabled):border-[rgba(17,24,39,0.16)] hover:not(:disabled):bg-white',
        'active:not(:disabled):scale-[0.98]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function LanguageSwitcher({
  activeLang,
  onPick,
  tone = 'onForm',
  className,
}: {
  activeLang: 'bs' | 'en'
  onPick: (lang: 'bs' | 'en') => void
  tone?: 'onHero' | 'onForm'
  className?: string
}) {
  const wc = strings().welcome

  return (
    <div
      className={cn(
        'uf-lang-switcher',
        tone === 'onHero' && 'uf-lang-switcher--hero',
        tone === 'onForm' && 'uf-lang-switcher--form',
        className,
      )}
      role="group"
      aria-label={`${wc.langBs} / ${wc.langEn}`}
    >
      <button
        type="button"
        onClick={() => onPick('bs')}
        aria-pressed={activeLang === 'bs'}
        className={cn('uf-lang-switcher__btn', activeLang === 'bs' && 'uf-lang-switcher__btn--active')}
      >
        {wc.langBs}
      </button>
      <span className="uf-lang-switcher__sep" aria-hidden>
        {tone === 'onHero' ? '·' : '|'}
      </span>
      <button
        type="button"
        onClick={() => onPick('en')}
        aria-pressed={activeLang === 'en'}
        className={cn('uf-lang-switcher__btn', activeLang === 'en' && 'uf-lang-switcher__btn--active')}
      >
        {wc.langEn}
      </button>
    </div>
  )
}

