import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function SimpleModal({
  open,
  onClose,
  title,
  children,
  large,
  closeLabel,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  large?: boolean
  closeLabel?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6">
      <div
        className={cn(
          'max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[86vh] sm:rounded-2xl',
          large ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {closeLabel ?? 'Close'}
          </Button>
        </div>
        {children}
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10"
        aria-label={closeLabel ?? 'Close modal'}
        onClick={onClose}
      />
    </div>
  )
}
