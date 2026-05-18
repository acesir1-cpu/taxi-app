import { AppLogo } from '../brand/AppLogo'
import type { ReportDocument } from '../../types/reports'
import { formatReportSummary } from '../../lib/reports/reportLabels'
import { formatBsDateTime } from '../../utils/date'
import { ReportTable } from './ReportTable'
import { ReportToolbar } from './ReportToolbar'

export function ReportShell({
  document,
  labels,
  toolbarLabels,
  children,
}: {
  document: ReportDocument
  labels: {
    generated: string
    period: string
    reportId: string
    legendTitle: string
    summaryTitle: string
    pageFooter: string
  }
  toolbarLabels: {
    printPdf: string
    exportCsv: string
    period: string
    generated: string
    page: string
  }
  children?: import('react').ReactNode
}) {
  const hasRows = document.sections.some((s) => s.groups.some((g) => g.rows.length > 0))
  const periodLine =
    document.meta.periodFrom && document.meta.periodTo
      ? `${labels.period}: ${document.meta.periodFrom} – ${document.meta.periodTo}`
      : null

  return (
    <article className="report-document space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none md:p-6">
      <header className="border-b border-slate-100 pb-4 print:border-slate-300">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo className="h-9 w-auto print:h-8" />
            <div>
              <h1 className="text-xl font-extrabold text-brand-navy md:text-2xl">{document.meta.title}</h1>
              {document.meta.subtitle ? (
                <p className="mt-0.5 text-sm text-slate-600">{document.meta.subtitle}</p>
              ) : null}
            </div>
          </div>
          <ReportToolbar
            document={document}
            labels={toolbarLabels}
            hasRows={hasRows}
          />
        </div>
        <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">{labels.generated}</dt>
            <dd>
              {formatBsDateTime(document.meta.generatedAt)}
              {document.meta.generatedBy ? ` · ${document.meta.generatedBy}` : ''}
            </dd>
          </div>
          {periodLine ? (
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-400">{labels.period}</dt>
              <dd>{periodLine.replace(`${labels.period}: `, '')}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="font-semibold uppercase tracking-wide text-slate-400">{labels.reportId}</dt>
            <dd className="font-mono text-[11px]">{document.meta.id}</dd>
          </div>
        </dl>
      </header>

      {children}

      {document.legend && document.legend.length > 0 ? (
        <section className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 print:bg-transparent">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{labels.legendTitle}</p>
          <ul className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
            {document.legend.map((item) => (
              <li key={item.key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.swatch ?? '#94a3b8' }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {document.sections.map((section, i) => (
        <section key={i} className="space-y-2">
          {section.title ? <h2 className="text-sm font-bold text-brand-navy">{section.title}</h2> : null}
          <ReportTable section={section} />
        </section>
      ))}

      {document.summary && Object.keys(document.summary).length > 0 ? (
        <footer className="rounded-2xl border border-brand-yellow/40 bg-brand-yellow/10 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{labels.summaryTitle}</p>
          <p className="mt-1 text-sm font-semibold text-brand-navy">
            {formatReportSummary(document.summary)}
          </p>
        </footer>
      ) : null}

      <p className="hidden text-center text-[10px] text-slate-400 print:block">{labels.pageFooter}</p>
    </article>
  )
}
