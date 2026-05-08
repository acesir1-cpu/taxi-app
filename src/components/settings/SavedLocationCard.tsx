import type { ComponentType } from 'react'
import { Button } from '../ui/button'

export function SavedLocationCard({
  title,
  address,
  onEdit,
  onUse,
  icon: Icon,
  editLabel,
  useLabel,
}: {
  title: string
  address: string
  onEdit: () => void
  onUse: () => void
  icon: ComponentType<{ className?: string }>
  editLabel: string
  useLabel: string
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Icon className="h-4 w-4" />
        </span>
        <p className="font-semibold text-brand-navy">{title}</p>
      </div>
      <p className="text-sm text-slate-600">{address}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          {editLabel}
        </Button>
        <Button size="sm" onClick={onUse}>
          {useLabel}
        </Button>
      </div>
    </div>
  )
}
