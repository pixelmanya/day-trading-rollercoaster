import { addDays } from './dates'
import { DEFAULT_SETTINGS } from './state'
import type { AppState, Trade } from './types'

/** Tickers and a typical price per share in €, for believable demo trades. */
const DEMO_PRICES = {
  KDK: 0.92,
  NVDA: 180,
  SAP: 235,
  RHM: 610,
  ASML: 690,
  SIE: 205,
  TSLA: 240,
  ADS: 210,
} as const

type DemoTicker = keyof typeof DEMO_PRICES

/** The seed of the demo log offered in Settings. */
export const DEMO_SEED = 2026

const demoTickers = Object.keys(DEMO_PRICES) as readonly DemoTicker[]
const CLOSED_TRADES = 60
const OPEN_TRADES = 2
const SAME_DAY_TRADES = 3
const DAYS_BACK = 380
const BUDGET_PER_TRADE = 500
/** Open positions stay small, so the demo keeps some cash free. */
const OPEN_BUDGET = 250
const FEE = 1
/** Center of the draw that sets returns; below 0.5 gives a slight upward drift. */
const RETURN_CENTER = 0.43
const RETURN_SPREAD = 0.16

/** The random numbers one demo trade is made of, each in [0, 1). */
interface TradeDraws {
  readonly tickerDraw: number
  readonly dayDraw: number
  readonly holdDraw: number
  readonly priceDraw: number
  readonly returnDraw: number
  readonly sizeDraw: number
}

interface DemoContext {
  readonly today: string
  readonly index: number
}

interface TradeTrace {
  readonly trades: readonly Trade[]
  readonly seed: number
}

/**
 * A realistic sample log to explore the app: 60 closed trades over the past year (the last
 * few closed today) and two open positions. The same seed always gives the same log.
 */
export function createDemoState(today: string, seed: number): AppState {
  const start: TradeTrace = { trades: [], seed }
  const indices = [...Array.from({ length: CLOSED_TRADES + OPEN_TRADES }).keys()]

  const { trades } = indices.reduce(({ trades: made, seed: current }, index) => {
    const { draws, seed: next } = drawTradeShape(current)
    const context = { today, index }

    const trade =
      index < CLOSED_TRADES ? createClosedTrade(draws, context) : createOpenTrade(draws, context)

    return { trades: [...made, trade], seed: next }
  }, start)

  return {
    settings: DEFAULT_SETTINGS,
    trades: trades.toSorted(({ buyDate: left }, { buyDate: right }) => left.localeCompare(right)),
  }
}

/** The next number in [0, 1) and the next seed (mulberry32). */
export function drawRandomNumber(seed: number): readonly [number, number] {
  const state = Math.trunc(seed + 0x6d_2b_79_f5) % 2 ** 32
  const mixed = Math.imul(state ^ (state >>> 15), state | 1)
  const scrambled = mixed ^ (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61))

  return [((scrambled ^ (scrambled >>> 14)) >>> 0) / 2 ** 32, state]
}

function drawTradeShape(seed: number): { readonly draws: TradeDraws; readonly seed: number } {
  const [tickerDraw, afterTicker] = drawRandomNumber(seed)
  const [dayDraw, afterDay] = drawRandomNumber(afterTicker)
  const [holdDraw, afterHold] = drawRandomNumber(afterDay)
  const [priceDraw, afterPrice] = drawRandomNumber(afterHold)
  const [returnDraw, afterReturn] = drawRandomNumber(afterPrice)
  const [sizeDraw, afterSize] = drawRandomNumber(afterReturn)

  return {
    draws: { tickerDraw, dayDraw, holdDraw, priceDraw, returnDraw, sizeDraw },
    seed: afterSize,
  }
}

function pickTicker(draw: number): DemoTicker {
  const target = Math.floor(draw * demoTickers.length)

  return demoTickers.reduce((chosen, ticker, index) => (index === target ? ticker : chosen), 'KDK')
}

function createClosedTrade(
  { tickerDraw, holdDraw, dayDraw, priceDraw, returnDraw, sizeDraw }: TradeDraws,
  { today, index }: DemoContext,
): Trade {
  const ticker = pickTicker(tickerDraw)
  const isToday = index >= CLOSED_TRADES - SAME_DAY_TRADES
  const holdDays = isToday ? 0 : Math.floor(holdDraw * 4)
  const sellDate = isToday ? today : addDays(today, -Math.floor(1 + dayDraw * DAYS_BACK))
  const buyPrice = roundPrice(DEMO_PRICES[ticker] * (0.8 + priceDraw * 0.4))
  const sellPrice = roundPrice(buyPrice * (1 + (returnDraw - RETURN_CENTER) * RETURN_SPREAD))
  const sizeFactor = 0.4 + sizeDraw * 1.2

  return {
    tradeId: `demo-${index}`,
    ticker,
    shares: Math.max(1, Math.round((BUDGET_PER_TRADE / buyPrice) * sizeFactor)),
    buyPrice,
    buyFee: FEE,
    buyDate: addDays(sellDate, -holdDays),
    sellPrice,
    sellFee: FEE,
    sellDate,
  }
}

function createOpenTrade(
  { tickerDraw, priceDraw }: TradeDraws,
  { today, index }: DemoContext,
): Trade {
  const ticker = pickTicker(tickerDraw)
  const buyPrice = roundPrice(DEMO_PRICES[ticker] * (0.8 + priceDraw * 0.4))

  return {
    tradeId: `demo-${index}`,
    ticker,
    shares: Math.max(1, Math.round(OPEN_BUDGET / buyPrice)),
    buyPrice,
    buyFee: FEE,
    buyDate: addDays(today, CLOSED_TRADES - index),
    sellPrice: null,
    sellFee: 0,
    sellDate: null,
  }
}

/** Prices below 10 € keep four decimals, others two, as brokers quote them. */
function roundPrice(price: number): number {
  const decimals = price < 10 ? 4 : 2

  return Number(price.toFixed(decimals))
}
