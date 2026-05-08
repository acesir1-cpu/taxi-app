import { ChevronDown, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import type { DriverUiState } from '../../types/domain'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, passengerAppCardClassName } from '../ui/card'
import { cn } from '../../lib/utils'

function logTone(kind: DriverUiState['activityLog'][number]['kind']): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } {
  switch (kind) {
    case 'vožnja':
      return { label: 'Vožnja', variant: 'success' }
    case 'problem':
      return { label: 'Problem', variant: 'danger' }
    case 'sistem':
      return { label: 'Sistem', variant: 'warning' }
    case 'zahtjev':
      return { label: 'Zahtjev', variant: 'default' }
    case 'status_vozaca':
      return { label: 'Status', variant: 'default' }
    case 'smjena':
      return { label: 'Smjena', variant: 'default' }
    case 'gps':
      return { label: 'GPS', variant: 'warning' }
    default:
      return { label: 'Aktivnost', variant: 'default' }
  }
}

export function DriverActivityLogCard({ ui }: { ui: DriverUiState }) {
  const [foldOpen, setFoldOpen] = useState(false)
  const items = ui.activityLog.slice(0, 10)
  return (
    <Card className={passengerAppCardClassName}>
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-2 text-left"
          onClick={() => setFoldOpen((v) => !v)}
          aria-expanded={foldOpen}
        >
          <span>
            <span className="block text-left text-xl font-extrabold leading-tight tracking-tight text-brand-navy">
              Evidencija aktivnosti
            </span>
            <p className="mt-0.5 text-xs text-slate-500">Interni zapis promjena statusa i akcija.</p>
          </span>
          <ChevronDown
            className={cn('mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200', foldOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
      </CardHeader>
      {foldOpen ? (
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-600">
            <ClipboardList className="h-5 w-5 text-slate-400" aria-hidden />
            <p>Još nema aktivnosti u ovoj sesiji.</p>
          </div>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {items.map((a) => {
              const tone = logTone(a.kind)
              return (
                <li key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="grid grid-cols-[auto,1fr,auto] items-start gap-2">
                    <span className="whitespace-nowrap text-[10px] font-bold uppercase text-slate-400">
                      {new Date(a.createdAt).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy">{a.message}</p>
                      {a.meta ? (
                        <p className="text-xs text-slate-500">
                          {Object.entries(a.meta)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant={tone.variant}
                      className={cn('self-start rounded-full border-slate-200 px-3 py-1.5 text-xs font-semibold')}
                    >
                      {tone.label}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      ) : null}
    </Card>
  )
}
