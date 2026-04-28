import { Loader2 } from 'lucide-react'
import { strings } from '../../i18n/strings'

export function LoadingState({ label }: { label?: string }) {
  const t = strings()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-brand-navy" role="status" aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      <p className="text-sm font-medium">{label ?? t.common.loading}</p>
    </div>
  )
}
