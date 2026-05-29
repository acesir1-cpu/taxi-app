import { Link } from 'react-router-dom'
import { PublicInfoShell } from '../components/auth/PublicInfoShell'
import { strings } from '../i18n/strings'

export function NotFoundPage() {
  const t = strings()
  const c = t.notFoundPage

  return (
    <PublicInfoShell>
      <div className="content-page-wrapper">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{c.code}</p>
        <h1>{c.title}</h1>
        <p>{c.message}</p>
        <Link to="/welcome" className="back-link">
          ← {c.home}
        </Link>
      </div>
    </PublicInfoShell>
  )
}
