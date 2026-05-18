import { Download, Printer } from 'lucide-react'
import type { ReportDocument } from '../../types/reports'
import { getReportBuildLabels } from '../../lib/reports/reportLabels'
import { downloadCsv, openPrintableReport } from '../../lib/reports/reportRender'
import { Button } from '../ui/button'

export function ReportToolbar({
  document,
  labels,
  hasRows,
}: {
  document: ReportDocument
  labels: {
    printPdf: string
    exportCsv: string
    period: string
    generated: string
    page: string
  }
  hasRows: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!hasRows}
        onClick={() => {
          const L = getReportBuildLabels()
          openPrintableReport(document, {
            page: labels.page,
            generated: labels.generated,
            period: labels.period,
            subtotal: L.metricSubtotal,
          })
        }}
      >
        <Printer className="mr-1.5 h-4 w-4" />
        {labels.printPdf}
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={!hasRows} onClick={() => downloadCsv(document)}>
        <Download className="mr-1.5 h-4 w-4" />
        {labels.exportCsv}
      </Button>
    </div>
  )
}
