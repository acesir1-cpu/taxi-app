import { Printer } from 'lucide-react'
import { strings } from '../../i18n/strings'
import type { DriverRideSummaryPayload } from '../../store/driverRideSummaryStore'
import { Button } from '../ui/button'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openPrintableSummary(summary: DriverRideSummaryPayload) {
  const t = strings()
  const d = t.driver
  const html = `<!DOCTYPE html><html lang="bs"><head><meta charset="utf-8"/><title>${escHtml(d.rideSummaryPrintHeading)}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 1.5rem; max-width: 32rem; margin: 0 auto; color: #0f172a; }
  h1 { font-size: 1.125rem; margin: 0 0 0.25rem; }
  .muted { color: #64748b; font-size: 0.875rem; margin: 0 0 1.25rem; }
  dl { margin: 0; }
  dt { font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 0.75rem; }
  dd { margin: 0.2rem 0 0; font-size: 1rem; }
</style></head><body>
  <h1>${escHtml(d.rideSummaryPrintHeading)}</h1>
  <p class="muted">${escHtml(new Date().toLocaleString())}</p>
  <dl>
    <dt>${escHtml(d.rideSummaryRoute)}</dt><dd>${escHtml(summary.routeLabel)}</dd>
    <dt>${escHtml(d.rideSummaryPrice)}</dt><dd>${escHtml(summary.price.toFixed(2))} BAM</dd>
    <dt>${escHtml(d.rideSummaryDuration)}</dt><dd>${escHtml(String(summary.durationMin))} min</dd>
    <dt>${escHtml(d.rideSummaryPayment)}</dt><dd>${escHtml(summary.payment)}</dd>
  </dl>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export function RideCompleteSummaryModal({
  open,
  onOpenChange,
  summary,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  summary: DriverRideSummaryPayload | null
}) {
  const t = strings()
  const d = t.driver

  if (!open || !summary) return null

  return (
    <div
      className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ride-summary-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="ride-summary-title" className="text-xl font-bold text-brand-navy">
          {d.rideSummaryHeading}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{d.rideSummaryHint}</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-semibold text-slate-500">{d.rideSummaryRoute}:</span> {summary.routeLabel}
          </li>
          <li>
            <span className="font-semibold text-slate-500">{d.rideSummaryPrice}:</span> {summary.price.toFixed(2)} BAM
          </li>
          <li>
            <span className="font-semibold text-slate-500">{d.rideSummaryDuration}:</span> {summary.durationMin} min
          </li>
          <li>
            <span className="font-semibold text-slate-500">{d.rideSummaryPayment}:</span> {summary.payment}
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="min-h-11 flex-1" type="button" onClick={() => onOpenChange(false)}>
            {d.rideSummaryConfirm}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 border-slate-200"
            onClick={() => openPrintableSummary(summary)}
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden />
            {d.rideSummaryPrint}
          </Button>
        </div>
      </div>
    </div>
  )
}
