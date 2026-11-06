import type {
  ClosedResult,
  ClosedTrade,
  OpenPosition,
  OpenTrade,
  Position,
  Sale,
  Settings,
  Summary,
  TaxSettings,
  Tone,
  Trade,
} from './types'

interface TaxLedger {
  /** Cumulative pre-tax result per calendar year, keyed "2026". */
  readonly pretaxByYear: Readonly<Record<string, number>>
  readonly closedResults: readonly ClosedResult[]
}

interface BalanceTrace {
  readonly balance: number
  readonly balances: readonly number[]
}

interface TaxContext {
  readonly settings: TaxSettings
  /** Tax year fallback for a closed trade without a sell date. */
  readonly today: string
}

/** True for trades that have been sold. */
export function isClosed(trade: Trade): trade is ClosedTrade {
  return trade.sellPrice !== null
}

/** True for trades that are still held. */
export function isOpen(trade: Trade): trade is OpenTrade {
  return trade.sellPrice === null
}

/** Money tied up in a position: shares × buy price plus the buy fee, in €. */
export function computePositionCost({ shares, buyPrice, buyFee }: Position): number {
  return shares * buyPrice + buyFee
}

/** Result of selling a position before tax: price difference minus both fees, in €. */
export function computeSellPretax(
  { shares, buyPrice, buyFee }: Position,
  { sellPrice, sellFee }: Pick<Sale, 'sellPrice' | 'sellFee'>,
): number {
  return shares * (sellPrice - buyPrice) - buyFee - sellFee
}

/**
 * Tax owed on a calendar year's cumulative pre-tax result, in €.
 * Losses offset gains within the year; only the part above the allowance is taxed.
 */
export function computeYearTax(pretaxTotal: number, { allowance, taxRate }: TaxSettings): number {
  return Math.max(0, pretaxTotal - allowance) * (taxRate / 100)
}

/** Whether an amount reads as a gain (0 included) or a loss. */
export function getTone(amount: number): Tone {
  return amount >= 0 ? 'gain' : 'loss'
}

/** Sum of `select(entry)` over all entries. */
export function sumBy<Entry>(entries: readonly Entry[], select: (entry: Entry) => number): number {
  return entries.reduce((total, entry) => total + select(entry), 0)
}

/** Closed trades in tax order: by sell date, keeping entry order within the same day. */
export function sortClosedTrades(trades: readonly Trade[]): readonly ClosedTrade[] {
  return trades
    .filter((trade) => isClosed(trade))
    .toSorted(({ sellDate: leftDate }, { sellDate: rightDate }) =>
      (leftDate ?? '').localeCompare(rightDate ?? ''),
    )
}

/**
 * Results per closed trade, with incremental tax: each trade's tax is the change in its
 * year's total tax caused by adding it, so a loss after taxed gains produces a refund.
 *
 * @param today ISO date used as the tax year of a closed trade without a sell date.
 */
export function computeClosedResults(
  trades: readonly Trade[],
  settings: TaxSettings,
  today: string,
): readonly ClosedResult[] {
  const emptyLedger: TaxLedger = { pretaxByYear: {}, closedResults: [] }

  return sortClosedTrades(trades).reduce(
    (ledger, trade) => addClosedTrade(ledger, trade, { settings, today }),
    emptyLedger,
  ).closedResults
}

/** Running balance: the start budget, then the balance after each closed trade. */
export function computeBalanceSeries(
  closedResults: readonly ClosedResult[],
  start: number,
): readonly number[] {
  const startTrace: BalanceTrace = { balance: start, balances: [start] }

  return closedResults.reduce(
    ({ balance, balances }, { net }) => ({
      balance: balance + net,
      balances: [...balances, balance + net],
    }),
    startTrace,
  ).balances
}

/** Everything the log shows, derived from trades and settings. */
export function summarize(trades: readonly Trade[], settings: Settings, today: string): Summary {
  const closedResults = computeClosedResults(trades, settings, today)
  const openPositions = collectOpenPositions(trades)
  const sumNet = sumBy(closedResults, ({ net }) => net)
  const balance = settings.start + sumNet
  const openCost = sumBy(openPositions, ({ cost }) => cost)
  const wins = closedResults.filter(({ net }) => net > 0).length
  const closedCount = closedResults.length
  const hasClosedTrades = closedCount > 0

  return {
    closedResults,
    openPositions,
    balance,
    change: balance - settings.start,
    changeRatio: (balance - settings.start) / settings.start,
    sumNet,
    openCost,
    cash: balance - openCost,
    wins,
    winRate: hasClosedTrades ? wins / closedCount : null,
    averageNet: hasClosedTrades ? sumNet / closedCount : null,
    fees:
      sumBy(closedResults, ({ fees }) => fees) + sumBy(openPositions, ({ trade }) => trade.buyFee),
    tax: sumBy(closedResults, ({ tax }) => tax),
  }
}

function collectOpenPositions(trades: readonly Trade[]): readonly OpenPosition[] {
  return trades
    .filter((trade) => isOpen(trade))
    .map((trade) => ({ trade, cost: computePositionCost(trade) }))
}

function addClosedTrade(
  { pretaxByYear, closedResults }: TaxLedger,
  trade: ClosedTrade,
  { settings, today }: TaxContext,
): TaxLedger {
  const cost = computePositionCost(trade)
  const gross = trade.shares * (trade.sellPrice - trade.buyPrice)
  const fees = trade.buyFee + trade.sellFee
  const pretax = gross - fees
  const year = (trade.sellDate ?? today).slice(0, 4)
  const previousTotal = pretaxByYear[year] ?? 0
  const yearTotal = previousTotal + pretax
  const tax = computeYearTax(yearTotal, settings) - computeYearTax(previousTotal, settings)
  const net = pretax - tax

  return {
    pretaxByYear: { ...pretaxByYear, [year]: yearTotal },
    closedResults: [
      ...closedResults,
      { trade, cost, gross, fees, pretax, tax, net, returnRatio: net / cost },
    ],
  }
}
