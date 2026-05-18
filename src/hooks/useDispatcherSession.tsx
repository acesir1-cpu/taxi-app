import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { DispatcherOutletContext } from '../types/appContext'

const DispatcherSessionContext = createContext<DispatcherOutletContext | null>(null)

export function DispatcherSessionProvider({
  value,
  children,
}: {
  value: DispatcherOutletContext
  children: ReactNode
}) {
  return <DispatcherSessionContext.Provider value={value}>{children}</DispatcherSessionContext.Provider>
}

export function useDispatcherSession(): DispatcherOutletContext {
  const ctx = useContext(DispatcherSessionContext)
  if (!ctx) {
    throw new Error('useDispatcherSession must be used within DispatcherSessionProvider')
  }
  return ctx
}
