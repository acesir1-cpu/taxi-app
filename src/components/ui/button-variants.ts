import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 min-h-[44px] px-4 py-2 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-yellow text-brand-navy shadow-sm shadow-brand-navy/10 hover:-translate-y-px hover:bg-[#FFCF26] hover:shadow-md hover:brightness-[1.02]',
        cta:
          'h-14 min-h-[56px] rounded-2xl border border-black/[0.08] bg-brand-yellow px-8 text-base font-extrabold tracking-tight text-brand-navy shadow-cta hover:-translate-y-px hover:bg-brand-yellow hover:shadow-cta-hover hover:brightness-[1.06] active:translate-y-0 disabled:!opacity-100 disabled:border-black/[0.06] disabled:bg-slate-200/95 disabled:text-slate-600 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100',
        secondary:
          'border border-slate-200/90 bg-white text-brand-navy shadow-sm hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50/90',
        outline: 'border-2 border-brand-navy text-brand-navy bg-transparent hover:bg-brand-navy/5 hover:brightness-[1.02]',
        /** Thinner border, lighter touch — secondary actions (e.g. history “Detalji”). */
        outlineThin:
          'border border-brand-navy/85 text-brand-navy bg-transparent hover:bg-brand-navy/[0.06] hover:brightness-[1.03]',
        /** Primary dark CTA (e.g. “Ponovi vožnju” on history cards). */
        navy: 'bg-brand-navy text-white shadow-sm shadow-brand-navy/15 hover:brightness-[1.04] hover:shadow-md',
        ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-brand-navy',
        danger: 'bg-brand-danger text-white hover:bg-red-600',
        success: 'bg-brand-success text-white hover:bg-green-700',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 min-h-0 rounded-lg px-3 py-1.5 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
