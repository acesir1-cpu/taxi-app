import { useState } from 'react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

export function CancelRideModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string, unjustified: boolean) => void
  loading?: boolean
}) {
  const [reason, setReason] = useState('')
  const [unjustified, setUnjustified] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-brand-navy">Otkaži vožnju</h3>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Dispečer i korisnik će biti obaviješteni. Razlog je obavezan.
        </p>
        <div className="mt-4">
          <Label htmlFor="can-reason">Razlog otkazivanja</Label>
          <textarea
            id="can-reason"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={unjustified} onChange={(e) => setUnjustified(e.target.checked)} />
          Označiti kao neopravdano (upozorenje administraciji)
        </label>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
            Odustani
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={loading || !reason.trim()}
            onClick={() => onConfirm(reason.trim(), unjustified)}
          >
            Otkaži vožnju
          </Button>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label="Zatvori" onClick={() => onOpenChange(false)} />
    </div>
  )
}
