import type { ReportColumn, ReportDocument, ReportRow } from '../../types/reports'
import { formatReportMetrics } from '../../lib/reports/reportLabels'
import { formatBsDateTime } from '../../utils/date'

function formatCell(value: string | number | boolean | undefined, col: ReportColumn): string {
  if (value === undefined || value === null) return '—'
  if (col.format === 'currency' && typeof value === 'number') return `${value.toFixed(2)} BAM`
  if (col.format === 'datetime' && typeof value === 'string') return formatBsDateTime(value)
  if (col.format === 'number' && typeof value === 'number') return String(value)
  return String(value)
}

export function ReportTable({ section }: { section: ReportDocument['sections'][0] }) {
  const colCount = section.columns.length

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            {section.columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-slate-200 px-3 py-2.5"
                style={{ textAlign: col.align ?? 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.groups.map((group) => (
            <GroupBlock key={group.breakLabel} columns={section.columns} group={group} colCount={colCount} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupBlock({
  columns,
  group,
  colCount,
}: {
  columns: ReportColumn[]
  group: ReportDocument['sections'][0]['groups'][0]
  colCount: number
}) {
  return (
    <>
      <tr className="bg-slate-100/80">
        <td colSpan={colCount} className="border-b border-slate-200 px-3 py-2 font-bold text-brand-navy">
          {group.breakLabel}
        </td>
      </tr>
      {group.rows.length === 0 ? (
        <tr>
          <td colSpan={colCount} className="px-3 py-4 text-center text-slate-500">
            —
          </td>
        </tr>
      ) : (
        group.rows.map((row, i) => (
          <DataRow key={`${group.breakLabel}-${i}`} columns={columns} row={row} />
        ))
      )}
      {group.subtotal ? (
        <tr className="bg-amber-50/80">
          <td colSpan={colCount} className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            {group.subtotal.label ? `${group.subtotal.label}: ` : ''}
            {formatReportMetrics(group.subtotal.values)}
          </td>
        </tr>
      ) : null}
    </>
  )
}

function DataRow({ columns, row }: { columns: ReportColumn[]; row: ReportRow }) {
  return (
    <tr className="hover:bg-slate-50/50">
      {columns.map((col) => (
        <td
          key={col.key}
          className="border-b border-slate-100 px-3 py-2 text-slate-700"
          style={{ textAlign: col.align ?? 'left' }}
        >
          {formatCell(row[col.key], col)}
        </td>
      ))}
    </tr>
  )
}
