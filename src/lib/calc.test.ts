import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import {
  computeBalanceSeries,
  computeClosedResults,
  computePositionCost,
  computePricePerShare,
  computeSellPretax,
  computeYearTax,
  findTrade,
  getTone,
  isClosed,
  isOpen,
  sortClosedTrades,
  sumBy,
  summarize,
} from './calc'

const TODAY = '2026-11-06'

describe('isClosed and isOpen', () => {
  test('tell sold trades from held ones', () => {
    const held = buy()
    const sold = sell(held, { price: 2 })

    expect([isClosed(held), isOpen(held)]).toEqual([false, true])
    expect([isClosed(sold), isOpen(sold)]).toEqual([true, false])
  })
})

describe('findTrade', () => {
  test('finds a trade by id, or null', () => {
    const trade = buy({ tradeId: 'a' })

    expect(findTrade([trade], 'a')).toBe(trade)
    expect(findTrade([trade], 'b')).toBeNull()
  })
})

describe('computePositionCost', () => {
  test('adds the buy fee to shares times price', () => {
    // 1095 × 0.91258 + 1 = 1000.2751
    expect(computePositionCost(buy({ shares: 1095, price: 0.912_58, fee: 1 }))).toBeCloseTo(
      1000.2751,
      6,
    )
  })
})

describe('computeSellPretax', () => {
  test('subtracts both fees from the price difference', () => {
    // 100 × (1.5 − 1) − 1 − 2 = 47
    const position = buy({ shares: 100, price: 1, fee: 1 })

    expect(computeSellPretax(position, { sellPrice: 1.5, sellFee: 2 })).toBeCloseTo(47, 6)
  })
})

describe('computeYearTax', () => {
  const settings = buildSettings({ allowance: 100, taxRate: 25 })

  test('is zero up to the allowance', () => {
    expect(computeYearTax(100, settings)).toBe(0)
  })

  test('taxes only the part above the allowance', () => {
    // (300 − 100) × 25 % = 50
    expect(computeYearTax(300, settings)).toBeCloseTo(50, 6)
  })

  test('is zero for a loss', () => {
    expect(computeYearTax(-50, settings)).toBe(0)
  })
})

describe('getTone', () => {
  test('reads zero and above as a gain and below zero as a loss', () => {
    expect([getTone(0), getTone(5), getTone(-0.01)]).toEqual(['gain', 'gain', 'loss'])
  })
})

describe('sumBy', () => {
  test('sums the selected numbers', () => {
    expect(sumBy([{ amount: 1 }, { amount: 2.5 }], ({ amount }) => amount)).toBe(3.5)
  })
})

describe('sortClosedTrades', () => {
  test('drops open trades and orders by sell date, keeping same-day order', () => {
    const late = sell(buy({ tradeId: 'late' }), { price: 2, date: '2026-05-01' })
    const firstOfDay = sell(buy({ tradeId: 'first' }), { price: 2, date: '2026-04-01' })
    const secondOfDay = sell(buy({ tradeId: 'second' }), { price: 2, date: '2026-04-01' })
    const sorted = sortClosedTrades([late, buy({ tradeId: 'open' }), firstOfDay, secondOfDay])

    expect(sorted.map(({ tradeId }) => tradeId)).toEqual(['first', 'second', 'late'])
  })

  test('puts closed trades without a sell date first', () => {
    const dated = sell(buy({ tradeId: 'dated' }), { price: 2, date: '2026-01-05' })
    const undated = { ...sell(buy({ tradeId: 'undated' }), { price: 2 }), sellDate: null }

    expect(sortClosedTrades([dated, undated]).map(({ tradeId }) => tradeId)).toEqual([
      'undated',
      'dated',
    ])
  })
})

