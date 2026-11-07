import { describe, expect, test } from 'vitest'

import { pairTransactions } from './lots'
import type { BrokerTransaction } from './types'

/** A settled transaction with only the numbers a test cares about. */
function buildTransaction(
  transactionId: string,
  side: BrokerTransaction['side'],
  { shares, amount, executedAt }: Pick<BrokerTransaction, 'shares' | 'amount' | 'executedAt'>,
): BrokerTransaction {
  return {
    transactionId,
    isin: 'US5000811043',
    name: 'Kodiak AI',
    side,
    shares,
    amount,
    date: executedAt.slice(0, 10),
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
  test('closes a buy with the sale of all its shares', () => {
    const [trade] = unwrapTrades([
      buildTransaction('buy', 'buy', {
        shares: 8,
        amount: 994.72,
        executedAt: '2026-11-06T15:21:30Z',
      }),
      buildTransaction('sell', 'sell', {
        shares: 8,
        amount: 990.24,
        executedAt: '2026-11-06T17:09:25Z',
      }),
    ])

    expect(trade).toMatchObject({
      tradeId: 'buy~sell',
      ticker: 'Kodiak AI',
      shares: 8,
      buyFee: 0,
      buyDate: '2026-11-06',
      sellFee: 0,
      sellDate: '2026-11-06',
    })

    expect(trade?.buyPrice).toBeCloseTo(124.34, 6)
    expect(trade?.sellPrice).toBeCloseTo(123.78, 6)
  })

  test('splits one sale across earlier buys, oldest first', () => {
    // Two buys, then everything sold at once, as with the real KODIAK trades
    const trades = unwrapTrades([
      buildTransaction('second', 'buy', {
        shares: 521,
        amount: 499.8995,
        executedAt: '2026-11-06T08:24:01Z',
      }),
      buildTransaction('first', 'buy', {
        shares: 574,
        amount: 499.38,
        executedAt: '2026-11-05T20:26:52Z',
      }),
      buildTransaction('all', 'sell', {
        shares: 1095,
        amount: 1121.28,
        executedAt: '2026-11-06T15:19:56Z',
      }),
    ])

    expect(trades.map(({ tradeId, shares }) => [tradeId, shares])).toEqual([
      ['first~all', 574],
      ['second~all', 521],
    ])

    expect(trades[0]?.buyPrice).toBeCloseTo(0.87, 6)
    expect(trades[1]?.sellPrice).toBeCloseTo(1121.28 / 1095, 6)
  })

  test('keeps the shares no sale took as an open trade under the buy’s ID', () => {
    const trades = unwrapTrades([
      buildTransaction('buy', 'buy', {
        shares: 10,
        amount: 100,
        executedAt: '2026-03-01T10:00:00Z',
      }),
      buildTransaction('part', 'sell', {
        shares: 4,
        amount: 60,
        executedAt: '2026-03-02T10:00:00Z',
      }),
    ])

    expect(trades).toEqual([
      expect.objectContaining({ tradeId: 'buy~part', shares: 4, buyPrice: 10, sellPrice: 15 }),
      expect.objectContaining({ tradeId: 'buy', shares: 6, buyPrice: 10, sellPrice: null }),
    ])
  })

  test('closes one buy over several sales', () => {
    const trades = unwrapTrades([
      buildTransaction('buy', 'buy', {
        shares: 10,
        amount: 100,
        executedAt: '2026-03-01T10:00:00Z',
      }),
      buildTransaction('early', 'sell', {
        shares: 4,
        amount: 60,
        executedAt: '2026-03-02T10:00:00Z',
      }),
      buildTransaction('late', 'sell', {
        shares: 6,
        amount: 30,
        executedAt: '2026-03-03T10:00:00Z',
      }),
    ])

    expect(trades.map(({ tradeId, sellPrice }) => [tradeId, sellPrice])).toEqual([
      ['buy~early', 15],
      ['buy~late', 5],
    ])
  })

  test('pairs each security on its own', () => {
    const other = {
      ...buildTransaction('etf', 'buy', {
        shares: 4,
        amount: 520,
        executedAt: '2026-10-30T10:31:30Z',
      }),
    }

    const trades = unwrapTrades([
      { ...other, isin: 'IE00B4L5Y983', name: 'MSCI World' },
      buildTransaction('buy', 'buy', { shares: 2, amount: 2, executedAt: '2026-11-01T10:00:00Z' }),
      buildTransaction('sell', 'sell', {
        shares: 2,
        amount: 3,
        executedAt: '2026-11-02T10:00:00Z',
      }),
    ])

    expect(trades.map(({ tradeId }) => tradeId)).toEqual(['buy~sell', 'etf'])
  })

  test('treats fractional shares that add up as fully sold', () => {
    const trades = unwrapTrades([
      buildTransaction('first', 'buy', {
        shares: 0.1,
        amount: 1,
        executedAt: '2026-03-01T10:00:00Z',
      }),
      buildTransaction('second', 'buy', {
        shares: 0.2,
        amount: 2,
        executedAt: '2026-03-01T11:00:00Z',
      }),
      buildTransaction('all', 'sell', {
        shares: 0.3,
        amount: 4,
        executedAt: '2026-03-02T10:00:00Z',
      }),
    ])

    expect(trades.every(({ sellPrice }) => sellPrice !== null)).toBe(true)
  })

  test('turns away a sale without enough earlier buys, as when an export is cut short', () => {
    const paired = pairTransactions([
      buildTransaction('buy', 'buy', { shares: 2, amount: 2, executedAt: '2026-11-01T10:00:00Z' }),
      buildTransaction('sell', 'sell', {
        shares: 5,
        amount: 6,
        executedAt: '2026-11-05T10:00:00Z',
      }),
      buildTransaction('later', 'buy', {
        shares: 1,
        amount: 1,
        executedAt: '2026-11-06T10:00:00Z',
      }),
    ])

    expect(paired).toEqual({
      isSuccess: false,
      error: {
        kind: 'importFailed',
        message:
          'Kodiak AI was sold on 05.11. without enough earlier buys. Is the export complete?',
      },
    })
  })

  test('turns away a sale of a security that was never bought', () => {
    const neverBought = buildTransaction('sell', 'sell', {
      shares: 1,
      amount: 1,
      executedAt: '2026-11-05T10:00:00Z',
    })

    expect(pairTransactions([neverBought]).isSuccess).toBe(false)
  })
})
