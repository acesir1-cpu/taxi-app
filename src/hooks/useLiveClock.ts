import { useEffect, useState } from 'react'

type LiveClockOptions = {
  locale?: string
  timeZone?: string
}

function formatClock({ locale = 'bs-BA', timeZone }: LiveClockOptions = {}): string {
  return new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone })
}

export function useLiveClock(options?: LiveClockOptions): string {
  const [t, setT] = useState(() => formatClock(options))
  useEffect(() => {
    const id = window.setInterval(() => {
      setT(formatClock(options))
    }, 1000)
    return () => window.clearInterval(id)
  }, [options?.locale, options?.timeZone])
  return t
}
