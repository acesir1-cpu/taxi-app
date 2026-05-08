/** Isti ključ kao na welcome BS/EN prekidaču. */
export const GUEST_LANG_KEY = 'welcomeLang'

export type GuestLang = 'bs' | 'en'

export function getGuestLang(): GuestLang {
  try {
    return sessionStorage.getItem(GUEST_LANG_KEY) === 'en' ? 'en' : 'bs'
  } catch {
    return 'bs'
  }
}

export function setGuestLang(lang: GuestLang): void {
  try {
    sessionStorage.setItem(GUEST_LANG_KEY, lang)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('urbanflow:lang-changed', { detail: { lang } }))
  }
}
