import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { strings } from '../i18n/strings'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

export function PrivacyPage() {
  const t = strings()
  const loc = useLocation()
  const back = loc.pathname.startsWith('/app') ? '/app/profile' : '/welcome'
  const c = t.privacy
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{c.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
          <p>{c.p1}</p>
          <p>{c.p2}</p>
          <p>{c.p3}</p>
          <p>{c.p4}</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-brand-navy">{c.contactTitle}</p>
            <p className="mt-1 text-slate-700">{c.contactHint}</p>
            <p className="mt-2 text-slate-700">
              E-mail: <a className="font-semibold text-brand-teal hover:underline" href={`mailto:${c.supportEmail}`}>{c.supportEmail}</a>
            </p>
            <p className="text-slate-700">
              Telefon: <a className="font-semibold text-brand-teal hover:underline" href={`tel:${c.supportPhoneRaw}`}>{c.supportPhone}</a>
            </p>
            <Button type="button" className="mt-3" onClick={() => setOpen(true)}>
              {c.contactTeamCta}
            </Button>
          </div>
          <Link to={back} className="inline-flex text-sm font-semibold text-brand-teal hover:underline">
            ← {t.common.back}
          </Link>
        </CardContent>
      </Card>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-6"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[86vh] sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-brand-navy">{c.contactModalTitle}</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t.common.close}
              </Button>
            </div>
            <p className="text-sm text-slate-600">{c.contactModalHint}</p>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="privacy-delete-request">{c.contactModalLabel}</Label>
              <Textarea
                id="privacy-delete-request"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={c.contactModalPlaceholder}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  const safeMsg = message.trim() || c.contactModalDefaultMessage
                  window.location.href = `mailto:${c.supportEmail}?subject=${encodeURIComponent(
                    c.contactModalEmailSubject
                  )}&body=${encodeURIComponent(safeMsg)}`
                }}
              >
                {c.contactModalSend}
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => setOpen(false)}>
                {t.common.back}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
