import { Label } from '../ui/label'

export function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] w-full rounded-xl border border-black/[0.14] bg-white px-3 py-2 text-sm text-brand-navy outline-none ring-brand-yellow/50 focus:ring-2"
      />
    </div>
  )
}
