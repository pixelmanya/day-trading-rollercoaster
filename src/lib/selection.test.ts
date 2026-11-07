import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import { computeClosedResults } from './calc'
import { computeRangeSeries } from './ranges'
import { extendSelection, summarizeSelection } from './selection'

const TODAY = '2026-11-06'

// Without tax, each trade adds its pretax result: +200, −100, +200
const closedResults = computeClosedResults(
  [
    sell(buy({ tradeId: 'a' }), { price: 3, date: '2026-03-05' }),
    sell(buy({ tradeId: 'b', price: 2 }), { price: 1, date: '2026-04-01' }),
    sell(buy({ tradeId: 'c' }), { price: 3, date: '2026-05-21' }),
  ],
  buildSettings({ taxRate: 0 }),
  TODAY,
)

const { points } = computeRangeSeries(closedResults, { start: 1000, range: 'ALL', today: TODAY })

describe('summarizeSelection', () => {
  test('measures the change between the ends, whichever way it was dragged', () => {
    const forward = summarizeSelection(points, { anchorIndex: 1, focusIndex: 3 })

    // 1200 → 1300: +100 € on 1200 €, two trades
    expect(forward).toMatchObject({
      fromIndex: 1,
      toIndex: 3,
      change: 100,
      tradeCount: 2,
      fromDate: '2026-03-05',
      toDate: '2026-05-21',
    })

    expect(forward?.changeRatio).toBeCloseTo(100 / 1200, 6)
    expect(summarizeSelection(points, { anchorIndex: 3, focusIndex: 1 })).toEqual(forward)
  })

  test('counts the fees and tax of the trades inside it', () => {
    const withFees = computeClosedResults(
      [
        sell(buy({ tradeId: 'a', fee: 1 }), { price: 3, fee: 1, date: '2026-03-05' }),
        sell(buy({ tradeId: 'b', fee: 2 }), { price: 3, fee: 2, date: '2026-04-01' }),
      ],
      buildSettings({ taxRate: 0 }),
      TODAY,
    )

    const series = computeRangeSeries(withFees, { start: 1000, range: 'ALL', today: TODAY })

    expect(summarizeSelection(series.points, { anchorIndex: 0, focusIndex: 2 })?.costs).toBe(6)
    expect(summarizeSelection(series.points, { anchorIndex: 1, focusIndex: 2 })?.costs).toBe(4)
  })

  test('has no date for the period’s starting point', () => {
    expect(summarizeSelection(points, { anchorIndex: 0, focusIndex: 1 })).toMatchObject({
      fromDate: null,
      change: 200,
    })
  })

  test('needs two points that exist', () => {
    expect(summarizeSelection(points, { anchorIndex: 2, focusIndex: 2 })).toBeNull()
    expect(summarizeSelection(points, { anchorIndex: 1, focusIndex: 9 })).toBeNull()
  })
})

describe('extendSelection', () => {
  test('keeps the anchor, or starts one where the keyboard was', () => {
    expect(extendSelection({ anchorIndex: 1, focusIndex: 2 }, 5, 3)).toEqual({
      anchorIndex: 1,
      focusIndex: 3,
    })

    expect(extendSelection(null, 2, 1)).toEqual({ anchorIndex: 2, focusIndex: 1 })
  })
})
