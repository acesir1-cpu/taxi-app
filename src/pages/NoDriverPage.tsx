import { useLocation, useNavigate } from 'react-router-dom'
import { strings } from '../i18n/strings'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

const SEARCH_REQUEST_KEY = 'urbanflow_search_request_id'

function getStoredSearchRequestId(): string | null {
  try {
    return sessionStorage.getItem(SEARCH_REQUEST_KEY)
  } catch {
    return null
  }
}

function clearStoredSearchRequestId(): void {
  try {
    sessionStorage.removeItem(SEARCH_REQUEST_KEY)
  } catch {
    // ignore
  }
}

export function NoDriverPage() {
  const t = strings()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { requestId?: string } }
  const requestId = location.state?.requestId ?? getStoredSearchRequestId()

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t.noDriverPage.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{t.noDriverPage.description}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() =>
                requestId
                  ? navigate('/app/searching', { state: { requestId }, replace: true })
                  : navigate('/app/order', { replace: true })
              }
            >
              {t.noDriverPage.retry}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearStoredSearchRequestId()
                navigate('/app/order', { replace: true })
              }}
            >
              {t.noDriverPage.backToOrder}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
