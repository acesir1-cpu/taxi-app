import { Link, useLocation } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { PublicInfoShell } from '../components/auth/PublicInfoShell'

export function SupportPage() {
  const t = strings()
  const loc = useLocation()
  const back = loc.pathname.startsWith('/app') ? '/app/profile' : '/welcome'
  const c = t.supportPage

  return (
    <PublicInfoShell>
      <div className="content-page-wrapper">
        <h1>{c.title}</h1>
        <p>{c.p1}</p>
        <p>
          <strong>{c.emailLabel}:</strong>{' '}
          <a href={`mailto:${c.email}`} className="font-medium">
            {c.email}
          </a>
        </p>
        <p>{c.p2}</p>
        <Link to={back} className="back-link">
          ← {t.common.back}
        </Link>
      </div>
    </PublicInfoShell>
  )
}
