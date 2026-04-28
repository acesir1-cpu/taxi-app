import { z } from 'zod'
import type { AppMessages } from '../i18n/strings'

export function buildRegisterSchema(t: AppMessages) {
  const v = t.auth.validation
  return z
    .object({
      firstName: z.string().min(1, v.required),
      lastName: z.string().min(1, v.required),
      email: z.string().email(v.invalidEmail),
      phone: z.string().min(8, v.invalidPhone).regex(/^\+?[0-9\s-]{8,}$/, v.phoneFormat),
      password: z.string().min(8, v.passwordMin),
      confirmPassword: z.string().min(1, v.required),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: v.passwordsMismatch,
      path: ['confirmPassword'],
    })
}

export type RegisterFormValues = z.infer<ReturnType<typeof buildRegisterSchema>>

export function buildLoginSchema(t: AppMessages) {
  const v = t.auth.validation
  return z.object({
    identifier: z.string().min(1, v.required),
    password: z.string().min(1, v.required),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>
