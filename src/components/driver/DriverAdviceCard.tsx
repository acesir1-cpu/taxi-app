import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, passengerAppCardClassName } from '../ui/card'

export function DriverAdviceCard() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Card className={cn(passengerAppCardClassName, 'border-l-4 border-l-brand-yellow')}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 shrink-0 text-brand-yellow-dark" />
            <span>Savjet</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            Održavajte visoku ocjenu i prihvatajte vožnje za više zarade.
          </p>
          <Button variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
            Detaljnije
          </Button>
        </CardContent>
      </Card>
      {open ? (
        <div className="fixed inset-0 z-[400] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-brand-navy">Savjeti za vozače</h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-700">
              <li>Budite tačni na preuzimanju — kratko čekanje povećava ocjenu.</li>
              <li>Redovno provjeravajte GPS i stanje vozila prije smjene.</li>
              <li>Komunicirajte s dispečerom kod nejasnih adresa.</li>
              <li>Pauzirajte status kada trebate pauzu — sistem neće slati nove vožnje.</li>
            </ul>
            <Button variant="cta" className="mt-4 h-11 w-full min-h-[44px]" onClick={() => setOpen(false)}>
              Zatvori
            </Button>
          </div>
          <button type="button" className="absolute inset-0 -z-10" aria-label="Zatvori" onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </>
  )
}
