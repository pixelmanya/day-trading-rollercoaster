import { describe, expect, test } from 'vitest'

import {
  formatEuro,
  formatNumber,
  formatOptionalSignedEuro,
  formatPercent,
  formatShortDate,
  formatSignedEuro,
  formatWholeEuro,
  formatWinRate,
  getToday,
} from './format'

// Intl puts a no-break space between amount and currency
const EURO = ' €'

describe('formatEuro', () => {
  test('formats German currency', () => {
    expect(formatEuro(1234.5)).toBe(`1.234,50${EURO}`)
  })
})

describe('formatNumber', () => {
  test('uses exactly the given decimals', () => {
    expect(formatNumber(1234.5, 2)).toBe('1.234,50')
    expect(formatNumber(0.912_58, 4)).toBe('0,9126')
  })
})

describe('formatPercent', () => {
  test('signs gains and keeps the minus for losses', () => {
    expect(formatPercent(0.123)).toBe('+12,3 %')
    expect(formatPercent(-0.05)).toBe('-5,0 %')
  })
})

describe('formatSignedEuro', () => {
  test('uses a plus for gains and a true minus for losses', () => {
    expect(formatSignedEuro(12)).toBe(`+12,00${EURO}`)
    expect(formatSignedEuro(-12)).toBe(`−12,00${EURO}`)
  })
})

describe('formatWinRate', () => {
  test('rounds to whole percent and shows a dash before any trade', () => {
    expect(formatWinRate(2 / 3)).toBe('67 %')
    expect(formatWinRate(null)).toBe('–')
  })
})

describe('formatOptionalSignedEuro', () => {
  test('formats an amount and shows a dash for none', () => {
    expect(formatOptionalSignedEuro(-1)).toBe(`−1,00${EURO}`)
    expect(formatOptionalSignedEuro(null)).toBe('–')
  })
})

describe('formatShortDate', () => {
  test('shows day and month, and nothing for no date', () => {
    expect(formatShortDate('2026-11-05')).toBe('05.11.')
    expect(formatShortDate(null)).toBe('')
  })
})

describe('getToday', () => {
  test('uses the local calendar date, also late in the evening', () => {
    expect(getToday(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05')
    expect(getToday(new Date(2026, 0, 1, 0, 15))).toBe('2026-01-01')
  })
})

describe('formatWholeEuro', () => {
  test('drops the cents for axis labels', () => {
    expect(formatWholeEuro(1250)).toBe(`1.250${EURO}`)
  })
})
