import type { ClosedResult, ClosedTrade, OpenTrade, Settings, Summary, Trade } from './types'

export const isClosed = (t: Trade): t is ClosedTrade => t.sellPrice != null
export const isOpen = (t: Trade): t is OpenTrade => t.sellPrice == null

/** Money tied up in a position: buy value plus buy fee. */
export const positionCost = (t: Pick<Trade, 'shares' | 'buyPrice' | 'buyFee'>): number =>
  t.shares * t.buyPrice + t.buyFee

/** Pre-tax result of selling a position at `sellPrice` with `sellFee`. */
export const pretaxResult = (
  t: Pick<Trade, 'shares' | 'buyPrice' | 'buyFee'>,
  sellPrice: number,
  sellFee: number,
): number => t.shares * (sellPrice - t.buyPrice) - t.buyFee - sellFee

/**
 * Tax owed on a calendar year's cumulative pre-tax result.
 * Losses offset gains within the year; only the part above the allowance is taxed.
 */
export const yearTax = (
  cumulativePretax: number,
  settings: Pick<Settings, 'allowance' | 'taxRate'>,
): number => Math.max(0, cumulativePretax - settings.allowance) * (settings.taxRate / 100)

/**
 * Closed trades in tax order: by sell date, keeping entry order for the same day.
 * Trades without a sell date sort first, as in the original log.
 */
export function sortClosed(trades: readonly Trade[]): ClosedTrade[] {
  return trades.filter(isClosed).sort((a, b) => (a.sellDate ?? '').localeCompare(b.sellDate ?? ''))
}

/**
 * Per-trade results with incremental tax.
 * Each trade's tax is the change in its year's total tax caused by adding it, so a
 * loss after taxed gains in the same year produces a negative tax (a refund).
 *
 * @param today ISO date used as the tax year for a closed trade with no sell date.
 */
export function closedResults(
  trades: readonly Trade[],
  settings: Settings,
  today: string,
): ClosedResult[] {
  const cum = new Map<string, number>()
  const taxed = new Map<string, number>()
  return sortClosed(trades).map((trade) => {
    const cost = positionCost(trade)
    const gross = trade.shares * (trade.sellPrice - trade.buyPrice)
    const fees = trade.buyFee + trade.sellFee
    const pretax = gross - fees
    const year = (trade.sellDate ?? today).slice(0, 4)
    const prevTax = taxed.get(year) ?? 0
    const yearCum = (cum.get(year) ?? 0) + pretax
    const nextTax = yearTax(yearCum, settings)
    cum.set(year, yearCum)
    taxed.set(year, nextTax)
    const tax = nextTax - prevTax
    const net = pretax - tax
    return { trade, cost, gross, fees, pretax, tax, net, ret: net / cost }
  })
}

export function summarize(trades: readonly Trade[], settings: Settings, today: string): Summary {
  const closed = closedResults(trades, settings, today)
  const open = trades.filter(isOpen)
  const sumNet = closed.reduce((a, r) => a + r.net, 0)
  const balance = settings.start + sumNet
  const openCost = open.reduce((a, t) => a + positionCost(t), 0)
  const wins = closed.filter((r) => r.net > 0).length
  const fees = closed.reduce((a, r) => a + r.fees, 0) + open.reduce((a, t) => a + t.buyFee, 0)
  const tax = closed.reduce((a, r) => a + r.tax, 0)
  return { closed, open, balance, sumNet, openCost, cash: balance - openCost, wins, fees, tax }
}

/** Balance after each closed trade, starting with the start budget. */
export function balanceSeries(closed: readonly ClosedResult[], start: number): number[] {
  const pts = [start]
  let b = start
  for (const r of closed) {
    b += r.net
    pts.push(b)
  }
  return pts
}

/**
 * Parse a number typed in German or English notation.
 * "1.234,56" → 1234.56, "0,91" → 0.91, "1095" → 1095, "0.91" → 0.91.
 * Returns NaN for empty or invalid input.
 */
export function parseNumber(s: string | null | undefined): number {
  if (s == null) return NaN
  const t = String(s).trim().replace(/\s/g, '')
  if (!t) return NaN
  const n = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return Number(n)
}
