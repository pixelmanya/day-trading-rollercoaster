import type { AppState, Settings, Trade } from './types'

export const DEFAULT_SETTINGS: Settings = { start: 1000, taxRate: 26.375, allowance: 1000 }

export const emptyState = (): AppState => ({ settings: { ...DEFAULT_SETTINGS }, trades: [] })

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStateError'
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const DATE = /^\d{4}-\d{2}-\d{2}$/
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v)

function settingsFrom(v: unknown): Settings {
  if (!isObj(v)) throw new InvalidStateError('Settings are missing.')
  const { start, taxRate, allowance } = v
  if (!isNum(start) || start <= 0)
    throw new InvalidStateError('Start budget must be a number above 0.')
  if (!isNum(taxRate) || taxRate < 0 || taxRate > 60)
    throw new InvalidStateError('Tax rate must be between 0 and 60.')
  if (!isNum(allowance) || allowance < 0)
    throw new InvalidStateError('Allowance must be 0 or more.')
  return { start, taxRate, allowance }
}

function tradeFrom(v: unknown, i: number): Trade {
  const at = `Trade ${i + 1}`
  if (!isObj(v)) throw new InvalidStateError(`${at} is not an object.`)
  const { id, ticker, shares, buyPrice, buyFee, buyDate, sellPrice, sellFee, sellDate } = v
  if (typeof id !== 'string' || !id) throw new InvalidStateError(`${at} has no id.`)
  if (typeof ticker !== 'string' || !ticker.trim())
    throw new InvalidStateError(`${at} has no ticker.`)
  if (!isNum(shares) || shares <= 0) throw new InvalidStateError(`${at}: shares must be above 0.`)
  if (!isNum(buyPrice) || buyPrice <= 0)
    throw new InvalidStateError(`${at}: buy price must be above 0.`)
  if (!isNum(buyFee) || buyFee < 0) throw new InvalidStateError(`${at}: buy fee can’t be negative.`)
  if (!isDate(buyDate)) throw new InvalidStateError(`${at}: buy date must be YYYY-MM-DD.`)
  const closed = sellPrice != null
  if (closed && (!isNum(sellPrice) || sellPrice <= 0))
    throw new InvalidStateError(`${at}: sell price must be above 0.`)
  const fee = sellFee ?? 0
  if (!isNum(fee) || fee < 0) throw new InvalidStateError(`${at}: sell fee can’t be negative.`)
  if (sellDate != null && !isDate(sellDate))
    throw new InvalidStateError(`${at}: sell date must be YYYY-MM-DD.`)
  return {
    id,
    ticker,
    shares,
    buyPrice,
    buyFee,
    buyDate,
    sellPrice: closed ? (sellPrice as number) : null,
    sellFee: closed ? fee : 0,
    sellDate: closed ? ((sellDate as string | null | undefined) ?? null) : null,
  }
}

/** Validate untrusted data (from storage or an import) into an AppState. Throws InvalidStateError. */
export function parseState(v: unknown): AppState {
  if (!isObj(v)) throw new InvalidStateError('Expected an object with settings and trades.')
  if (!Array.isArray(v.trades)) throw new InvalidStateError('Trades are missing.')
  const trades = v.trades.map(tradeFrom)
  const ids = new Set<string>()
  for (const t of trades) {
    if (ids.has(t.id)) throw new InvalidStateError(`Trade id “${t.id}” appears twice.`)
    ids.add(t.id)
  }
  return { settings: settingsFrom(v.settings), trades }
}
