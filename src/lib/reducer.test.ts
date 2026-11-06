import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import { reduceAppState } from './reducer'
import { createEmptyState } from './state'
import type { AppState } from './types'

const held = buy({ tradeId: 'held' })
const sold = sell(buy({ tradeId: 'sold' }), { price: 2, fee: 1, date: '2026-03-01' })
const state: AppState = { settings: buildSettings(), trades: [held, sold] }

describe('reduceAppState', () => {
  test('saves settings', () => {
    const settings = buildSettings({ start: 500 })

    expect(reduceAppState(state, { type: 'saveSettings', settings }).settings).toBe(settings)
  })

  test('resets the experiment to an empty log', () => {
    expect(reduceAppState(state, { type: 'resetExperiment' })).toEqual(createEmptyState())
  })

  test('logs a buy at the end', () => {
    const next = buy({ tradeId: 'next' })

    expect(reduceAppState(state, { type: 'logBuy', trade: next }).trades).toEqual([
      held,
      sold,
      next,
    ])
  })

  test('logs a sell on the matching trade only', () => {
    const sale = { sellPrice: 3, sellFee: 1, sellDate: '2026-04-01' }
    const { trades } = reduceAppState(state, { type: 'logSell', tradeId: 'held', sale })

    expect(trades).toEqual([{ ...held, ...sale }, sold])
  })

  test('replaces an edited trade', () => {
    const edited = { ...held, ticker: 'NEW' }

    expect(reduceAppState(state, { type: 'updateTrade', trade: edited }).trades).toEqual([
      edited,
      sold,
    ])
  })

  test('reopens a closed trade', () => {
    const { trades } = reduceAppState(state, { type: 'reopenTrade', tradeId: 'sold' })

    expect(trades.at(1)).toMatchObject({ sellPrice: null, sellFee: 0, sellDate: null })
  })

  test('deletes a trade', () => {
    expect(reduceAppState(state, { type: 'deleteTrade', tradeId: 'held' }).trades).toEqual([sold])
  })

  test('replaces the whole state', () => {
    const replacement = createEmptyState()

    expect(reduceAppState(state, { type: 'replaceState', state: replacement })).toBe(replacement)
  })

  test('never mutates the previous state', () => {
    const before = structuredClone(state)

    reduceAppState(state, { type: 'deleteTrade', tradeId: 'held' })

    expect(state).toEqual(before)
  })
})
