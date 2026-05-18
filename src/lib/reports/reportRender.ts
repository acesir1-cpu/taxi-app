import type { ReportColumn, ReportDocument } from '../../types/reports'
import {
  formatReportMetrics,
  formatReportSummary,
  getReportBuildLabels,
} from './reportLabels'
import { formatBsDateTime } from '../../utils/date'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCell(value: string | number | boolean | undefined, col: ReportColumn): string {
  if (value === undefined || value === null) return '—'
  if (col.format === 'currency' && typeof value === 'number') return `${value.toFixed(2)} BAM`
  if (col.format === 'datetime' && typeof value === 'string') return formatBsDateTime(value)
  if (col.format === 'date' && typeof value === 'string') return formatBsDateTime(value).split(',')[0] ?? value
  return String(value)
}

export function documentToCsv(doc: ReportDocument): string {
  const L = getReportBuildLabels()
  const lines: string[] = []
  lines.push(`"${doc.meta.title}"`)
  if (doc.meta.periodFrom && doc.meta.periodTo) {
    lines.push(`"${L.csvPeriod}","${doc.meta.periodFrom}","${doc.meta.periodTo}"`)
  }
  lines.push(`"${L.csvGenerated}","${formatBsDateTime(doc.meta.generatedAt)}"`)
  lines.push('')

  for (const section of doc.sections) {
    if (section.title) lines.push(`"${section.title}"`)
    const header = section.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',')
    lines.push(header)
    for (const group of section.groups) {
      lines.push(`"--- ${group.breakLabel.replace(/"/g, '""')} ---"`)
      for (const row of group.rows) {
        lines.push(
          section.columns
            .map((col) => {
              const v = formatCell(row[col.key], col)
              return `"${v.replace(/"/g, '""')}"`
            })
            .join(',')
        )
      }
      if (group.subtotal) {
        const subtotalLabel = group.subtotal.label ?? L.metricSubtotal
        lines.push(
          `"${subtotalLabel.replace(/"/g, '""')}","${formatReportMetrics(group.subtotal.values).replace(/"/g, '""')}"`
        )
      }
    }
    lines.push('')
  }
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCsv(doc: ReportDocument): void {
  const csv = documentToCsv(doc)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.meta.type}-${doc.meta.id.slice(-8)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function buildPrintHtml(
  doc: ReportDocument,
  labels: { page: string; generated: string; period: string; subtotal: string }
): string {
  const period =
    doc.meta.periodFrom && doc.meta.periodTo
      ? `${labels.period}: ${doc.meta.periodFrom} – ${doc.meta.periodTo}`
      : ''
  const legendHtml = doc.legend?.length
    ? `<div class="legend">${doc.legend
        .map(
          (item) =>
            `<span><span class="swatch" style="background:${escHtml(item.swatch ?? '#94a3b8')}"></span>${escHtml(item.label)}</span>`
        )
        .join('')}</div>`
    : ''
  const sectionsHtml = doc.sections
    .map((section) => {
      const thead = `<tr>${section.columns.map((c) => `<th style="text-align:${c.align ?? 'left'}">${escHtml(c.label)}</th>`).join('')}</tr>`
      const body = section.groups
        .map((group) => {
          const header = `<tr class="group-header"><td colspan="${section.columns.length}">${escHtml(group.breakLabel)}</td></tr>`
          const dataRows = group.rows
            .map(
              (row) =>
                `<tr>${section.columns
                  .map(
                    (col) =>
                      `<td style="text-align:${col.align ?? 'left'}">${escHtml(formatCell(row[col.key], col))}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('')
          const sub =
            group.subtotal &&
            `<tr class="subtotal"><td colspan="${section.columns.length}"><strong>${escHtml(group.subtotal.label ?? labels.subtotal)}:</strong> ${escHtml(
              formatReportMetrics(group.subtotal.values)
            )}</td></tr>`
          return header + dataRows + (sub ?? '')
        })
        .join('')
      return `<h2>${escHtml(section.title ?? '')}</h2><table><thead>${thead}</thead><tbody>${body}</tbody></table>`
    })
    .join('')

  const summaryHtml = doc.summary ? `<p class="summary">${escHtml(formatReportSummary(doc.summary))}</p>` : ''

  return `<!DOCTYPE html><html lang="bs"><head><meta charset="utf-8"/><title>${escHtml(doc.meta.title)}</title>
<style>
  @page { margin: 1.2cm 1.5cm; }
  body { font-family: system-ui, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 1rem 1.25rem 3rem; }
  h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
  .muted { color: #64748b; font-size: 0.8rem; margin: 0 0 0.75rem; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.75rem; }
  .swatch { display: inline-block; width: 0.65rem; height: 0.65rem; border-radius: 2px; margin-right: 0.25rem; vertical-align: middle; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  th, td { border: 1px solid #e2e8f0; padding: 0.35rem 0.5rem; }
  th { background: #f8fafc; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .group-header td { background: #f1f5f9; font-weight: 700; }
  .subtotal td { background: #fffbeb; font-size: 0.85rem; }
  .summary { font-weight: 600; margin-top: 0.5rem; }
  .print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 0.7rem; color: #94a3b8; padding: 0.5rem; }
  @media print {
    .group-header { break-inside: avoid; }
    tr { break-inside: avoid; }
  }
</style></head><body>
  <h1>${escHtml(doc.meta.title)}</h1>
  <p class="muted">${escHtml(doc.meta.subtitle ?? '')}</p>
  <p class="muted">${labels.generated}: ${escHtml(formatBsDateTime(doc.meta.generatedAt))}${doc.meta.generatedBy ? ` · ${escHtml(doc.meta.generatedBy)}` : ''}</p>
  ${period ? `<p class="muted">${escHtml(period)}</p>` : ''}
  <p class="muted">ID: ${escHtml(doc.meta.id)}</p>
  ${legendHtml}
  ${sectionsHtml}
  ${summaryHtml}
  <div class="print-footer">${escHtml(labels.page)}</div>
</body></html>`
}

export function openPrintableReport(
  doc: ReportDocument,
  labels: { page: string; generated: string; period: string; subtotal: string }
): void {
  const html = buildPrintHtml(doc, labels)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export function buildEmailBody(doc: ReportDocument, maxRows = 8): string {
  const L = getReportBuildLabels()
  const lines = [
    doc.meta.title,
    doc.meta.subtitle ?? '',
    `${L.csvGenerated}: ${formatBsDateTime(doc.meta.generatedAt)}`,
  ]
  if (doc.meta.periodFrom && doc.meta.periodTo) {
    lines.push(`${L.csvPeriod}: ${doc.meta.periodFrom} – ${doc.meta.periodTo}`)
  }
  lines.push('')
  for (const section of doc.sections) {
    let count = 0
    for (const group of section.groups) {
      for (const row of group.rows) {
        if (count >= maxRows) {
          lines.push('…')
          return encodeURIComponent(lines.join('\n'))
        }
        const preview = section.columns
          .slice(0, 3)
          .map((c) => `${c.label}: ${formatCell(row[c.key], c)}`)
          .join(' | ')
        lines.push(preview)
        count++
      }
    }
  }
  return encodeURIComponent(lines.join('\n'))
}

export function openReportEmail(doc: ReportDocument, to = ''): void {
  const subject = encodeURIComponent(doc.meta.title)
  const body = buildEmailBody(doc)
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
}
