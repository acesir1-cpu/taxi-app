import { Link, useLocation } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export function PrivacyPage() {
  const t = strings()
  const loc = useLocation()
  const back = loc.pathname.startsWith('/app') ? '/app/profile' : '/welcome'
  const c = t.privacy

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
          <Link to={back} className="inline-flex text-sm font-semibold text-brand-teal hover:underline">
            ← {t.common.back}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
