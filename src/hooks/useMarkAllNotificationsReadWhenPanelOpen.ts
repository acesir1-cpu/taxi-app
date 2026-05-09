import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { markAllRead } from '../services/notificationApi'

/** When the notifications panel opens, treat the inbox as seen and sync read state (badge + list). */
export function useMarkAllNotificationsReadWhenPanelOpen(
  open: boolean,
  accountId: string,
  unreadCount: number
) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!open || unreadCount === 0) return
    void (async () => {
      await markAllRead(accountId)
      await qc.invalidateQueries({ queryKey: ['notifications', accountId] })
    })()
  }, [open, accountId, unreadCount, qc])
}
