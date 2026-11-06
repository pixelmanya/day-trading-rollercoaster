import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import { createEmptyState, DEFAULT_SETTINGS, parseState } from './state'

const validTrade = sell(buy({ tradeId: 'a' }), { price: 2, fee: 1 })

/** A stored state whose one trade has `changes`, to break one field at a time. */
function buildStateWith(changes: Readonly<Record<string, unknown>>): unknown {
  return { settings: buildSettings(), trades: [{ ...validTrade, ...changes }] }
}

describe('createEmptyState', () => {
  test('starts without trades and with default settings', () => {
    expect(createEmptyState()).toEqual({ settings: DEFAULT_SETTINGS, trades: [] })
  })
})

describe('parseState', () => {
  test('accepts a valid state with open and closed trades', () => {
    const state = { settings: buildSettings(), trades: [validTrade, buy({ tradeId: 'b' })] }

    expect(parseState(state)).toEqual({ isSuccess: true, output: state })
  })

  test('treats a trade without sell fields as open', () => {
    const { sellPrice, sellFee, sellDate, ...openFields } = buy()
    const parsed = parseState({ settings: buildSettings(), trades: [openFields] })

    expect([sellPrice, sellFee, sellDate]).toEqual([null, 0, null])
    expect(parsed.isSuccess && parsed.output.trades[0]).toEqual(buy())
  })

  test.each([
    {
      problem: 'a non-object',
      input: 'nope',
      message: 'Expected an object with settings and trades.',
    },
    {
      problem: 'missing trades',
      input: { settings: buildSettings() },
      message: 'Trades are missing.',
    },
    { problem: 'missing settings', input: { trades: [] }, message: 'Settings are missing.' },
    {
      problem: 'a zero budget',
      input: { settings: buildSettings({ start: 0 }), trades: [] },
      message: 'Start budget must be a number above 0.',
    },
    {
      problem: 'a tax rate over 60',
      input: { settings: buildSettings({ taxRate: 61 }), trades: [] },
      message: 'Tax rate must be between 0 and 60.',
    },
    {
      problem: 'a negative allowance',
      input: { settings: buildSettings({ allowance: -1 }), trades: [] },
      message: 'Allowance must be 0 or more.',
    },
    {
      problem: 'a non-object trade',
      input: { settings: buildSettings(), trades: [1] },
      message: 'Trade 1 is not an object.',
    },
    {
      problem: 'a missing id',
      input: buildStateWith({ tradeId: '' }),
      message: 'Trade 1: id is missing.',
    },
    {
      problem: 'a missing ticker',
      input: buildStateWith({ ticker: ' ' }),
      message: 'Trade 1: ticker is missing.',
    },
    {
      problem: 'zero shares',
      input: buildStateWith({ shares: 0 }),
      message: 'Trade 1: shares must be above 0.',
    },
    {
      problem: 'a text price',
      input: buildStateWith({ buyPrice: '1' }),
      message: 'Trade 1: buy price must be above 0.',
    },
    {
      problem: 'a negative buy fee',
      input: buildStateWith({ buyFee: -1 }),
      message: 'Trade 1: buy fee can’t be negative.',
    },
    {
      problem: 'a bad buy date',
      input: buildStateWith({ buyDate: '05.11.2026' }),
      message: 'Trade 1: buy date must be YYYY-MM-DD.',
    },
    {
      problem: 'a zero sell price',
      input: buildStateWith({ sellPrice: 0 }),
      message: 'Trade 1: sell price must be above 0.',
    },
    {
      problem: 'a negative sell fee',
      input: buildStateWith({ sellFee: -1 }),
      message: 'Trade 1: sell fee can’t be negative.',
    },
    {
      problem: 'a missing sell date',
      input: buildStateWith({ sellDate: null }),
      message: 'Trade 1: sell date must be YYYY-MM-DD.',
    },
    {
      problem: 'a duplicate id',
      input: { settings: buildSettings(), trades: [validTrade, validTrade] },
      message: 'Trade id “a” appears twice.',
    },
  ])('rejects $problem', ({ input, message }) => {
    expect(parseState(input)).toEqual({
      isSuccess: false,
      error: { kind: 'invalidState', message },
    })
  })
})
