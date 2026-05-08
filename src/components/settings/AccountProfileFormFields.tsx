import type { ReactNode } from 'react'
import type { AccountProfileValues } from '../../lib/accountProfileValidation'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SettingsField } from './SettingsField'

export type AccountProfileFieldLabels = {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  address: string
}

type Props = {
  values: AccountProfileValues
  errors: Partial<Record<keyof AccountProfileValues, string>>
  onChange: (patch: Partial<AccountProfileValues>) => void
  labels: AccountProfileFieldLabels
  showCity?: boolean
  showAddress?: boolean
  cityEditable?: boolean
  afterFields?: ReactNode
}

export function AccountProfileFormFields({
  values,
  errors,
  onChange,
  labels,
  showCity = true,
  showAddress = true,
  cityEditable = true,
  afterFields,
}: Props) {
  return (
    <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-2">
      <SettingsField
        label={labels.firstName}
        value={values.firstName}
        onChange={(value) => onChange({ firstName: value })}
        error={errors.firstName}
      />
      <SettingsField
        label={labels.lastName}
        value={values.lastName}
        onChange={(value) => onChange({ lastName: value })}
        error={errors.lastName}
      />
      <SettingsField
        label={labels.email}
        value={values.email}
        onChange={(value) => onChange({ email: value })}
        error={errors.email}
        type="email"
      />
      <SettingsField
        label={labels.phone}
        value={values.phone}
        onChange={(value) => onChange({ phone: value })}
        error={errors.phone}
      />
      {showAddress ? (
        <SettingsField
          label={labels.address}
          value={values.address ?? ''}
          onChange={(value) => onChange({ address: value })}
          error={errors.address}
        />
      ) : null}
      {showCity ? (
        cityEditable ? (
          <SettingsField
            label={labels.city}
            value={values.city ?? ''}
            onChange={(value) => onChange({ city: value })}
            error={errors.city}
          />
        ) : (
          <div className="space-y-1.5">
            <Label>{labels.city}</Label>
            <Input className="bg-white" value={values.city ?? ''} readOnly />
          </div>
        )
      ) : null}
    </div>
    {afterFields}
    </div>
  )
}
