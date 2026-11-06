/*
 * Calendar arithmetic on ISO dates (YYYY-MM-DD). Everything runs in UTC, so time zones and
 * daylight saving never shift a date.
 */

const MONTHS_PER_YEAR = 12

/** The ISO date of a UTC Date. */
export function toIsoDate(date: Date): string {
  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** `isoDate` moved by `days` (negative moves back): ("2026-03-01", -1) → "2026-02-28". */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = parseIsoDate(isoDate)

  return toIsoDate(new Date(Date.UTC(year, month - 1, day + days)))
}

/**
 * `isoDate` moved by whole months, clamped to the target month's last day:
 * ("2026-03-31", -1) → "2026-02-28".
 */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = parseIsoDate(isoDate)
  const targetMonth = month - 1 + months
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate()

  return toIsoDate(new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))))
}

/** `isoDate` moved by whole years, clamped like addMonths (29 February → 28 February). */
export function addYears(isoDate: string, years: number): string {
  return addMonths(isoDate, years * MONTHS_PER_YEAR)
}

function parseIsoDate(isoDate: string): readonly [number, number, number] {
  return [Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)), Number(isoDate.slice(8, 10))]
}
