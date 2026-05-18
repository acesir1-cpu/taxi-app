import { Sparkles } from 'lucide-react'
import { strings } from '../../i18n/strings'
import { cn } from '../../lib/utils'

/** Compact AI proof chip for the right conversion panel. */
export function WelcomeAiProof({ className }: { className?: string }) {
  const e = strings().welcome.aiEstimate

  return (
    <div className={cn('welcome-ai-proof', className)} role="note" aria-label={e.ariaLabel}>
      <Sparkles className="welcome-ai-proof__icon" strokeWidth={2.2} aria-hidden />
      <div className="welcome-ai-proof__text">
        <span className="welcome-ai-proof__label">{e.label}</span>
        <span className="welcome-ai-proof__summary">{e.summary}</span>
      </div>
    </div>
  )
}
