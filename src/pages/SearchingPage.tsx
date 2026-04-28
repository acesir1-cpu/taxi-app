import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { strings } from '../i18n/strings'
import type { AppOutletContext } from '../types/appContext'
import { assignDriver } from '../services/rideApi'
import { getDb } from '../services/mockDb'
import { useToastStore } from '../store/notificationStore'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'

export function SearchingPage() {
  const t = strings()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { requestId?: string } }
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)
  const requestId = location.state?.requestId
  const [checked, setChecked] = useState<string[]>([])
  const assignOnce = useRef(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  const candidates = useMemo(() => getDb().drivers.slice(0, 4), [])

  useEffect(() => {
    if (!requestId) {
      navigate('/app/order', { replace: true })
      return
    }
    if (assignOnce.current) return
    assignOnce.current = true
    let alive = true
    ;(async () => {
      const res = await assignDriver(requestId, me.account.id)
      if (!alive) return
      if ('error' in res) {
        setFailed(true)
        setLoading(false)
        push(strings().notifications.noDrivers, 'error')
        return
      }
      await qc.invalidateQueries({ queryKey: ['activeRide', me.profile.id] })
      await qc.invalidateQueries({ queryKey: ['ride', res.ride.id] })
      navigate(`/app/ride/${res.ride.id}`, { replace: true })
    })()
    return () => {
      alive = false
    }
  }, [me.account.id, me.profile.id, navigate, push, qc, requestId])

  useEffect(() => {
    if (!loading || failed) return
    let i = 0
    const t = window.setInterval(() => {
      const id = candidates[i % candidates.length]?.id
      if (id) setChecked((c) => (c.includes(id) ? c : [...c, id]))
      i++
    }, 600)
    return () => clearInterval(t)
  }, [loading, failed, candidates])

  if (!requestId) return null

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Card>
        <CardContent className="space-y-6 py-8 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-yellow text-brand-navy shadow-md"
          >
            <Loader2 className="h-8 w-8 animate-spin" />
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">{t.order.searching}</h2>
            <p className="mt-2 text-sm text-slate-600">{t.order.searchingSubtitle}</p>
          </div>
          <ul className="space-y-2 text-left text-sm">
            {candidates.map((d) => (
              <li
                key={d.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  checked.includes(d.id) ? 'border-brand-teal bg-teal-50' : 'border-brand-border bg-white'
                }`}
              >
                <span className="font-medium">
                  {d.firstName} {d.lastName}
                </span>
                <span className="text-xs text-slate-500">
                  {checked.includes(d.id) ? t.order.driverCheckActive : t.order.driverCheckPending}
                </span>
              </li>
            ))}
          </ul>
          {failed ? (
            <div className="space-y-3">
              <p className="font-semibold text-brand-danger">{t.order.noDrivers}</p>
              <Button className="w-full" onClick={() => navigate('/app/order', { replace: true })}>
                {t.order.retry}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/app/order', { replace: true })}>
                {t.order.scheduleRide}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
