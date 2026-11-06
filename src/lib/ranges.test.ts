import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import { computeClosedResults } from './calc'
import { computeRangeSeries, getRangeStart } from './ranges'

const TODAY = '2026-11-06'

describe('getRangeStart', () => {
  test.each([
    { range: '1D', expected: '2026-11-06' },
    { range: '1W', expected: '2026-10-31' },
    { range: '1M', expected: '2026-10-06' },
    { range: '3M', expected: '2026-08-06' },
    { range: 'YTD', expected: '2026-01-01' },
    { range: '1Y', expected: '2025-11-06' },
    { range: 'ALL', expected: null },
  ] as const)('starts $range on $expected', ({ range, expected }) => {
    expect(getRangeStart(range, TODAY)).toBe(expected)
  })
})

describe('computeRangeSeries', () => {
  // Each closes +200 € pretax; settings without tax keep the arithmetic simple
  const settings = buildSettings({ start: 1000, taxRate: 0 })

  const closedResults = computeClosedResults(
    [
      sell(buy({ tradeId: 'old' }), { price: 3, date: '2026-01-10' }),
      sell(buy({ tradeId: 'recent' }), { price: 3, date: '2026-11-01' }),
      sell(buy({ tradeId: 'today' }), { price: 3, date: TODAY }),
    ],
    settings,
    TODAY,
  )

  test('covers all trades from the start budget for ALL', () => {
    const series = computeRangeSeries(closedResults, { start: 1000, range: 'ALL', today: TODAY })

    expect(series.points.map(({ balance }) => balance)).toEqual([1000, 1200, 1400, 1600])
    expect(series).toMatchObject({ startBalance: 1000, change: 600, changeRatio: 0.6 })
  })

  test('starts a shorter range from the balance its earlier trades left', () => {
    const series = computeRangeSeries(closedResults, { start: 1000, range: '1W', today: TODAY })

    expect(series.points.map(({ balance }) => balance)).toEqual([1200, 1400, 1600])
    expect(series.points[0]?.closedResult).toBeNull()
    expect(series).toMatchObject({ startBalance: 1200, change: 400 })
    expect(series.changeRatio).toBeCloseTo(1 / 3, 6)
  })

  test('has only its starting point when no trade closed in the range', () => {
    const series = computeRangeSeries(closedResults.slice(0, 1), {
      start: 1000,
      range: '1D',
      today: TODAY,
    })

    expect(series.points).toEqual([{ balance: 1200, closedResult: null }])
    expect(series.change).toBe(0)
  })

  test('counts a closed trade without a sell date as closed today', () => {
    const undated = computeClosedResults(
      [{ ...sell(buy(), { price: 3 }), sellDate: null }],
      settings,
      TODAY,
    )

    expect(computeRangeSeries(undated, { start: 1000, range: '1D', today: TODAY }).change).toBe(200)
  })
})
