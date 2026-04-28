import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-border bg-white/60 px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
