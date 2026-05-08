import type { ReactNode } from 'react'

export function SecurityFeatureRow({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-navy">{title}</p>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        {action}
      </div>
    </div>
  )
}

export function SecuritySettingsStack({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>
}
