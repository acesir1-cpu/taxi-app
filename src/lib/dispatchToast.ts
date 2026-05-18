import type { AppMessages } from '../i18n/strings'

export function dispatchToastMessage(code: string, t: AppMessages): string {
  const toast = t.dispatcher.toast as Record<string, string>
  return toast[code] ?? toast.generic
}
