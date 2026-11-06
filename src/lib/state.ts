import { createAppError } from './errors'
import type { AppError } from './errors'
import { chainSuccess, fail, mapSuccess, succeed } from './result'
import type { Result } from './result'
import type { AppState, Settings, Trade } from './types'

type UnknownRecord = Readonly<Record<string, unknown>>

/** Settings for a new experiment: €1,000 budget, 26.375 % tax, €1,000 allowance. */
export const DEFAULT_SETTINGS = {
  start: 1000,
  taxRate: 26.375,
  allowance: 1000,
} as const satisfies Settings

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** A new, empty experiment with default settings. */
export function createEmptyState(): AppState {
  return { settings: DEFAULT_SETTINGS, trades: [] }
}

/** Validate untrusted data (stored or imported) into an AppState. */
export function parseState(input: unknown): Result<AppState, AppError> {
  if (!isRecord(input)) {
    return failInvalid('Expected an object with settings and trades.')
  }

  const { settings, trades } = input

  if (!Array.isArray(trades)) {
    return failInvalid('Trades are missing.')
  }

  const parsedSettings = parseSettings(settings)

  if (!parsedSettings.isSuccess) {
    return failInvalid(parsedSettings.error)
  }

  const parsedTrades = chainSuccess(parseTrades(trades), (tradeList) => findDuplicate(tradeList))

  if (!parsedTrades.isSuccess) {
    return failInvalid(parsedTrades.error)
  }

  return succeed({ settings: parsedSettings.output, trades: parsedTrades.output })
}

function failInvalid(message: string): Result<never, AppError> {
  return fail(createAppError('invalidState', message))
}

function isRecord(input: unknown): input is UnknownRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

function isFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input)
}

function isPositiveNumber(input: unknown): input is number {
  return isFiniteNumber(input) && input > 0
}

function isNonNegativeNumber(input: unknown): input is number {
  return isFiniteNumber(input) && input >= 0
}

function isNonBlankString(input: unknown): input is string {
  return typeof input === 'string' && input.trim() !== ''
}

function isIsoDate(input: unknown): input is string {
  return typeof input === 'string' && ISO_DATE.test(input)
}

function parseSettings(input: unknown): Result<Settings, string> {
  if (!isRecord(input)) {
    return fail('Settings are missing.')
  }

  const { start, taxRate, allowance } = input

  if (!isPositiveNumber(start)) {
    return fail('Start budget must be a number above 0.')
  }

  if (!isNonNegativeNumber(taxRate) || taxRate > 60) {
    return fail('Tax rate must be between 0 and 60.')
  }

  return isNonNegativeNumber(allowance)
    ? succeed({ start, taxRate, allowance })
    : fail('Allowance must be 0 or more.')
}

function parseTrades(entries: readonly unknown[]): Result<readonly Trade[], string> {
  const noTrades: Result<readonly Trade[], string> = succeed([])

  return entries.reduce<Result<readonly Trade[], string>>(
    (collected, entry, index) =>
      chainSuccess(collected, (tradeList) =>
        mapSuccess(parseTrade(entry, index), (trade) => [...tradeList, trade]),
      ),
    noTrades,
  )
}

function parseTrade(entry: unknown, index: number): Result<Trade, string> {
  const label = `Trade ${index + 1}`

  if (!isRecord(entry)) {
    return fail(`${label} is not an object.`)
  }

  const identity = parseIdentity(entry)
  const purchase = parsePurchase(entry)
  const sale = parseSale(entry)
  const firstFailure = [identity, purchase, sale].find(({ isSuccess }) => !isSuccess)

  if (firstFailure && !firstFailure.isSuccess) {
    return fail(`${label}: ${firstFailure.error}`)
  }

  return chainSuccess(identity, (identityPart) =>
    chainSuccess(purchase, (purchasePart) =>
      mapSuccess(sale, (salePart) => ({ ...identityPart, ...purchasePart, ...salePart })),
    ),
  )
}

function parseIdentity({
  tradeId,
  ticker,
}: UnknownRecord): Result<Pick<Trade, 'tradeId' | 'ticker'>, string> {
  if (!isNonBlankString(tradeId)) {
    return fail('id is missing.')
  }

  return isNonBlankString(ticker) ? succeed({ tradeId, ticker }) : fail('ticker is missing.')
}

function parsePurchase({
  shares,
  buyPrice,
  buyFee,
  buyDate,
}: UnknownRecord): Result<Pick<Trade, 'shares' | 'buyPrice' | 'buyFee' | 'buyDate'>, string> {
  if (!isPositiveNumber(shares)) {
    return fail('shares must be above 0.')
  }

  if (!isPositiveNumber(buyPrice)) {
    return fail('buy price must be above 0.')
  }

  if (!isNonNegativeNumber(buyFee)) {
    return fail('buy fee can’t be negative.')
  }

  return isIsoDate(buyDate)
    ? succeed({ shares, buyPrice, buyFee, buyDate })
    : fail('buy date must be YYYY-MM-DD.')
}

function parseSale({
  sellPrice,
  sellFee,
  sellDate,
}: UnknownRecord): Result<Pick<Trade, 'sellPrice' | 'sellFee' | 'sellDate'>, string> {
  if (sellPrice === null || sellPrice === undefined) {
    return succeed({ sellPrice: null, sellFee: 0, sellDate: null })
  }

  if (!isPositiveNumber(sellPrice)) {
    return fail('sell price must be above 0.')
  }

  if (!isNonNegativeNumber(sellFee)) {
    return fail('sell fee can’t be negative.')
  }

  return isIsoDate(sellDate)
    ? succeed({ sellPrice, sellFee, sellDate })
    : fail('sell date must be YYYY-MM-DD.')
}

function findDuplicate(trades: readonly Trade[]): Result<readonly Trade[], string> {
  const duplicate = trades.find(
    ({ tradeId }, index) =>
      trades.findIndex(({ tradeId: otherId }) => otherId === tradeId) !== index,
  )

  return duplicate ? fail(`Trade id “${duplicate.tradeId}” appears twice.`) : succeed(trades)
}
