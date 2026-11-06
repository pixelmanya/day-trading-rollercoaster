/** Experiment settings. Amounts in euros. */
export interface Settings {
  /** Start budget in €. */
  readonly start: number
  /** Tax rate in %, e.g. 26.375 for Abgeltungsteuer plus Soli. */
  readonly taxRate: number
  /** Tax-free allowance left per calendar year, in €. */
  readonly allowance: number
}

/** The settings that tax calculations need. */
export type TaxSettings = Pick<Settings, 'allowance' | 'taxRate'>

/** One buy, optionally with its sell. Prices are € per share, fees € per order. */
export interface Trade {
  readonly tradeId: string
  readonly ticker: string
  readonly shares: number
  readonly buyPrice: number
  readonly buyFee: number
  /** ISO date, YYYY-MM-DD. */
  readonly buyDate: string
  /** Sell price per share; null while the position is open. */
  readonly sellPrice: number | null
  /** Sell fee in €; 0 while the position is open. */
  readonly sellFee: number
  /** ISO date, YYYY-MM-DD; null while the position is open. */
  readonly sellDate: string | null
}

export interface OpenTrade extends Trade {
  readonly sellPrice: null
}

export interface ClosedTrade extends Trade {
  readonly sellPrice: number
}

/** What a position cost to buy: shares, price per share and the buy fee. */
export type Position = Pick<Trade, 'shares' | 'buyPrice' | 'buyFee'>

/** The sell side of a trade. */
export interface Sale {
  readonly sellPrice: number
  readonly sellFee: number
  readonly sellDate: string
}

export interface AppState {
  readonly settings: Settings
  readonly trades: readonly Trade[]
}

/** A closed trade with its results. All amounts in €. */
export interface ClosedResult {
  readonly trade: ClosedTrade
  /** Buy amount plus buy fee. */
  readonly cost: number
  /** shares × (sell price − buy price), before fees. */
  readonly gross: number
  /** Buy fee plus sell fee. */
  readonly fees: number
  /** gross − fees. */
  readonly pretax: number
  /** Tax this trade adds to its year; negative when a loss refunds earlier tax. */
  readonly tax: number
  /** pretax − tax. */
  readonly net: number
  /** net ÷ cost. */
  readonly returnRatio: number
}

/** An open trade with the money tied up in it (buy amount plus buy fee), in €. */
export interface OpenPosition {
  readonly trade: OpenTrade
  readonly cost: number
}

/** Everything the log shows, derived from the trades and settings. Amounts in €. */
export interface Summary {
  /** Closed trades in tax order: by sell date, entry order within a day. */
  readonly closedResults: readonly ClosedResult[]
  readonly openPositions: readonly OpenPosition[]
  /** Start budget plus the net result of all closed trades. */
  readonly balance: number
  /** balance − start budget. */
  readonly change: number
  /** change ÷ start budget. */
  readonly changeRatio: number
  /** Sum of net results of closed trades. */
  readonly sumNet: number
  /** Money tied up in open positions. */
  readonly openCost: number
  /** balance − openCost. */
  readonly cash: number
  /** Closed trades with a positive net result. */
  readonly wins: number
  /** wins ÷ closed trades; null before the first closed trade. */
  readonly winRate: number | null
  /** sumNet ÷ closed trades; null before the first closed trade. */
  readonly averageNet: number | null
  /** Fees of closed trades plus buy fees of open ones. */
  readonly fees: number
  /** Tax of closed trades so far. */
  readonly tax: number
}

/** Whether an amount reads as a gain or a loss. */
export type Tone = 'gain' | 'loss'
