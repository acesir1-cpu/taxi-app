import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-brand-navy shadow-sm transition-all duration-150 ease-out',
        'placeholder:text-slate-500 focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/45 focus-visible:ring-offset-0 focus-visible:bg-white',
        'hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
