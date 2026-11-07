import { describe, expect, test } from 'vitest'

import { pairTransactions } from './lots'
import type { BrokerTransaction } from './types'

interface Fill {
  readonly shares: number
  readonly amount: number
  /** Execution order on 06.11.2026, in minutes after 10:00 UTC. */
  readonly minute: number
}

/** A settled transaction of one security with only the numbers a test cares about. */
function buildTransaction(
  transactionId: string,
  side: BrokerTransaction['side'],
  { shares, amount, minute }: Fill,
): BrokerTransaction {
  const executedAt = `2026-11-06T10:${String(minute).padStart(2, '0')}:00Z`

  return {
    transactionId,
    isin: 'X1',
    name: 'Kodiak AI',
    side,
    shares,
    amount,
    date: '2026-11-06',
    executedAt,
  }
}

/** The paired trades; fails the test on an error. */
function unwrapTrades(transactions: readonly BrokerTransaction[]) {
  const paired = pairTransactions(transactions)

  if (!paired.isSuccess) {
    throw new Error(paired.error.message)
  }

  return paired.output
}

describe('pairTransactions', () => {
  test('closes a buy with the sale of all its shares, prices including fees', () => {
    const [trade] = unwrapTrades([
      buildTransaction('sell', 'sell', { shares: 8, amount: 990.24, minute: 2 }),
      buildTransaction('buy', 'buy', { shares: 8, amount: 994.72, minute: 1 }),
    ])

    expect(trade).toMatchObject({ tradeId: 'buy~sell', ticker: 'Kodiak AI', shares: 8, buyFee: 0 })
    expect(trade).toMatchObject({ buyDate: '2026-11-06', sellFee: 0, sellDate: '2026-11-06' })
    expect(trade?.buyPrice).toBeCloseTo(124.34, 6)
    expect(trade?.sellPrice).toBeCloseTo(123.78, 6)
  })

  test('splits one sale across earlier buys, oldest first', () => {
    const trades = unwrapTrades([
      buildTransaction('first', 'buy', { shares: 574, amount: 499.38, minute: 1 }),
      buildTransaction('second', 'buy', { shares: 521, amount: 499.8995, minute: 2 }),
      buildTransaction('all', 'sell', { shares: 1095, amount: 1121.28, minute: 3 }),
    ])

    expect(trades.map(({ tradeId, shares }) => [tradeId, shares])).toEqual([
      ['first~all', 574],
      ['second~all', 521],
    ])

    expect(trades[0]?.buyPrice).toBeCloseTo(0.87, 6)
    expect(trades[1]?.sellPrice).toBeCloseTo(1121.28 / 1095, 6)
  })

  test('closes one buy over several sales and keeps unsold shares open under the buy’s ID', () => {
    const trades = unwrapTrades([
      buildTransaction('buy', 'buy', { shares: 10, amount: 100, minute: 1 }),
      buildTransaction('early', 'sell', { shares: 4, amount: 60, minute: 2 }),
      buildTransaction('late', 'sell', { shares: 3, amount: 15, minute: 3 }),
    ])

    expect(trades.map(({ tradeId, shares, sellPrice }) => [tradeId, shares, sellPrice])).toEqual([
      ['buy~early', 4, 15],
      ['buy~late', 3, 5],
      ['buy', 3, null],
    ])
  })

  test('pairs each security on its own', () => {
    const fund = buildTransaction('fund', 'buy', { shares: 4, amount: 520, minute: 1 })

    const trades = unwrapTrades([
      { ...fund, isin: 'X2' },
      buildTransaction('buy', 'buy', { shares: 2, amount: 2, minute: 2 }),
      buildTransaction('sell', 'sell', { shares: 2, amount: 3, minute: 3 }),
    ])

    expect(trades.map(({ tradeId }) => tradeId)).toEqual(['buy~sell', 'fund'])
  })

  test('treats fractional shares that add up as fully sold', () => {
    const trades = unwrapTrades([
      buildTransaction('first', 'buy', { shares: 0.1, amount: 1, minute: 1 }),
      buildTransaction('second', 'buy', { shares: 0.2, amount: 2, minute: 2 }),
      buildTransaction('all', 'sell', { shares: 0.3, amount: 4, minute: 3 }),
    ])

    expect(trades.every(({ sellPrice }) => sellPrice !== null)).toBe(true)
  })

  test('turns away a sale without enough earlier buys, as when an export is cut short', () => {
    const message =
      'Kodiak AI was sold on 06.11. without enough earlier buys. Is the export complete?'

    const tooMany = pairTransactions([
      buildTransaction('buy', 'buy', { shares: 2, amount: 2, minute: 1 }),
      buildTransaction('sell', 'sell', { shares: 5, amount: 6, minute: 2 }),
      buildTransaction('later', 'buy', { shares: 3, amount: 3, minute: 3 }),
    ])

    const neverBought = pairTransactions([
      buildTransaction('sell', 'sell', { shares: 1, amount: 1, minute: 1 }),
    ])

    expect(tooMany).toEqual({ isSuccess: false, error: { kind: 'importFailed', message } })
    expect(neverBought.isSuccess).toBe(false)
  })
})
