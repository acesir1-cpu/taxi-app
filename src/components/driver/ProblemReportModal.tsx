import { useEffect, useState } from 'react'
import type { ProblemTypeCode } from '../../services/driverSessionApi'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

const TYPES: { id: ProblemTypeCode; label: string }[] = [
  { id: 'kvar_vozila', label: 'Kvar vozila' },
  { id: 'gps_problem', label: 'GPS problem' },
  { id: 'putnik_otkaz', label: 'Putnik se ne pojavljuje' },
  { id: 'adresa', label: 'Neispravna adresa' },
  { id: 'guzva', label: 'Saobraćajna gužva' },
  { id: 'drugo', label: 'Drugo' },
]

export function ProblemReportModal({
  open,
  onOpenChange,
  onSend,
  loading,
  initialType = 'gps_problem',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSend: (type: ProblemTypeCode, description: string) => void
  loading?: boolean
  initialType?: ProblemTypeCode
}) {
  const [type, setType] = useState<ProblemTypeCode>(initialType)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setType(initialType)
      setDescription('')
    }
  }, [open, initialType])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-brand-navy">Prijavi problem</h3>
        <p className="mt-1 text-sm text-slate-600">Problem se prosljeđuje dispečerskom centru.</p>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Tip problema</Label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as ProblemTypeCode)}
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="prob-desc">Opis</Label>
            <textarea
              id="prob-desc"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kratko opišite situaciju…"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
            Odustani
          </Button>
          <Button
            className="flex-1"
            disabled={loading || !description.trim()}
            onClick={() => {
              onSend(type, description.trim())
            }}
          >
            Pošalji dispečeru
          </Button>
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label="Zatvori" onClick={() => onOpenChange(false)} />
    </div>
  )
}
