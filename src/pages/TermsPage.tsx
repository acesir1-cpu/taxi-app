import { Link, useLocation } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { PublicInfoShell } from '../components/auth/PublicInfoShell'

export function TermsPage() {
  const t = strings()
  const loc = useLocation()
  const back = loc.pathname.startsWith('/app') ? '/app/profile' : '/welcome'
  const c = t.termsPage

  return (
    <PublicInfoShell>
      <div className="content-page-wrapper">
        <h1>{c.title}</h1>
        <p>{c.p1}</p>
        <p>{c.p2}</p>
        <p>{c.p3}</p>
        <Link to={back} className="back-link">
          ← {t.common.back}
        </Link>
      </div>
    </PublicInfoShell>
  )
}
