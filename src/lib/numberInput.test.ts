import { describe, expect, test } from 'vitest'

import { formatInputNumber, parseFee, parseNumber } from './numberInput'

describe('parseNumber', () => {
  test.each([
    ['0,91', 0.91],
    ['0.91', 0.91],
    ['1.234,56', 1234.56],
    [' 1 095 ', 1095],
    ['1095', 1095],
  ])('reads "%s" as %d', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  test('gives NaN for empty or invalid text', () => {
    expect(parseNumber('')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
  })
})

describe('parseFee', () => {
  test('treats empty or invalid text as no fee', () => {
    expect(parseFee('')).toBe(0)
    expect(parseFee('x')).toBe(0)
    expect(parseFee('1,50')).toBe(1.5)
  })
})

describe('formatInputNumber', () => {
  test('writes German decimals without thousands separators', () => {
    expect(formatInputNumber(1234.5, 2)).toBe('1234,50')
  })

  test('is empty for a missing number', () => {
    expect(formatInputNumber(null, 2)).toBe('')
    expect(formatInputNumber(Number.NaN, 2)).toBe('')
  })
})
