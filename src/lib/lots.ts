import { computePricePerShare } from './calc'
import { createAppError } from './errors'
import type { AppError } from './errors'
import { formatShortDate } from './format'
import { fail, succeed } from './result'
import type { Result } from './result'
import type { BrokerTransaction, ClosedTrade, OpenTrade, Trade } from './types'

/** Share counts closer than this are equal; brokers report fractional shares. */
const SHARE_TOLERANCE = 1e-9

/** Shares still held from one buy, at that buy's price per share (fees included). */
interface Lot {
  readonly purchase: BrokerTransaction
  readonly shares: number
  readonly price: number
}

/** What is left of a sale to match against lots. */
interface SaleRemainder {
  readonly sale: BrokerTransaction
  readonly shares: number
  readonly price: number
}

interface LotBook {
  readonly lotsByIsin: Readonly<Record<string, readonly Lot[]>>
  readonly closedTrades: readonly ClosedTrade[]
  readonly error: AppError | null
}

interface SaleMatch {
  readonly lots: readonly Lot[]
  readonly trades: readonly ClosedTrade[]
}

const emptyBook: LotBook = { lotsByIsin: {}, closedTrades: [], error: null }

/**
 * Trades from broker transactions, first in, first out (as German tax counts them): each sale
 * closes the oldest shares of its security first, splitting buys and sales where they don't
 * line up. Shares never sold become open trades.
 */
export function pairTransactions(
  transactions: readonly BrokerTransaction[],
): Result<readonly Trade[], AppError> {
  const book = transactions
    .toSorted(compareExecution)
    .reduce((current, transaction) => applyTransaction(current, transaction), emptyBook)

  if (book.error !== null) {
    return fail(book.error)
  }

  const openTrades = Object.values(book.lotsByIsin)
    .flat()
    .map((lot) => toOpenTrade(lot))

  return succeed([...book.closedTrades, ...openTrades])
}

function compareExecution(
  { executedAt: left }: BrokerTransaction,
  { executedAt: right }: BrokerTransaction,
): number {
  return left.localeCompare(right)
}

function applyTransaction(book: LotBook, transaction: BrokerTransaction): LotBook {
  if (book.error !== null) {
    return book
  }

  return transaction.side === 'buy' ? addLot(book, transaction) : closeLots(book, transaction)
}

function addLot(book: LotBook, purchase: BrokerTransaction): LotBook {
  const { isin, shares, amount } = purchase
  const lot: Lot = { purchase, shares, price: computePricePerShare(amount, shares) }

  return {
    ...book,
    lotsByIsin: { ...book.lotsByIsin, [isin]: [...(book.lotsByIsin[isin] ?? []), lot] },
  }
}

function closeLots(book: LotBook, sale: BrokerTransaction): LotBook {
  const { isin, shares, amount } = sale
  const remainder = { sale, shares, price: computePricePerShare(amount, shares) }
  const match = matchSale(book.lotsByIsin[isin] ?? [], remainder)

  if (match === null) {
    return { ...book, error: createOversoldError(sale) }
  }

  return {
    lotsByIsin: { ...book.lotsByIsin, [isin]: match.lots },
    closedTrades: [...book.closedTrades, ...match.trades],
    error: null,
  }
}

/** Close the oldest lots against what is left of a sale; null if the lots run out first. */
function matchSale(lots: readonly Lot[], remainder: SaleRemainder): SaleMatch | null {
  const [oldest, ...newer] = lots

  if (oldest === undefined) {
    return null
  }

  const shares = Math.min(oldest.shares, remainder.shares)
  const trade = createClosedTrade(oldest, remainder, shares)
  const sharesLeft = remainder.shares - shares

  if (sharesLeft <= SHARE_TOLERANCE) {
    return { lots: [...keepUnsold(oldest, shares), ...newer], trades: [trade] }
  }

  const rest = matchSale(newer, { ...remainder, shares: sharesLeft })

  return rest === null ? null : { lots: rest.lots, trades: [trade, ...rest.trades] }
}

/** The part of a lot a sale didn't take, if any. */
function keepUnsold(lot: Lot, soldShares: number): readonly Lot[] {
  const shares = lot.shares - soldShares

  return shares > SHARE_TOLERANCE ? [{ ...lot, shares }] : []
}

function createClosedTrade(lot: Lot, { sale, price }: SaleRemainder, shares: number): ClosedTrade {
  const { purchase } = lot

  return {
    ...toOpenTrade({ ...lot, shares }),
    tradeId: `${purchase.transactionId}~${sale.transactionId}`,
    sellPrice: price,
    sellDate: sale.date,
  }
}

/** Fees are part of the prices, so trades carry no separate fees. */
function toOpenTrade({ purchase, shares, price }: Lot): OpenTrade {
  return {
    tradeId: purchase.transactionId,
    ticker: purchase.name,
    shares,
    buyPrice: price,
    buyFee: 0,
    buyDate: purchase.date,
    sellPrice: null,
    sellFee: 0,
    sellDate: null,
  }
}

function createOversoldError({ name, date }: BrokerTransaction): AppError {
  return createAppError(
    'importFailed',
    `${name} was sold on ${formatShortDate(date)} without enough earlier buys. Is the export complete?`,
  )
}
