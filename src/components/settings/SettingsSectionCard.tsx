import type { ComponentType, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function SettingsSectionCard({
  icon: Icon,
  title,
  color,
  children,
  className,
  id,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  color: string
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 space-y-3 rounded-2xl border border-black/[0.08] bg-slate-50/60 p-4', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full', color)}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
