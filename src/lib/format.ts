const euroFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

const wholeEuroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** Format euros the German way: 1234.5 → "1.234,50 €". */
export function formatEuro(amount: number): string {
  return euroFormatter.format(amount)
}

/** Format whole euros for axis labels: 1250 → "1.250 €". */
export function formatWholeEuro(amount: number): string {
  return wholeEuroFormatter.format(amount)
}

/** Format a number with exactly `digits` decimals: (1234.5, 2) → "1.234,50". */
export function formatNumber(figure: number, digits: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(figure)
}

/** Format a ratio as a signed percentage with one decimal: 0.123 → "+12,3 %". */
export function formatPercent(ratio: number): string {
  const sign = ratio >= 0 ? '+' : ''

  return `${sign}${formatNumber(ratio * 100, 1)} %`
}

/** Format euros with an explicit sign: 12 → "+12,00 €", −12 → "−12,00 €" (true minus). */
export function formatSignedEuro(amount: number): string {
  const sign = amount >= 0 ? '+' : '−'

  return `${sign}${euroFormatter.format(Math.abs(amount))}`
}

/** Format a win rate as a whole percentage, or "–" before there is one: 0.666 → "67 %". */
export function formatWinRate(winRate: number | null): string {
  return winRate === null ? '–' : formatShare(winRate)
}

/** Format a share as a whole percentage without a sign: 0.496 → "50 %". */
export function formatShare(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}

/** Format a signed euro amount, or "–" when there is none yet. */
export function formatOptionalSignedEuro(amount: number | null): string {
  return amount === null ? '–' : formatSignedEuro(amount)
}

/** Format an ISO date as day and month: "2026-11-05" → "05.11.", empty for no date. */
export function formatShortDate(isoDate: string | null): string {
  if (isoDate === null) {
    return ''
  }

  // Noon keeps the date stable in every time zone
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** The calendar date of `now` in the local time zone, as YYYY-MM-DD. */
export function getToday(now: Date): string {
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
