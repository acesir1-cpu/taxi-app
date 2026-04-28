import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { ToastHost } from '../components/common/ToastHost'

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
      {children}
      <ToastHost />
    </QueryClientProvider>
  )
}
