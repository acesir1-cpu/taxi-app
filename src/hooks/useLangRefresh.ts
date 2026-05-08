import { useEffect, useReducer } from 'react'

/** Ponovno renderuje komponentu kad se promijeni `welcomeLang` (događaj iz `setGuestLang`). */
export function useLangRefresh(): void {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const h = () => refresh()
    window.addEventListener('urbanflow:lang-changed', h as EventListener)
    return () => window.removeEventListener('urbanflow:lang-changed', h as EventListener)
  }, [])
}
