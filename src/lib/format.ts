const eurFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const eur = (v: number): string => eurFmt.format(v)

export const num = (v: number, d = 2): string =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

export const pct = (v: number): string => (v >= 0 ? '+' : '') + num(v * 100, 1) + ' %'

export const signed = (v: number): string => (v >= 0 ? '+' : '−') + eurFmt.format(Math.abs(v))

/** "2026-11-05" → "05.11." */
export const fmtDate = (d: string | null | undefined): string =>
  d
    ? new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    : ''

/** Value shown in an input: German decimals, no thousands separator, empty for missing. */
export const inputValue = (n: number | null | undefined, d = 4): string =>
  n == null || Number.isNaN(n) ? '' : num(n, d).replace(/\./g, '')

/** Today's date in the user's local time zone, as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 10)
