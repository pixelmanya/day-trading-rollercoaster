import { describe, expect, test } from 'vitest'

import { isClosed, isOpen } from './calc'
import { createDemoState, drawRandomNumber } from './demo'
import { parseState } from './state'

const TODAY = '2026-11-06'

describe('drawRandomNumber', () => {
  test('is deterministic and stays in [0, 1)', () => {
    const [first, nextSeed] = drawRandomNumber(42)

    expect(drawRandomNumber(42)).toEqual([first, nextSeed])
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThan(1)
  })
})

describe('createDemoState', () => {
  const demo = createDemoState(TODAY, 2026)

  test('is the same for the same seed', () => {
    expect(createDemoState(TODAY, 2026)).toEqual(demo)
  })

  test('is valid stored data', () => {
    expect(parseState(demo)).toEqual({ isSuccess: true, output: demo })
  })

  test('spans the past year, with trades closed today and two open positions', () => {
    const closed = demo.trades.filter((trade) => isClosed(trade))
    const sellDates = closed.map(({ sellDate }) => sellDate ?? '')

    expect(closed).toHaveLength(60)
    expect(demo.trades.filter((trade) => isOpen(trade))).toHaveLength(2)
    expect(sellDates.filter((sellDate) => sellDate === TODAY)).toHaveLength(3)
    expect(sellDates.some((sellDate) => sellDate < '2026-01-01')).toBe(true)
  })

  test('lists trades in buy order', () => {
    const buyDates = demo.trades.map(({ buyDate }) => buyDate)

    expect(buyDates).toEqual(buyDates.toSorted())
  })
})
