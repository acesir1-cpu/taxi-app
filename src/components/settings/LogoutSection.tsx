import type { ReactNode } from 'react'
import { Button } from '../ui/button'

export function LogoutSection({
  title,
  description,
  onLogout,
  loading,
  ctaLabel,
  icon,
}: {
  title: string
  description: string
  onLogout: () => void
  loading?: boolean
  ctaLabel: string
  icon?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <h2 className="text-lg font-semibold text-red-700">{title}</h2>
      <p className="mt-1 text-sm text-red-700/90">{description}</p>
      <Button
        className="mt-3 inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        variant="danger"
        disabled={loading}
        onClick={() => onLogout()}
      >
        {icon}
        {ctaLabel}
      </Button>
    </section>
  )
}
