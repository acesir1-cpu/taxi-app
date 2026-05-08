export type AccountProfileValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  city?: string
  address?: string
}

export type ProfileValidationLocale = 'bs' | 'en'

const BS = {
  firstName: 'Unesite ime.',
  lastName: 'Unesite prezime.',
  email: 'Unesite validnu e-mail adresu.',
  phone: 'Unesite validan broj telefona.',
} as const

const EN = {
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  email: 'Enter a valid email address.',
  phone: 'Enter a valid phone number.',
} as const

function phoneLooksValid(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 && /^[\d+\s()-]+$/.test(phone.trim())
}

export function validateAccountProfile(
  v: AccountProfileValues,
  locale: ProfileValidationLocale
): Partial<Record<keyof AccountProfileValues, string>> {
  const m = locale === 'en' ? EN : BS
  const e: Partial<Record<keyof AccountProfileValues, string>> = {}
  if (!v.firstName.trim()) e.firstName = m.firstName
  if (!v.lastName.trim()) e.lastName = m.lastName
  if (!v.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = m.email
  if (!v.phone.trim() || !phoneLooksValid(v.phone)) e.phone = m.phone
  return e
}
