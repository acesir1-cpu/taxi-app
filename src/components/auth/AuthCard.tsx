import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type AuthCardVariant = 'glass' | 'light'

export function AuthCard({
  title,
  subtitle,
  children,
  variant = 'glass',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  variant?: AuthCardVariant
}) {
  const glass = variant === 'glass'

  return (
    <Card
      className={cn(
        glass
          ? 'rounded-[1.75rem] border-white/[0.09] bg-white/[0.07] text-stone-100 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl'
          : 'shadow-card'
      )}
    >
      <CardHeader className={cn(glass && 'space-y-2 pb-2')}>
        <CardTitle
          className={cn(
            glass ? 'text-xl font-semibold tracking-tight text-stone-50 sm:text-2xl' : undefined
          )}
        >
          {title}
        </CardTitle>
        {subtitle ? (
          <CardDescription className={cn(glass && 'text-stone-400')}>{subtitle}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn(glass && '[&_label]:text-stone-200')}>
        {children}
      </CardContent>
    </Card>
  )
}
