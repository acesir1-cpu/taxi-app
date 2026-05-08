import { useState } from 'react'
import type { RejectReasonCode } from '../../services/driverSessionApi'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

const REASONS: { id: RejectReasonCode; label: string }[] = [
  { id: 'predaleko', label: 'Predaleko' },
  { id: 'pauza', label: 'Pauza' },
  { id: 'guzva', label: 'Gužva' },
  { id: 'tehnicki', label: 'Tehnički razlog' },
  { id: 'drugo', label: 'Drugo' },
]

export function RejectRideModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: RejectReasonCode, note?: string) => void
  loading?: boolean
}) {
  const [reason, setReason] = useState<RejectReasonCode>('predaleko')
  const [note, setNote] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-brand-navy">Odbijanje zahtjeva</h3>
        <p className="mt-1 text-sm text-slate-600">Odaberite razlog odbijanja.</p>
        <div className="mt-4 space-y-2">
          <Label>Razlog</Label>
          <div className="grid gap-2">
            {REASONS.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-brand-teal has-[:checked]:bg-teal-50/50"
              >
                <input type="radio" name="rej" checked={reason === r.id} onChange={() => setReason(r.id)} />
                {r.label}
              </label>
            ))}
          </div>
          {reason === 'drugo' ? (
            <div className="pt-2">
              <Label htmlFor="rej-note">Napomena</Label>
              <textarea
                id="rej-note"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
            Odustani
          </Button>
          <Button
            className="flex-1"
            disabled={loading}
            onClick={() => {
              onConfirm(reason, reason === 'drugo' ? note : undefined)
            }}
          >
            Potvrdi odbijanje
          </Button>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label="Zatvori" onClick={() => onOpenChange(false)} />
    </div>
  )
}
