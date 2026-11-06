import { formatNumber } from './format'

/**
 * Parse a number typed in German or English notation.
 * "1.234,56" → 1234.56, "0,91" → 0.91, "1095" → 1095, "0.91" → 0.91.
 * Returns NaN for empty or invalid text.
 */
export function parseNumber(text: string): number {
  const compact = text.replaceAll(/\s/g, '')

  if (compact === '') {
    return Number.NaN
  }

  // With a comma present, dots are thousands separators and the comma is the decimal mark
  const normalized = compact.includes(',') ? compact.replaceAll('.', '').replace(',', '.') : compact

  return Number(normalized)
}

/** Parse a fee; empty or invalid text counts as no fee (0 €). */
export function parseFee(text: string): number {
  const fee = parseNumber(text)

  return Number.isNaN(fee) ? 0 : fee
}

/**
 * Format a number for an input field: German decimals without thousands separators,
 * empty for a missing number. (1234.5, 2) → "1234,50".
 */
export function formatInputNumber(figure: number | null, digits: number): string {
  if (figure === null || Number.isNaN(figure)) {
    return ''
  }

  return formatNumber(figure, digits).replaceAll('.', '')
}
