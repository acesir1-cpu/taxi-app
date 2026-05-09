import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Spec-token form input shared across Login + Register.
 * - 48px tall, 12px radius, 1.5px #E5E7EB border, #F9FAFB background
 * - On focus: border becomes #F5A623, background turns white
 */
export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function AuthInput({ className, style, onFocus, onBlur, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'auth-marketing-input h-12 w-full px-3 text-[14px] font-medium text-[#111827] outline-none transition-[border-color,background-color,box-shadow] duration-150 md:px-3',
        'placeholder:text-[#9CA3AF]',
        className,
      )}
      style={{
        background: '#F9FAFB',
        border: '1.5px solid #E5E7EB',
        borderRadius: 12,
        boxShadow: 'none',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#F5A623'
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 166, 35, 0.15)'
        onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB'
        e.currentTarget.style.background = '#F9FAFB'
        e.currentTarget.style.boxShadow = 'none'
        onBlur?.(e)
      }}
      {...props}
    />
  )
})

/** Yellow #F5A623 primary CTA, 52px / 28px-radius / white text, 16px 700 weight, full width. */
export function PrimaryButton({
  className,
  style,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'btn-primary-mobile inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#F5A623] text-white shadow-sm shadow-amber-900/[0.12] transition-all duration-150 hover:-translate-y-px hover:bg-[#FFB840] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:h-[52px] md:rounded-[28px]',
        className,
      )}
      style={{ fontSize: 16, fontWeight: 700, ...style }}
    >
      {children}
    </button>
  )
}

/** Outlined secondary button, 48px / 28px-radius / 1.5px #E5E7EB border, #374151 text, full width. */
export function SecondaryButton({
  className,
  style,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[14px] font-semibold text-[#374151] transition-all duration-150 hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:h-[48px] md:rounded-[28px]',
        className,
      )}
      style={{ border: '1.5px solid #E5E7EB', ...style }}
    >
      {children}
    </button>
  )
}

/**
 * Putnik / Vozač role toggle. Light gray container (#F3F4F6, 10px radius, 4px padding);
 * the active tab gets a white pill (8px radius) with a soft shadow.
 */
export function RoleToggle({
  mode,
  onChange,
  passengerLabel,
  driverLabel,
}: {
  mode: 'passenger' | 'driver'
  onChange: (m: 'passenger' | 'driver') => void
  passengerLabel: string
  driverLabel: string
}) {
  return (
    <div
      className="grid grid-cols-2"
      style={{ background: '#F3F4F6', borderRadius: 10, padding: 4 }}
      role="tablist"
    >
      <RoleTab active={mode === 'passenger'} onClick={() => onChange('passenger')}>
        {passengerLabel}
      </RoleTab>
      <RoleTab active={mode === 'driver'} onClick={() => onChange('driver')}>
        {driverLabel}
      </RoleTab>
    </div>
  )
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center text-[13px] transition-all duration-150"
      style={{
        borderRadius: 8,
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? '#111827' : '#6B7280',
        fontWeight: active ? 600 : 500,
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

/** Form field with label-above style + optional right-aligned secondary slot (e.g. "forgot password"). */
export function Field({
  label,
  htmlFor,
  error,
  right,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label
          htmlFor={htmlFor}
          style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}
        >
          {label}
        </label>
        {right}
      </div>
      {children}
      {error ? (
        <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>{error}</p>
      ) : null}
    </div>
  )
}

/** Hairline divider with a centered uppercase label (e.g. "ili"). */
export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: '#F3F4F6' }} />
      <span
        className="uppercase"
        style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.16em' }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: '#F3F4F6' }} />
    </div>
  )
}
