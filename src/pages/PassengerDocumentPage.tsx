import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { LoadingState } from '../components/common/LoadingState'
import { ReportShell } from '../components/reports/ReportShell'
import { Button } from '../components/ui/button'
import { strings } from '../i18n/strings'
import { buildPassengerDocument, isExternalDocumentType } from '../services/reportApi'
import type { AppOutletContext } from '../types/appContext'

export function PassengerDocumentPage() {
  const t = strings()
  const d = t.documents
  const r = t.dispatcher.reports
  const { docType, entityId } = useParams()
  const { me } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()

  const type = docType && isExternalDocumentType(docType) ? docType : null

  const docQ = useQuery({
    queryKey: ['passengerDocument', type, entityId, me.account.id],
    queryFn: () => buildPassengerDocument(type!, entityId!, me.account.id),
    enabled: !!type && !!entityId,
  })

  const shellLabels = {
    generated: r.generated,
    period: r.period,
    reportId: r.reportId,
    legendTitle: r.legendTitle,
    summaryTitle: r.summaryTitle,
    pageFooter: r.pageFooter,
  }
  const toolbarLabels = {
    printPdf: r.printPdf,
    exportCsv: r.exportCsv,
    period: r.period,
    generated: r.generated,
    page: r.pageFooter,
  }

  if (!type || !entityId) {
    return <p className="text-sm text-slate-600">{d.notFound}</p>
  }

  if (docQ.isLoading) return <LoadingState />

  const result = docQ.data
  if (!result) return <p className="text-sm text-slate-600">{d.notFound}</p>
  if ('error' in result) {
    const msg =
      result.error === 'forbidden'
        ? d.notAllowed
        : result.error === 'not_completed'
          ? d.notCompleted
          : d.notFound
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{msg}</p>
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          {d.back}
        </Button>
      </div>
    )
  }

  const hasRows = result.sections.some((s) => s.groups.some((g) => g.rows.length > 0))

  return (
    <div className="passenger-document-page mx-auto max-w-3xl space-y-4 pb-2">
      <Button variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
        <Link
          to={
            type === 'booking_confirmation'
              ? '/app/scheduled'
              : type === 'invoice'
                ? `/app/rate/${entityId}`
                : `/app/history/${entityId}`
          }
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {d.back}
        </Link>
      </Button>
      <ReportShell
        document={result}
        labels={shellLabels}
        toolbarLabels={toolbarLabels}
      />
      {!hasRows ? <p className="text-sm text-slate-500">{r.noData}</p> : null}
    </div>
  )
}
