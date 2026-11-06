import { describe, expect, test } from 'vitest'

import { buildSettings, buy, sell } from '../test/builders'
import {
  computeSellPreview,
  createBuyFields,
  createLogBuyAction,
  createLogSellAction,
  createSaveSettingsAction,
  createSellFields,
  createSettingsFields,
  createUpdateTradeAction,
} from './forms'
import type { BuyFields, SellFields } from './forms'

const TODAY = '2026-11-06'
const context = { tradeId: 'new', today: TODAY }

const buyFields: BuyFields = {
  ticker: ' kdk ',
  shares: '1095',
  buyPrice: '0,91258',
  buyFee: '',
  buyDate: '2026-11-05',
}

const sellFields: SellFields = { sellPrice: '1,05', sellFee: '1', sellDate: '' }

describe('createSettingsFields', () => {
  test('prefills German decimals', () => {
    expect(createSettingsFields(buildSettings({ taxRate: 26.375 }))).toEqual({
      start: '1000,00',
      taxRate: '26,375',
      allowance: '100,00',
    })
  })
})

describe('createBuyFields', () => {
  test('starts a new buy empty, with no fee and dated today', () => {
    expect(createBuyFields(null, TODAY)).toEqual({
      ticker: '',
      shares: '',
      buyPrice: '',
      buyFee: '0',
      buyDate: TODAY,
    })
  })

  test('prefills an existing trade', () => {
    expect(createBuyFields(buy({ shares: 1095, price: 0.912_58, fee: 1 }), TODAY)).toEqual({
      ticker: 'KDK',
      shares: '1095',
      buyPrice: '0,9126',
      buyFee: '1,00',
      buyDate: '2026-01-02',
    })
  })
})

describe('createSellFields', () => {
  test('starts empty and dated today for new or open trades', () => {
    const empty = { sellPrice: '', sellFee: '0', sellDate: TODAY }

    expect(createSellFields(null, TODAY)).toEqual(empty)
    expect(createSellFields(buy(), TODAY)).toEqual(empty)
  })

  test('prefills a closed trade, dating it today if it has no sell date', () => {
    const closed = sell(buy(), { price: 1.05, fee: 1, date: '2026-03-01' })

    expect(createSellFields(closed, TODAY)).toEqual({
      sellPrice: '1,0500',
      sellFee: '1,00',
      sellDate: '2026-03-01',
    })

    expect(createSellFields({ ...closed, sellDate: null }, TODAY).sellDate).toBe(TODAY)
  })
})

describe('createSaveSettingsAction', () => {
  const fields = { start: '1000', taxRate: '26,375', allowance: '801' }

  test('creates a saveSettings action', () => {
    expect(createSaveSettingsAction(fields)).toEqual({
      isSuccess: true,
      output: { type: 'saveSettings', settings: { start: 1000, taxRate: 26.375, allowance: 801 } },
    })
  })

  test.each([
    [{ start: '0' }, 'Enter a start budget above 0.'],
    [{ taxRate: '61' }, 'Enter a tax rate between 0 and 60.'],
    [{ taxRate: '' }, 'Enter a tax rate between 0 and 60.'],
    [{ allowance: '-1' }, 'Enter an allowance of 0 or more.'],
  ])('rejects %o', (changes, message) => {
    expect(createSaveSettingsAction({ ...fields, ...changes })).toEqual({
      isSuccess: false,
      error: message,
    })
  })
})

describe('createLogBuyAction', () => {
  test('creates an open trade with an uppercase ticker and no fee', () => {
    const outcome = createLogBuyAction(buyFields, context)

    expect(outcome).toEqual({
      isSuccess: true,
      output: {
        type: 'logBuy',
        trade: {
          tradeId: 'new',
          ticker: 'KDK',
          shares: 1095,
          buyPrice: 0.912_58,
          buyFee: 0,
          buyDate: '2026-11-05',
          sellPrice: null,
          sellFee: 0,
          sellDate: null,
        },
      },
    })
  })

  test('dates a buy without a date today', () => {
    const outcome = createLogBuyAction({ ...buyFields, buyDate: '' }, context)

    expect(outcome.isSuccess && outcome.output).toMatchObject({ trade: { buyDate: TODAY } })
  })

  test.each([
    [{ ticker: '  ' }, 'Enter a ticker or name.'],
    [{ shares: '0' }, 'Enter how many shares you bought.'],
    [{ buyPrice: 'x' }, 'Enter the price per share you paid.'],
    [{ buyFee: '-1' }, 'Fees can’t be negative.'],
  ])('rejects %o', (changes, message) => {
    expect(createLogBuyAction({ ...buyFields, ...changes }, context)).toEqual({
      isSuccess: false,
      error: message,
    })
  })
})

describe('createLogSellAction', () => {
  test('closes the trade, dated today when no date is given', () => {
    expect(createLogSellAction('held', sellFields, TODAY)).toEqual({
      isSuccess: true,
      output: {
        type: 'logSell',
        tradeId: 'held',
        sale: { sellPrice: 1.05, sellFee: 1, sellDate: TODAY },
      },
    })
  })

  test('asks for the price and rejects negative fees', () => {
    expect(createLogSellAction('held', { ...sellFields, sellPrice: '' }, TODAY)).toEqual({
      isSuccess: false,
      error: 'Enter the price you sold at.',
    })

    expect(createLogSellAction('held', { ...sellFields, sellFee: '-1' }, TODAY)).toEqual({
      isSuccess: false,
      error: 'Fees can’t be negative.',
    })
  })
})

describe('createUpdateTradeAction', () => {
  const trade = buy({ tradeId: 'edit' })

  test('updates an open trade from the buy fields', () => {
    const outcome = createUpdateTradeAction(trade, { buyFields, sellFields: null }, TODAY)

    expect(outcome.isSuccess && outcome.output).toMatchObject({
      type: 'updateTrade',
      trade: { tradeId: 'edit', ticker: 'KDK', sellPrice: null, sellFee: 0, sellDate: null },
    })
  })

  test('updates both sides of a closed trade', () => {
    const outcome = createUpdateTradeAction(trade, { buyFields, sellFields }, TODAY)

    expect(outcome.isSuccess && outcome.output).toMatchObject({
      trade: { sellPrice: 1.05, sellFee: 1, sellDate: TODAY },
    })
  })

  test('reports the first problem on either side', () => {
    const badBuy = { buyFields: { ...buyFields, shares: '' }, sellFields }
    const badSell = { buyFields, sellFields: { ...sellFields, sellPrice: '0' } }

    expect(createUpdateTradeAction(trade, badBuy, TODAY)).toEqual({
      isSuccess: false,
      error: 'Enter how many shares you bought.',
    })

    expect(createUpdateTradeAction(trade, badSell, TODAY)).toEqual({
      isSuccess: false,
      error: 'Enter the sell price.',
    })
  })
})

describe('computeSellPreview', () => {
  const position = buy({ shares: 100, price: 1, fee: 1 })

  test('waits for a price', () => {
    expect(computeSellPreview(position, { sellPrice: '', sellFee: '1' })).toBeNull()
  })

  test('shows the pre-tax result and its share of the cost', () => {
    // 100 × (1.5 − 1) − 1 − 1 = 48 on a cost of 101
    const preview = computeSellPreview(position, { sellPrice: '1,5', sellFee: '1' })

    expect(preview?.pretax).toBeCloseTo(48, 6)
    expect(preview?.ratio).toBeCloseTo(48 / 101, 6)
  })
})
