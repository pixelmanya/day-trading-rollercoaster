import { computePositionCost, computeSellPretax, isClosed } from './calc'
import { formatInputNumber, parseFee, parseNumber } from './numberInput'
import type { Action } from './reducer'
import { fail, mapSuccess, succeed } from './result'
import type { Result } from './result'
import type { Position, Sale, Settings, Trade } from './types'

/** The settings form, as typed. */
export interface SettingsFields {
  readonly start: string
  readonly taxRate: string
  readonly allowance: string
}

/** The buy side of the trade form, as typed. */
export interface BuyFields {
  readonly ticker: string
  readonly shares: string
  readonly buyPrice: string
  readonly buyFee: string
  readonly buyDate: string
}

/** The sell side of the trade form, as typed. */
export interface SellFields {
  readonly sellPrice: string
  readonly sellFee: string
  readonly sellDate: string
}

/** Identity and date for a new trade, created at the edge (random id, clock). */
export interface NewTradeContext {
  readonly tradeId: string
  readonly today: string
}

/** The live preview under "Log sell": result before tax, in € and relative to cost. */
export interface SellPreview {
  readonly pretax: number
  readonly ratio: number
}

type Purchase = Pick<Trade, 'ticker' | 'shares' | 'buyPrice' | 'buyFee' | 'buyDate'>

const MAX_TAX_RATE = 60
const NEGATIVE_FEE_MESSAGE = 'Fees can’t be negative.'

/** Settings fields prefilled from the current settings. */
export function createSettingsFields({ start, taxRate, allowance }: Settings): SettingsFields {
  return {
    start: formatInputNumber(start, 2),
    taxRate: formatInputNumber(taxRate, 3),
    allowance: formatInputNumber(allowance, 2),
  }
}

/** Buy fields prefilled from `trade`, or empty for a new buy dated today. */
export function createBuyFields(trade: Trade | null, today: string): BuyFields {
  if (trade === null) {
    return { ticker: '', shares: '', buyPrice: '', buyFee: '0', buyDate: today }
  }

  return {
    ticker: trade.ticker,
    shares: formatInputNumber(trade.shares, 0),
    buyPrice: formatInputNumber(trade.buyPrice, 4),
    buyFee: formatInputNumber(trade.buyFee, 2),
    buyDate: trade.buyDate,
  }
}

/** Sell fields prefilled from a closed `trade`, or empty and dated today otherwise. */
export function createSellFields(trade: Trade | null, today: string): SellFields {
  if (trade === null || !isClosed(trade)) {
    return { sellPrice: '', sellFee: '0', sellDate: today }
  }

  return {
    sellPrice: formatInputNumber(trade.sellPrice, 4),
    sellFee: formatInputNumber(trade.sellFee, 2),
    sellDate: trade.sellDate ?? today,
  }
}

/** Validate the settings form into a saveSettings action, or the first problem. */
export function createSaveSettingsAction({
  start: startText,
  taxRate: taxRateText,
  allowance: allowanceText,
}: SettingsFields): Result<Action, string> {
  const start = parseNumber(startText)
  const taxRate = parseNumber(taxRateText)
  const allowance = parseNumber(allowanceText)

  if (!(start > 0)) {
    return fail('Enter a start budget above 0.')
  }

  if (!(taxRate >= 0 && taxRate <= MAX_TAX_RATE)) {
    return fail('Enter a tax rate between 0 and 60.')
  }

  return allowance >= 0
    ? succeed({ type: 'saveSettings', settings: { start, taxRate, allowance } })
    : fail('Enter an allowance of 0 or more.')
}

/** Validate the buy form into a logBuy action for a new open trade. */
export function createLogBuyAction(
  fields: BuyFields,
  { tradeId, today }: NewTradeContext,
): Result<Action, string> {
  return mapSuccess(validatePurchase(fields, today), (purchase) => ({
    type: 'logBuy',
    trade: { tradeId, ...purchase, sellPrice: null, sellFee: 0, sellDate: null },
  }))
}

/** Validate the sell form into a logSell action closing the trade with `tradeId`. */
export function createLogSellAction(
  tradeId: string,
  fields: SellFields,
  today: string,
): Result<Action, string> {
  return mapSuccess(validateSale(fields, today, 'Enter the price you sold at.'), (sale) => ({
    type: 'logSell',
    tradeId,
    sale,
  }))
}

/**
 * Validate the edit form into an updateTrade action. `sellFields` is null for an open trade,
 * whose sell side isn't shown.
 */
export function createUpdateTradeAction(
  { tradeId }: Pick<Trade, 'tradeId'>,
  {
    buyFields,
    sellFields,
  }: { readonly buyFields: BuyFields; readonly sellFields: SellFields | null },
  today: string,
): Result<Action, string> {
  const purchase = validatePurchase(buyFields, today)

  if (!purchase.isSuccess) {
    return purchase
  }

  const sale =
    sellFields === null ? succeed(null) : validateSale(sellFields, today, 'Enter the sell price.')

  return mapSuccess(sale, (closing) => ({
    type: 'updateTrade',
    trade: { tradeId, ...purchase.output, ...toSellSide(closing) },
  }))
}

/** Preview of selling `position` at the typed price and fee, or null until a price is typed. */
export function computeSellPreview(
  position: Position,
  { sellPrice, sellFee }: Pick<SellFields, 'sellPrice' | 'sellFee'>,
): SellPreview | null {
  const price = parseNumber(sellPrice)

  if (Number.isNaN(price)) {
    return null
  }

  const pretax = computeSellPretax(position, { sellPrice: price, sellFee: parseFee(sellFee) })

  return { pretax, ratio: pretax / computePositionCost(position) }
}

function validatePurchase(
  {
    ticker: tickerText,
    shares: sharesText,
    buyPrice: buyPriceText,
    buyFee: buyFeeText,
    buyDate,
  }: BuyFields,
  today: string,
): Result<Purchase, string> {
  const ticker = tickerText.trim().toUpperCase()
  const shares = parseNumber(sharesText)
  const buyPrice = parseNumber(buyPriceText)
  const buyFee = parseFee(buyFeeText)

  if (ticker === '') {
    return fail('Enter a ticker or name.')
  }

  if (!(shares > 0)) {
    return fail('Enter how many shares you bought.')
  }

  if (!(buyPrice > 0)) {
    return fail('Enter the price per share you paid.')
  }

  return buyFee >= 0
    ? succeed({ ticker, shares, buyPrice, buyFee, buyDate: buyDate || today })
    : fail(NEGATIVE_FEE_MESSAGE)
}

function validateSale(
  { sellPrice: sellPriceText, sellFee: sellFeeText, sellDate }: SellFields,
  today: string,
  missingPriceMessage: string,
): Result<Sale, string> {
  const sellPrice = parseNumber(sellPriceText)
  const sellFee = parseFee(sellFeeText)

  if (!(sellPrice > 0)) {
    return fail(missingPriceMessage)
  }

  return sellFee >= 0
    ? succeed({ sellPrice, sellFee, sellDate: sellDate || today })
    : fail(NEGATIVE_FEE_MESSAGE)
}

function toSellSide(sale: Sale | null): Pick<Trade, 'sellPrice' | 'sellFee' | 'sellDate'> {
  return sale ?? { sellPrice: null, sellFee: 0, sellDate: null }
}
