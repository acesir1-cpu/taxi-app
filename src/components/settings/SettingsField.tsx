import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function SettingsField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  id,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  id?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-white" />
      {error ? <p className="text-xs font-medium text-brand-danger">{error}</p> : null}
    </div>
  )
}
