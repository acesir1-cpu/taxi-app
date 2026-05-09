export const NOTIFICATION_ADDED_EVENT = 'urbanflow:notification-added'

export function dispatchNotificationAdded(accountId: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(NOTIFICATION_ADDED_EVENT, { detail: { accountId } }))
}
