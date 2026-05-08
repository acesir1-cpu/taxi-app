import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { getDb } from '../services/mockDb'
import {
  approveDriverAvatarRequest,
  listPendingDriverAvatarRequests,
  rejectDriverAvatarRequest,
} from '../services/driverPhotoApi'

const ADMIN_SESSION_KEY = 'urbanflow_admin_driver_photos_ok'
/** Demo PIN — u produkciji zamijeniti pravom autentifikacijom. */
const ADMIN_DEMO_PIN = 'UF-2026'

export function AdminDriverPhotosPage() {
  const qc = useQueryClient()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const pendingQ = useQuery({
    queryKey: ['adminDriverAvatarPending'],
    queryFn: () => listPendingDriverAvatarRequests(),
    enabled: unlocked,
    refetchInterval: unlocked ? 15_000 : false,
  })

  useEffect(() => {
    if (unlocked) void qc.invalidateQueries({ queryKey: ['adminDriverAvatarPending'] })
  }, [unlocked, qc])

  const approveMut = useMutation({
    mutationFn: (id: string) => approveDriverAvatarRequest(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminDriverAvatarPending'] })
      await qc.invalidateQueries({ queryKey: ['driverAvatar'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => rejectDriverAvatarRequest(id, note),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminDriverAvatarPending'] })
    },
  })

  function tryUnlock(e: FormEvent) {
    e.preventDefault()
    if (pin === ADMIN_DEMO_PIN) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
      setPinError(false)
      setUnlocked(true)
      setPin('')
    } else {
      setPinError(true)
    }
  }

  if (!unlocked) {
    return (
      <div className="app-shell-atmosphere min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center gap-2 text-brand-navy">
            <ShieldCheck className="h-8 w-8" aria-hidden />
            <h1 className="text-xl font-bold">Administracija — fotografije vozača</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pristup</CardTitle>
              <p className="text-sm text-slate-600">
                Unesite administratorski PIN (demo: <span className="font-mono font-semibold">{ADMIN_DEMO_PIN}</span>).
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={tryUnlock} className="space-y-3">
                <div>
                  <Label htmlFor="admin-pin">PIN</Label>
                  <Input
                    id="admin-pin"
                    type="password"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value)
                      setPinError(false)
                    }}
                    className={pinError ? 'border-red-400' : ''}
                  />
                  {pinError ? <p className="mt-1 text-xs text-red-600">Pogrešan PIN.</p> : null}
                </div>
                <Button type="submit" className="w-full">
                  Otključaj
                </Button>
              </form>
              <p className="mt-4 text-center text-sm">
                <Link to="/welcome" className="font-semibold text-brand-teal hover:underline">
                  Nazad na početnu
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const pending = pendingQ.data ?? []

  return (
    <div className="app-shell-atmosphere min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-brand-navy">Zahtjevi za profilne fotografije</h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem(ADMIN_SESSION_KEY)
                setUnlocked(false)
              }}
            >
              Odjava admina
            </Button>
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link to="/welcome">Početna</Link>
            </Button>
          </div>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-600">Nema zahtjeva na čekanju.</CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {pending.map((req) => {
              const db = getDb()
              const driver = db.drivers.find((d) => d.id === req.driverId)
              const acc = db.users.find((u) => u.id === req.driverAccountId)
              const title = driver ? `${driver.firstName} ${driver.lastName}` : req.driverId
              const subtitle = acc?.email ?? req.driverAccountId
              return (
                <li key={req.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      <img
                        src={req.proposedDataUrl}
                        alt=""
                        className="h-28 w-28 shrink-0 rounded-2xl border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="font-semibold text-brand-navy">{title}</p>
                        <p className="text-sm text-slate-600">{subtitle}</p>
                        <p className="text-xs text-slate-500">
                          Poslano: {new Date(req.submittedAt).toLocaleString('bs-BA')}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={approveMut.isPending || rejectMut.isPending}
                            onClick={() => approveMut.mutate(req.id)}
                          >
                            Odobri
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={approveMut.isPending || rejectMut.isPending}
                            onClick={() => rejectMut.mutate({ id: req.id })}
                          >
                            Odbij
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
