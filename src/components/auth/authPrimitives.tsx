import * as React from 'react'
import { cn } from '../../lib/utils'

const AUTH_INPUT_DEFAULT_STYLE: React.CSSProperties = {
  background: '#F9FAFB',
  border: '1.5px solid #E5E7EB',
  borderRadius: 12,
  boxShadow: 'none',
}

const AUTH_INPUT_FOCUS_STYLE: React.CSSProperties = {
  borderColor: '#F5A623',
  background: '#FFFFFF',
  boxShadow: '0 0 0 3px rgba(245, 166, 35, 0.15)',
}

const AUTH_INPUT_INVALID_STYLE: React.CSSProperties = {
  borderColor: '#DC2626',
  background: '#FEF2F2',
  boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
}

function applyAuthInputVisual(el: HTMLInputElement, invalid: boolean, focused: boolean) {
  if (invalid) {
    Object.assign(el.style, AUTH_INPUT_INVALID_STYLE)
    if (focused) {
      el.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.15)'
    }
    return
  }
  if (focused) {
    Object.assign(el.style, AUTH_INPUT_FOCUS_STYLE)
    return
  }
  Object.assign(el.style, AUTH_INPUT_DEFAULT_STYLE)
}

/**
 * Spec-token form input shared across Login + Register.
 * - 48px tall, 12px radius, 1.5px #E5E7EB border, #F9FAFB background
 * - On focus: border becomes #F5A623, background turns white
 * - When invalid: red border + light red background
 */
export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function AuthInput({ className, style, invalid = false, onFocus, onBlur, ...props }, ref) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  React.useEffect(() => {
    if (inputRef.current) {
      applyAuthInputVisual(inputRef.current, invalid, document.activeElement === inputRef.current)
    }
  }, [invalid])

  return (
    <input
      ref={setRef}
      aria-invalid={invalid || undefined}
      className={cn(
        'auth-marketing-input h-12 w-full px-3 text-[14px] font-medium text-[#111827] outline-none transition-[border-color,background-color,box-shadow] duration-150 md:px-3',
        'placeholder:text-[#9CA3AF]',
        invalid && 'auth-input--invalid',
        className,
      )}
      style={{ ...AUTH_INPUT_DEFAULT_STYLE, ...style }}
      onFocus={(e) => {
        applyAuthInputVisual(e.currentTarget, invalid, true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        applyAuthInputVisual(e.currentTarget, invalid, false)
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
  dispatcherLabel,
}: {
  mode: 'passenger' | 'driver' | 'dispatcher'
  onChange: (m: 'passenger' | 'driver' | 'dispatcher') => void
  passengerLabel: string
  driverLabel: string
  dispatcherLabel: string
}) {
  return (
    <div
      className="grid grid-cols-3"
      style={{ background: '#F3F4F6', borderRadius: 10, padding: 4 }}
      role="tablist"
    >
      <RoleTab active={mode === 'passenger'} onClick={() => onChange('passenger')}>
        {passengerLabel}
      </RoleTab>
      <RoleTab active={mode === 'driver'} onClick={() => onChange('driver')}>
        {driverLabel}
      </RoleTab>
      <RoleTab active={mode === 'dispatcher'} onClick={() => onChange('dispatcher')}>
        {dispatcherLabel}
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
      className={cn(
        'inline-flex h-10 items-center justify-center px-2 text-center text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2',
        !active && 'hover:text-[#111827]'
      )}
      style={{
        borderRadius: 8,
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? '#111827' : '#6B7280',
        fontWeight: active ? 600 : 500,
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

/** Passes `invalid` to direct child controls (AuthInput, PasswordInput, PhoneInput). */
function fieldChildWithInvalid(children: React.ReactNode, invalid: boolean) {
  if (!invalid) return children
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child
    return React.cloneElement(child, { invalid: true } as { invalid?: boolean })
  })
}

/** Form field with label-above style + optional right-aligned secondary slot (e.g. "forgot password"). */
export function Field({
  label,
  htmlFor,
  error,
  invalid: invalidProp,
  right,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  /** Highlight control without showing a message (e.g. paired server-side login error). */
  invalid?: boolean
  right?: React.ReactNode
  children: React.ReactNode
}) {
  const invalid = invalidProp ?? Boolean(error?.trim())
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 12,
            color: invalid ? '#DC2626' : '#6B7280',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
        {right}
      </div>
      {fieldChildWithInvalid(children, invalid)}
      {error ? (
        <p role="alert" style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>
          {error}
        </p>
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
