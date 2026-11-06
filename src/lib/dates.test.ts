import { describe, expect, test } from 'vitest'

import { addDays, addMonths, addYears, toIsoDate } from './dates'

describe('toIsoDate', () => {
  test('formats a UTC date', () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  test('moves across month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('addMonths', () => {
  test('moves by calendar months', () => {
    expect(addMonths('2026-11-06', -1)).toBe('2026-10-06')
    expect(addMonths('2026-01-15', -3)).toBe('2025-10-15')
  })

  test('clamps to the last day of shorter months', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })
})

describe('addYears', () => {
  test('moves by years and clamps leap days', () => {
    expect(addYears('2026-11-06', -1)).toBe('2025-11-06')
    expect(addYears('2028-02-29', -1)).toBe('2027-02-28')
  })
})
