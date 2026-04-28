import { bs } from './bs'
import { en } from './en'
import { getGuestLang } from './guestLocale'

export type AppMessages = typeof bs

/** Tekstovi UI-a ovisno o `welcomeLang` u sessionStorage (`en` ili BS). */
export function strings(): AppMessages {
  return getGuestLang() === 'en' ? (en as unknown as AppMessages) : bs
}
