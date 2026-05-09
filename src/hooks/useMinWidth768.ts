import { useEffect, useState } from 'react'

const QUERY = '(min-width: 768px)'

export function useMinWidth768(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return matches
}
