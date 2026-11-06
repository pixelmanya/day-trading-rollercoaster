import type { ClosedTrade, OpenTrade, Settings } from '../lib/types'

interface BuyOptions {
  readonly ticker?: string
  readonly shares?: number
  readonly price?: number
  readonly fee?: number
  readonly date?: string
  readonly tradeId?: string
}

interface SellOptions {
  readonly price: number
  readonly fee?: number
  readonly date?: string
}

const BUY_DEFAULTS = {
  ticker: 'KDK',
  shares: 100,
  price: 1,
  fee: 0,
  date: '2026-01-02',
} as const

/** An open trade with only the numbers a test cares about. */
export function buy(options: BuyOptions = {}): OpenTrade {
  const { ticker, shares, price, fee, date } = { ...BUY_DEFAULTS, ...options }

  return {
    tradeId: options.tradeId ?? `${ticker}-${date}`,
    ticker,
    shares,
    buyPrice: price,
    buyFee: fee,
    buyDate: date,
    sellPrice: null,
    sellFee: 0,
    sellDate: null,
  }
}

/** `trade` closed at `price`. */
export function sell(
  trade: OpenTrade,
  { price, fee = 0, date = '2026-03-01' }: SellOptions,
): ClosedTrade {
  return { ...trade, sellPrice: price, sellFee: fee, sellDate: date }
}

/** Settings with easy numbers: 1000 € start, 25 % tax, 100 € allowance. */
export function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return { start: 1000, taxRate: 25, allowance: 100, ...overrides }
}
