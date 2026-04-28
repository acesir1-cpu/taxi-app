import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full min-h-[44px] rounded-xl border border-black/[0.14] bg-white px-3 py-2 text-sm font-medium text-brand-navy shadow-sm transition-all duration-150 ease-out',
        'placeholder:text-slate-500 focus-visible:border-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/55 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_3px_rgba(255,196,0,0.2)]',
        'hover:border-black/[0.18] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
