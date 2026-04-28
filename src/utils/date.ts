export function toIso(d: Date): string {
  return d.toISOString()
}

export function parseIso(s: string): Date {
  return new Date(s)
}

export function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000)
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Local calendar date as DD.MM.YYYY (e.g. 26.04.2026). */
export function formatBsDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
  } catch {
    return iso
  }
}

/** Local date + 24h time as DD.MM.YYYY, HH:mm (e.g. 26.04.2026, 14:05). */
export function formatBsDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
    const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    return `${date}, ${time}`
  } catch {
    return iso
  }
}
