import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ToastHost } from '../components/common/ToastHost'
import { NotificationBannerHost } from '../components/notifications/NotificationBannerHost'
import { NOTIFICATION_ADDED_EVENT } from '../lib/notificationEvents'

function NotificationQueryInvalidator() {
  const qc = useQueryClient()
  useEffect(() => {
    const fn = (e: Event) => {
      const aid = (e as CustomEvent<{ accountId?: string }>).detail?.accountId
      if (aid) void qc.invalidateQueries({ queryKey: ['notifications', aid] })
    }
    window.addEventListener(NOTIFICATION_ADDED_EVENT, fn)
    return () => window.removeEventListener(NOTIFICATION_ADDED_EVENT, fn)
  }, [qc])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      <NotificationQueryInvalidator />
      {children}
      <ToastHost />
      <NotificationBannerHost />
    </QueryClientProvider>
  )
}
