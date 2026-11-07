import { describe, expect, test } from 'vitest'

import { parseScalableExport, scalableSource } from './scalable'

/** One entry shaped like the official CLI's output; IDs are made up. */
function buildEntry(overrides: Readonly<Record<string, unknown>>) {
  return {
    amount: -994.72,
    currency: 'EUR',
    description: 'KLA Corp',
    id: 'buy-kla',
    is_cancellation: false,
    isin: 'US4824801009',
    last_event_datetime: '2026-11-06T15:21:30.004Z',
    limit_price: 129.3552,
    quantity: 8,
    side: 'BUY',
    status: 'SETTLED',
    type: 'SECURITY_TRANSACTION',
    ...overrides,
  }
}

/** The CLI's JSON around `entries`, as one page of `pageSize`. */
function buildExport(entries: readonly unknown[], { cursor = null, pageSize = 20 } = {}) {
  return JSON.stringify({
    ok: true,
    command: 'broker.transactions',
    data: { result: { cursor, input: { cursor: null, pageSize }, items: entries } },
  })
}

describe('parseScalableExport', () => {
  test('reads settled buys and sells with their cash amounts and Berlin dates', () => {
    const parsed = parseScalableExport(
      buildExport([
        buildEntry({}),
        buildEntry({
          id: 'sell-kla',
          side: 'SELL',
          amount: 990.24,
          last_event_datetime: '2026-11-06T23:30:00Z',
        }),
      ]),
    )

    expect(parsed).toEqual({
      isSuccess: true,
      output: {
        isPossiblyIncomplete: false,
        transactions: [
          {
            transactionId: 'scalable:buy-kla',
            isin: 'US4824801009',
            name: 'KLA Corp',
            side: 'buy',
            shares: 8,
            amount: 994.72,
            date: '2026-11-06',
            executedAt: '2026-11-06T15:21:30.004Z',
          },
          expect.objectContaining({ side: 'sell', amount: 990.24, date: '2026-11-07' }),
        ],
      },
    })
  })

  test('skips orders that never executed, cancellations and cash movements', () => {
    const parsed = parseScalableExport(
      buildExport([
        buildEntry({ status: 'PENDING', amount: 0 }),
        buildEntry({ status: 'CANCELLED', amount: 0 }),
        buildEntry({ is_cancellation: true }),
        {
          type: 'CASH_TRANSACTION',
          cash_transaction_type: 'DEPOSIT',
          amount: 500,
          status: 'SETTLED',
        },
        'not an entry',
      ]),
    )

    expect(parsed.isSuccess && parsed.output.transactions).toEqual([])
  })

  test('warns when a full page came with a cursor to more', () => {
    const fullPage = buildExport([buildEntry({})], { cursor: '1793206997460|next', pageSize: 1 })
    const lastPage = buildExport([buildEntry({})], { cursor: '1793206997460|next', pageSize: 20 })

    expect(
      parseScalableExport(fullPage).isSuccess && parseScalableExport(fullPage).output,
    ).toMatchObject({
      isPossiblyIncomplete: true,
    })

    expect(
      parseScalableExport(lastPage).isSuccess && parseScalableExport(lastPage).output,
    ).toMatchObject({
      isPossiblyIncomplete: false,
    })
  })

  test.each([
    { name: 'text that isn’t JSON', text: 'nope', message: /isn’t a Scalable export/ },
    { name: 'other JSON', text: '{"data":{}}', message: /isn’t a Scalable export/ },
    {
      name: 'items that aren’t a list',
      text: '{"data":{"result":{"items":{}}}}',
      message: /isn’t/,
    },
    {
      name: 'a trade without shares',
      text: buildExport([buildEntry({ quantity: 0 })]),
      message: /unexpected format/,
    },
    {
      name: 'a trade with an unknown side',
      text: buildExport([buildEntry({ side: 'SWAP' })]),
      message: /unexpected format/,
    },
    {
      name: 'a trade with a malformed time',
      text: buildExport([buildEntry({ last_event_datetime: 'yesterday' })]),
      message: /unexpected format/,
    },
    {
      name: 'a trade without an ID',
      text: buildExport([buildEntry({ id: '' })]),
      message: /unexpected format/,
    },
  ])('turns away $name', ({ text, message }) => {
    const parsed = parseScalableExport(text)

    expect(parsed.isSuccess ? null : parsed.error).toMatchObject({ kind: 'importFailed', message })
  })
})

describe('scalableSource', () => {
  test('names the broker and parses its exports', () => {
    expect(scalableSource).toMatchObject({ sourceId: 'scalable', label: 'Scalable Capital' })
    expect(scalableSource.parseExport(buildExport([])).isSuccess).toBe(true)
  })
})