describe('computeClosedResults', () => {
  const settings = buildSettings({ allowance: 100, taxRate: 25 })

  test('taxes a gain above the allowance and reports the net return', () => {
    // pretax 100 × (3 − 1) = 200, tax (200 − 100) × 25 % = 25, net 175 on cost 100
    const [gain] = computeClosedResults(
      [sell(buy({ shares: 100, price: 1 }), { price: 3 })],
      settings,
      TODAY,
    )

    expect(gain).toMatchObject({ cost: 100, gross: 200, fees: 0, pretax: 200, tax: 25, net: 175 })
    expect(gain?.returnRatio).toBeCloseTo(1.75, 6)
  })

  test('offsets a loss against earlier gains in the same year as a refund', () => {
    // +200 then −100: year total 100 is within the allowance, so the 25 € tax comes back
    const gain = sell(buy({ tradeId: 'gain', price: 1 }), { price: 3, date: '2026-02-01' })
    const loss = sell(buy({ tradeId: 'loss', price: 2 }), { price: 1, date: '2026-03-01' })
    const [, refund] = computeClosedResults([gain, loss], settings, TODAY)

    expect(refund).toMatchObject({ pretax: -100, tax: -25, net: -75 })
  })

  test('gives every calendar year its own allowance', () => {
    const thisYear = sell(buy({ tradeId: 'a' }), { price: 3, date: '2026-12-30' })
    const nextYear = sell(buy({ tradeId: 'b' }), { price: 3, date: '2027-01-02' })
    const taxes = computeClosedResults([thisYear, nextYear], settings, TODAY).map(({ tax }) => tax)

    expect(taxes).toEqual([25, 25])
  })

  test('counts each trade only for the tax its addition causes', () => {
    // 80 then 80: the first stays within the 100 € allowance, the second pays on 60
    const first = sell(buy({ tradeId: 'a', price: 1 }), { price: 1.8, date: '2026-02-01' })
    const second = sell(buy({ tradeId: 'b', price: 1 }), { price: 1.8, date: '2026-02-02' })
    const taxes = computeClosedResults([first, second], settings, TODAY).map(({ tax }) => tax)

    expect(taxes[0]).toBeCloseTo(0, 6)
    expect(taxes[1]).toBeCloseTo(15, 6)
  })

  test('uses today’s year for a closed trade without a sell date', () => {
    const undated = { ...sell(buy(), { price: 3, date: '2025-06-01' }), sellDate: null }
    const dated = sell(buy({ tradeId: 'dated' }), { price: 3, date: '2026-01-10' })
    const taxes = computeClosedResults([undated, dated], settings, TODAY).map(({ tax }) => tax)

    // Both fall into 2026, so the second pays on its full 200 €
    expect(taxes).toEqual([25, 50])
  })
})

describe('computeBalanceSeries', () => {
  test('starts with the budget and adds each net result', () => {
    const closedResults = computeClosedResults(
      [
        sell(buy({ tradeId: 'a' }), { price: 3, date: '2026-02-01' }),
        sell(buy({ tradeId: 'b', price: 2 }), { price: 1, date: '2026-03-01' }),
      ],
      buildSettings(),
      TODAY,
    )

    expect(computeBalanceSeries(closedResults, 1000)).toEqual([1000, 1175, 1100])
  })
})

describe('summarize', () => {
  test('reports a fresh experiment as the untouched budget', () => {
    const summary = summarize([], buildSettings({ start: 1000 }), TODAY)

    expect(summary).toMatchObject({
      balance: 1000,
      change: 0,
      cash: 1000,
      winRate: null,
      averageNet: null,
      fees: 0,
      tax: 0,
    })
  })

  test('derives balance, cash, win rate and fees from open and closed trades', () => {
    const win = sell(buy({ tradeId: 'win', fee: 1 }), { price: 3, fee: 1, date: '2026-02-01' })
    const loss = sell(buy({ tradeId: 'loss', price: 2 }), { price: 1, date: '2026-03-01' })
    const held = buy({ tradeId: 'held', shares: 10, price: 5, fee: 2 })
    const summary = summarize([win, loss, held], buildSettings(), TODAY)

    // win: pretax 198, tax 24.5, net 173.5; loss: pretax −100, tax −24.5, net −75.5
    expect(summary.sumNet).toBeCloseTo(98, 6)
    expect(summary.balance).toBeCloseTo(1098, 6)
    expect(summary.changeRatio).toBeCloseTo(0.098, 6)
    expect(summary.openCost).toBe(52)
    expect(summary.cash).toBeCloseTo(1046, 6)
    expect(summary.winRate).toBe(0.5)
    expect(summary.averageNet).toBeCloseTo(49, 6)
    expect(summary.fees).toBe(4)
    expect(summary.tax).toBeCloseTo(0, 6)
    expect(summary.openPositions).toEqual([{ trade: held, cost: 52 }])
  })
})

describe('computePricePerShare', () => {
  test('divides the amount, fees included, by the shares', () => {
    expect(computePricePerShare(994.72, 8)).toBe(124.34)
  })
})
